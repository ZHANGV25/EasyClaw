import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);

        // GET /api/browser/status
        const res = await query(
            `SELECT id, input_payload, updated_at FROM jobs
             WHERE user_id = $1 AND type = 'COMPUTER_USE' AND status = 'RUNNING'
             ORDER BY updated_at DESC LIMIT 1`,
            [userId]
        );

        if (res.rows.length === 0) {
            return jsonOk({ active: false });
        }

        const job = res.rows[0];
        const input = job.input_payload || {};

        return jsonOk({
            active: true,
            currentUrl: input.url || null,
            lastScreenshotAt: job.updated_at,
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
