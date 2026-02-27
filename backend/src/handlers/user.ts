import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

const FREE_TIER_CREDITS = 5.00;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);
        const method = event.httpMethod;

        // PATCH /api/user — update user meta fields
        if (method === 'PATCH') {
            const body = JSON.parse(event.body || '{}');
            const patch: Record<string, any> = {};
            if (body.name !== undefined) patch.name = body.name;
            if (body.timezone !== undefined) patch.timezone = body.timezone;
            if (body.assistant !== undefined) patch.assistant = body.assistant;

            if (Object.keys(patch).length > 0) {
                await query(
                    `UPDATE users SET meta = meta || $1, updated_at = NOW() WHERE id = $2`,
                    [JSON.stringify(patch), userId]
                );
            }

            const updated = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
            const user = updated.rows[0];
            const meta = user?.meta || {};

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    id: user.id,
                    email: user.email,
                    creditsBalance: parseFloat(user.credits_balance),
                    meta: user.meta,
                    name: meta.name || '',
                    timezone: meta.timezone || '',
                    assistant: meta.assistant || {},
                    stripeCustomerId: user.stripe_customer_id,
                }),
            };
        }

        // GET /api/user
        const userRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);

        if (userRes.rowCount === 0) {
            // Auto-create user row on first API hit (Clerk has already authenticated them).
            // Grant free tier credits.
            await query(
                `INSERT INTO users (id, email, credits_balance) VALUES ($1, $2, $3)`,
                [userId, '', FREE_TIER_CREDITS]
            );

            await query(
                `INSERT INTO transactions (user_id, amount, type, description)
                 VALUES ($1, $2, 'FREE_TIER', 'Welcome bonus')`,
                [userId, FREE_TIER_CREDITS]
            );

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    id: userId,
                    email: '',
                    creditsBalance: FREE_TIER_CREDITS,
                    meta: {},
                    name: '',
                    timezone: '',
                    assistant: {},
                    isNew: true,
                }),
            };
        }

        const user = userRes.rows[0];
        const meta = user.meta || {};

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                id: user.id,
                email: user.email,
                creditsBalance: parseFloat(user.credits_balance),
                meta: user.meta,
                name: meta.name || '',
                timezone: meta.timezone || '',
                assistant: meta.assistant || {},
                stripeCustomerId: user.stripe_customer_id,
            }),
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
