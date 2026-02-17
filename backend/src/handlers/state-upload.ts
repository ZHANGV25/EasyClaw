import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});
const BUCKET_NAME = process.env.STATE_BUCKET_NAME;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { jobId, contentLength } = body;

        if (!jobId) {
            return { statusCode: 400, body: JSON.stringify({ error: "jobId required" }) };
        }

        const key = `snapshots/${jobId}.zip`;

        // Generate Pre-signed URL
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: 'application/zip',
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes

        return {
            statusCode: 200,
            body: JSON.stringify({
                uploadUrl,
                key
            }),
        };
    } catch (err: any) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
