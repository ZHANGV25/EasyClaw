import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { Webhook } from 'svix';

const FREE_TIER_CREDITS = 5.00;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const secret = process.env.CLERK_WEBHOOK_SECRET;
        if (!secret) {
            console.error('CLERK_WEBHOOK_SECRET not set');
            return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'Webhook secret not configured' }) };
        }

        // Verify svix signature
        const wh = new Webhook(secret);
        const headers = event.headers;
        const payload = event.body || '';

        let evt: any;
        try {
            evt = wh.verify(payload, {
                'svix-id': headers['svix-id'] || '',
                'svix-timestamp': headers['svix-timestamp'] || '',
                'svix-signature': headers['svix-signature'] || '',
            });
        } catch (err) {
            console.error('Webhook signature verification failed:', err);
            return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Invalid signature' }) };
        }

        // Handle user.created event
        if (evt.type === 'user.created') {
            const data = evt.data;
            const clerkUserId = data.id;
            const email = data.email_addresses?.[0]?.email_address || '';
            const firstName = data.first_name || '';

            // Upsert user — idempotent
            await query(
                `INSERT INTO users (id, email, credits_balance, meta)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (id) DO NOTHING`,
                [clerkUserId, email, FREE_TIER_CREDITS, JSON.stringify({ name: firstName })]
            );

            // Grant free credits idempotently — only if no FREE_TIER transaction exists
            const existingTx = await query(
                `SELECT id FROM transactions WHERE user_id = $1 AND type = 'FREE_TIER' LIMIT 1`,
                [clerkUserId]
            );
            if (existingTx.rowCount === 0) {
                await query(
                    `INSERT INTO transactions (user_id, amount, type, description)
                     VALUES ($1, $2, 'FREE_TIER', 'Welcome bonus')`,
                    [clerkUserId, FREE_TIER_CREDITS]
                );
            }
        }

        return { statusCode: 200, headers: cors(), body: JSON.stringify({ received: true }) };
    } catch (err: any) {
        console.error('Clerk webhook error:', err);
        return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) };
    }
};

function cors() { return { "Access-Control-Allow-Origin": "*" }; }
