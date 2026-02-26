import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Handles two routes:
 *   POST /api/credits/purchase  — Create a Stripe Checkout session (requires auth)
 *   POST /api/webhooks/stripe   — Stripe webhook (no auth, signature verification)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
    const path = event.path || event.resource || '';

    // ─── Stripe Webhook ─────────────────────────
    if (path.includes('/webhooks/stripe')) {
        return handleWebhook(event);
    }

    // ─── Checkout Session ───────────────────────
    return handleCheckout(event);
};

// ─── Checkout ───────────────────────────────────

async function handleCheckout(event: any) {
    try {
        const userId = await requireAuth(event);
        const body = JSON.parse(event.body || '{}');
        const amountUsd = parseFloat(body.amountUsd);

        if (!amountUsd || amountUsd < 1 || amountUsd > 500) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Invalid amount. Must be between $1 and $500.' }),
            };
        }

        // Get or create Stripe customer
        let stripeCustomerId: string | null = null;
        const userRes = await query(`SELECT stripe_customer_id, email FROM users WHERE id = $1`, [userId]);

        if (userRes.rows.length > 0 && userRes.rows[0].stripe_customer_id) {
            stripeCustomerId = userRes.rows[0].stripe_customer_id;
        } else {
            const email = userRes.rows[0]?.email || undefined;
            const customer = await stripe.customers.create({
                metadata: { easyclaw_user_id: userId },
                ...(email ? { email } : {}),
            });
            stripeCustomerId = customer.id;

            await query(
                `UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
                [stripeCustomerId, userId]
            );
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId!,
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `EasyClaw Credits – $${amountUsd.toFixed(2)}`,
                        description: `${(amountUsd * 1000).toFixed(0)} credits (~${(amountUsd * 50).toFixed(0)} messages)`,
                    },
                    unit_amount: Math.round(amountUsd * 100), // Stripe uses cents
                },
                quantity: 1,
            }],
            metadata: {
                easyclaw_user_id: userId,
                credit_amount_usd: amountUsd.toString(),
            },
            success_url: `${event.headers?.origin || event.headers?.Origin || 'https://app.easyclaw.com'}/dashboard?payment=success`,
            cancel_url: `${event.headers?.origin || event.headers?.Origin || 'https://app.easyclaw.com'}/dashboard?payment=cancelled`,
        });

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ checkoutUrl: session.url }),
        };

    } catch (err: any) {
        if (err instanceof AuthError) return unauthorizedResponse(err.message);
        console.error('[Stripe Checkout] Error:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to create checkout session', details: err.message }),
        };
    }
}

// ─── Webhook ────────────────────────────────────

async function handleWebhook(event: any) {
    const sig = event.headers?.['Stripe-Signature'] || event.headers?.['stripe-signature'];
    const rawBody = event.body || '';

    if (!sig) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing Stripe-Signature header' }) };
    }

    let stripeEvent: Stripe.Event;

    try {
        stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
    } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    console.log(`[Stripe Webhook] Received event: ${stripeEvent.type}`);

    if (stripeEvent.type === 'checkout.session.completed') {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.easyclaw_user_id;
        const creditAmountUsd = parseFloat(session.metadata?.credit_amount_usd || '0');

        if (!userId || !creditAmountUsd) {
            console.error('[Stripe Webhook] Missing metadata on session', session.id);
            return { statusCode: 200, body: JSON.stringify({ received: true, warning: 'Missing metadata' }) };
        }

        console.log(`[Stripe Webhook] Granting $${creditAmountUsd} credits to user ${userId}`);

        try {
            // Insert transaction
            await query(
                `INSERT INTO transactions (user_id, amount, type, description, meta)
                 VALUES ($1, $2, 'PURCHASE', $3, $4)`,
                [
                    userId,
                    creditAmountUsd,
                    `Purchased $${creditAmountUsd.toFixed(2)} credits`,
                    JSON.stringify({
                        stripe_session_id: session.id,
                        stripe_payment_intent: session.payment_intent,
                    }),
                ]
            );

            // Update balance
            await query(
                `UPDATE users SET credits_balance = credits_balance + $1, updated_at = NOW() WHERE id = $2`,
                [creditAmountUsd, userId]
            );

            console.log(`[Stripe Webhook] Credits granted successfully`);
        } catch (dbErr: any) {
            console.error('[Stripe Webhook] DB error:', dbErr);
            // Return 500 so Stripe retries
            return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
        }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
