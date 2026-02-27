import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);
        const method = event.httpMethod;
        const id = event.pathParameters?.id;

        // GET /api/reminders
        if (method === 'GET') {
            const upcomingRes = await query(
                `SELECT * FROM reminders WHERE user_id = $1 AND status IN ('active','paused') ORDER BY next_fire_at ASC`,
                [userId]
            );
            const pastRes = await query(
                `SELECT * FROM reminders WHERE user_id = $1 AND status IN ('completed','expired') ORDER BY updated_at DESC LIMIT 50`,
                [userId]
            );
            return jsonOk({
                upcoming: upcomingRes.rows.map(toReminderShape),
                past: pastRes.rows.map(toReminderShape),
            });
        }

        // PATCH /api/reminders/{id}
        if (method === 'PATCH' && id) {
            const body = JSON.parse(event.body || '{}');
            const sets: string[] = [];
            const params: any[] = [];
            let idx = 1;

            for (const field of ['status', 'text', 'schedule_kind', 'next_fire_at', 'human_readable', 'recurrence']) {
                const camelKey = field === 'schedule_kind' ? 'scheduleKind'
                    : field === 'next_fire_at' ? 'nextFireAt'
                    : field === 'human_readable' ? 'humanReadable'
                    : field;
                const value = body[camelKey] ?? body[field];
                if (value !== undefined) {
                    sets.push(`${field} = $${idx}`);
                    params.push(value);
                    idx++;
                }
            }

            if (sets.length === 0) {
                return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'No fields to update' }) };
            }

            sets.push(`updated_at = NOW()`);
            params.push(id, userId);

            await query(
                `UPDATE reminders SET ${sets.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`,
                params
            );
            return jsonOk({ success: true });
        }

        // DELETE /api/reminders/{id}
        if (method === 'DELETE' && id) {
            await query(`DELETE FROM reminders WHERE id = $1 AND user_id = $2`, [id, userId]);
            return jsonOk({ success: true });
        }

        return { statusCode: 405, headers: cors(), body: JSON.stringify({ error: 'Method not allowed' }) };
    } catch (err: any) {
        if (err instanceof AuthError) return unauthorizedResponse(err.message);
        console.error(err);
        return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) };
    }
};

function toReminderShape(row: any) {
    return {
        id: row.id,
        text: row.text,
        schedule: {
            kind: row.schedule_kind,
            nextFireAt: row.next_fire_at,
            humanReadable: row.human_readable,
            recurrence: row.recurrence,
        },
        status: row.status,
        lastFiredAt: row.last_fired_at,
        conversationId: row.conversation_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function cors() { return { "Access-Control-Allow-Origin": "*" }; }
function jsonOk(data: any) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify(data) };
}
