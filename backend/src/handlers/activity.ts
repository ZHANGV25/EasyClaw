import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);
        const filter = event.queryStringParameters?.filter || 'all';
        const search = event.queryStringParameters?.search || '';

        let dateClause = '';
        if (filter === 'today') {
            dateClause = `AND j.created_at >= NOW() - INTERVAL '1 day'`;
        } else if (filter === 'week') {
            dateClause = `AND j.created_at >= NOW() - INTERVAL '7 days'`;
        } else if (filter === 'month') {
            dateClause = `AND j.created_at >= NOW() - INTERVAL '30 days'`;
        }

        let searchClause = '';
        const params: any[] = [userId];
        if (search) {
            params.push(`%${search}%`);
            searchClause = `AND (j.input_payload::text ILIKE $${params.length} OR j.type ILIKE $${params.length})`;
        }

        const res = await query(
            `SELECT j.id, j.type, j.status, j.input_payload, j.result_payload, j.created_at, j.updated_at
             FROM jobs j
             WHERE j.user_id = $1 ${dateClause} ${searchClause}
             ORDER BY j.created_at DESC
             LIMIT 50`,
            params
        );

        const tasks = res.rows.map((j: any) => {
            const input = j.input_payload || {};
            const result = j.result_payload || {};
            return {
                id: j.id,
                type: j.type,
                status: j.status,
                summary: input.taskDescription || input.instruction || input.query || input.originalRequest || '',
                steps: result.steps || [],
                createdAt: j.created_at,
                updatedAt: j.updated_at,
            };
        });

        return jsonOk({ tasks, hasMore: res.rows.length === 50 });
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
