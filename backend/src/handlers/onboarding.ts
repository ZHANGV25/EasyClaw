import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

const FREE_TIER_CREDITS = 5.00;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);
        const body = JSON.parse(event.body || '{}');
        const { name, timezone, interests, assistantName } = body;

        const meta = {
            name: name || '',
            timezone: timezone || '',
            interests: interests || '',
            assistant: {
                name: assistantName || 'Jarvis',
                interests: interests || '',
            },
            onboardedAt: new Date().toISOString(),
        };

        // Check if user already exists
        const existing = await query(`SELECT id FROM users WHERE id = $1`, [userId]);

        if (existing.rowCount === 0) {
            // New user — create with free credits
            await query(
                `INSERT INTO users (id, email, credits_balance, meta) VALUES ($1, '', $2, $3)`,
                [userId, FREE_TIER_CREDITS, JSON.stringify(meta)]
            );
            await query(
                `INSERT INTO transactions (user_id, amount, type, description)
                 VALUES ($1, $2, 'FREE_TIER', 'Welcome bonus')`,
                [userId, FREE_TIER_CREDITS]
            );
        } else {
            // Existing user — merge meta
            await query(
                `UPDATE users SET meta = meta || $1, updated_at = NOW() WHERE id = $2`,
                [JSON.stringify(meta), userId]
            );
        }

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: true }),
        };
    } catch (err: any) {
        if (err instanceof AuthError) return unauthorizedResponse(err.message);
        console.error(err);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: err.message }),
        };
    }
};
