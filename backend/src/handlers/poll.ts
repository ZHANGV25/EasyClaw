import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        // 1. Transaction to claim job
        const claimRes = await query(`
      UPDATE jobs
      SET status = 'RUNNING', locked_at = NOW(), worker_id = $1
      WHERE id = (
        SELECT id
        FROM jobs
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *;
    `, ["worker-" + Date.now()]); // Mock worker ID

        if (claimRes.rowCount === 0) {
            return { statusCode: 200, body: JSON.stringify({ job: null }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ job: claimRes.rows[0] }),
        };
    } catch (err: any) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
