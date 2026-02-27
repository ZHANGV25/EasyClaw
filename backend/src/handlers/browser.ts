import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

const s3 = new S3Client({});
const BUCKET_NAME = process.env.STATE_BUCKET_NAME;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);

        // Look for RUNNING or recently-completed COMPUTER_USE jobs (within 30s)
        const res = await query(
            `SELECT id, status, input_payload, result_payload, updated_at FROM jobs
             WHERE user_id = $1
               AND type = 'COMPUTER_USE'
               AND (status = 'RUNNING' OR (status IN ('COMPLETED', 'FAILED') AND updated_at > NOW() - INTERVAL '30 seconds'))
             ORDER BY
               CASE WHEN status = 'RUNNING' THEN 0 ELSE 1 END,
               updated_at DESC
             LIMIT 1`,
            [userId]
        );

        if (res.rows.length === 0) {
            return jsonOk({ active: false });
        }

        const job = res.rows[0];
        const input = job.input_payload || {};
        const progress = job.result_payload?._progress || {};

        // Generate presigned URL for the screenshot if we have a key
        let screenshotUrl: string | null = null;
        if (progress.screenshotKey && BUCKET_NAME) {
            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: progress.screenshotKey,
            });
            screenshotUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
        }

        return jsonOk({
            active: job.status === 'RUNNING',
            jobId: job.id,
            jobStatus: job.status,
            currentUrl: input.url || null,
            action: progress.action || null,
            screenshotUrl,
            screenshotUpdatedAt: progress.screenshotUpdatedAt || null,
        });
    } catch (err: any) {
        if (err instanceof AuthError) return unauthorizedResponse(err.message);
        console.error(err);
        return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) };
    }
};

function cors() { return { "Access-Control-Allow-Origin": "*" }; }
function jsonOk(data: any) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify(data) };
}
