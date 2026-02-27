import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';
import { randomBytes } from 'crypto';

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'EasyClawBot';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);
        const method = event.httpMethod;

        // GET /api/telegram/connect — check connection status
        if (method === 'GET') {
            const userRes = await query(`SELECT meta FROM users WHERE id = $1`, [userId]);
            const meta = userRes.rows[0]?.meta || {};
            const connected = !!meta.telegram_id;

            return jsonOk({
                connected,
                telegramId: meta.telegram_id || null,
                botUrl: connected ? `https://t.me/${BOT_USERNAME}` : null,
            });
        }

        // POST /api/telegram/connect — generate a one-time linking token
        if (method === 'POST') {
            // Check if already connected
            const userRes = await query(`SELECT meta FROM users WHERE id = $1`, [userId]);
            const meta = userRes.rows[0]?.meta || {};

            if (meta.telegram_id) {
                return jsonOk({
                    botUrl: `https://t.me/${BOT_USERNAME}`,
                    connected: true,
                });
            }

            // Generate a secure one-time token
            const token = randomBytes(16).toString('hex');

            // Store the linking token in user meta with expiry
            await query(
                `UPDATE users SET meta = meta || $1, updated_at = NOW() WHERE id = $2`,
                [JSON.stringify({
                    telegram_link_token: token,
                    telegram_link_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
                }), userId]
            );

            const botUrl = `https://t.me/${BOT_USERNAME}?start=${token}`;

            return jsonOk({ botUrl, connected: false });
        }

        // DELETE /api/telegram/connect — disconnect Telegram
        if (method === 'DELETE') {
            await query(
                `UPDATE users SET meta = meta - 'telegram_id' - 'telegram_username' - 'telegram_link_token' - 'telegram_link_expires', updated_at = NOW() WHERE id = $1`,
                [userId]
            );
            return jsonOk({ disconnected: true });
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
