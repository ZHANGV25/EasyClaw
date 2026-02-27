import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);
        const method = event.httpMethod;
        const id = event.pathParameters?.id;
        const path = event.path;

        // POST /api/memory/{id}/confirm
        if (method === 'POST' && id && path.endsWith('/confirm')) {
            await query(
                `UPDATE memories SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
                [id, userId]
            );
            return jsonOk({ success: true });
        }

        // POST /api/memory/{id}/reject
        if (method === 'POST' && id && path.endsWith('/reject')) {
            await query(
                `UPDATE memories SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
                [id, userId]
            );
            return jsonOk({ success: true });
        }

        // GET /api/memory
        if (method === 'GET') {
            const factsRes = await query(
                `SELECT id, category, fact, created_at, updated_at FROM memories WHERE user_id = $1 AND status = 'confirmed' ORDER BY created_at DESC`,
                [userId]
            );
            const learningsRes = await query(
                `SELECT id, category, fact, status, source_message_preview, created_at FROM memories WHERE user_id = $1 AND status IN ('pending','confirmed') ORDER BY created_at DESC LIMIT 20`,
                [userId]
            );
            return jsonOk({
                facts: factsRes.rows,
                recentLearnings: learningsRes.rows,
            });
        }

        // POST /api/memory — create a confirmed fact
        if (method === 'POST' && !id) {
            const body = JSON.parse(event.body || '{}');
            const { category, fact } = body;
            if (!fact) {
                return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'fact is required' }) };
            }
            const res = await query(
                `INSERT INTO memories (user_id, category, fact, status) VALUES ($1, $2, $3, 'confirmed') RETURNING *`,
                [userId, category || 'other', fact]
            );
            return jsonOk(res.rows[0]);
        }

        // PUT /api/memory/{id}
        if (method === 'PUT' && id) {
            const body = JSON.parse(event.body || '{}');
            const { fact } = body;
            if (!fact) {
                return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'fact is required' }) };
            }
            await query(
                `UPDATE memories SET fact = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
                [fact, id, userId]
            );
            return jsonOk({ success: true });
        }

        // DELETE /api/memory/{id}
        if (method === 'DELETE' && id) {
            await query(`DELETE FROM memories WHERE id = $1 AND user_id = $2`, [id, userId]);
            return jsonOk({ success: true });
        }

        return { statusCode: 405, headers: cors(), body: JSON.stringify({ error: 'Method not allowed' }) };
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
