import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { jobId, status, resultPayload } = body;

        if (!jobId || !status) {
            return { statusCode: 400, body: JSON.stringify({ error: "jobId and status required" }) };
        }

        const updateRes = await query(
            `UPDATE jobs SET status = $1, result_payload = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
            [status, resultPayload || null, jobId]
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, job: updateRes.rows[0] }),
        };
    } catch (err: any) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
