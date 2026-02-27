import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { Bot } from 'grammy';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Lazy-init bot instance (reused across warm invocations)
let bot: Bot | null = null;
function getBot(): Bot {
    if (!bot) {
        bot = new Bot(BOT_TOKEN);
        setupHandlers(bot);
    }
    return bot;
}

function setupHandlers(b: Bot) {
    // /start command — handle account linking
    b.command('start', async (ctx) => {
        const token = ctx.match; // the part after /start
        if (!token) {
            await ctx.reply(
                "Welcome to EasyClaw! 🤖\n\nTo get started, link your account from the EasyClaw web app:\n→ Settings → Telegram → Generate Link"
            );
            return;
        }

        // Look up user by linking token
        const userRes = await query(
            `SELECT id, meta FROM users WHERE meta->>'telegram_link_token' = $1`,
            [token]
        );

        if (userRes.rowCount === 0) {
            await ctx.reply("This link has expired or is invalid. Please generate a new one from the EasyClaw web app.");
            return;
        }

        const user = userRes.rows[0];
        const meta = user.meta || {};

        // Check expiry
        const expires = meta.telegram_link_expires;
        if (expires && new Date(expires) < new Date()) {
            await ctx.reply("This link has expired. Please generate a new one from the EasyClaw web app.");
            return;
        }

        // Link the account
        const telegramId = ctx.from?.id?.toString();
        const telegramUsername = ctx.from?.username || '';

        await query(
            `UPDATE users SET meta = (meta - 'telegram_link_token' - 'telegram_link_expires') || $1, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify({
                telegram_id: telegramId,
                telegram_username: telegramUsername,
            }), user.id]
        );

        const name = meta.name || 'there';
        await ctx.reply(
            `Account linked successfully! 🎉\n\nHey ${name}, you can now chat with your assistant right here. Just send a message!`
        );
    });

    // Handle all text messages
    b.on('message:text', async (ctx) => {
        const telegramId = ctx.from.id.toString();
        const message = ctx.message.text;

        // Look up user by telegram_id
        const userRes = await query(
            `SELECT id, credits_balance, meta FROM users WHERE meta->>'telegram_id' = $1`,
            [telegramId]
        );

        if (userRes.rowCount === 0) {
            await ctx.reply(
                "Your Telegram isn't linked to an EasyClaw account.\n\nGo to the EasyClaw web app → Settings → Telegram → Generate Link"
            );
            return;
        }

        const user = userRes.rows[0];
        const balance = parseFloat(user.credits_balance);

        if (balance <= 0) {
            await ctx.reply("You're out of credits. Add more at the EasyClaw web app to continue chatting.");
            return;
        }

        // Send typing indicator
        await ctx.replyWithChatAction('typing');

        try {
            // Create or get a Telegram conversation
            let convRes = await query(
                `SELECT id FROM conversations WHERE user_id = $1 AND title = 'Telegram' ORDER BY created_at DESC LIMIT 1`,
                [user.id]
            );

            let conversationId: string;
            if (convRes.rowCount === 0) {
                const newConv = await query(
                    `INSERT INTO conversations (user_id, title) VALUES ($1, 'Telegram') RETURNING id`,
                    [user.id]
                );
                conversationId = newConv.rows[0].id;
            } else {
                conversationId = convRes.rows[0].id;
            }

            // Store user message
            await query(
                `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
                [conversationId, message]
            );

            // Invoke Bedrock via LangChain (import dynamically to keep cold start fast for /start)
            const { ChatBedrockConverse } = await import('@langchain/aws');
            const { HumanMessage, SystemMessage } = await import('@langchain/core/messages');

            const model = new ChatBedrockConverse({
                model: 'us.anthropic.claude-sonnet-4-6-v1',
                region: 'us-east-1',
                maxTokens: 512,
            });

            const assistantName = user.meta?.assistant?.name || 'EasyClaw';

            const response = await model.invoke([
                new SystemMessage(
                    `You are ${assistantName}, an AI assistant chatting via Telegram. ` +
                    `Be concise — Telegram messages should be short and conversational. ` +
                    `The user's name is ${user.meta?.name || 'there'}.`
                ),
                new HumanMessage(message),
            ]);

            const reply = typeof response.content === 'string'
                ? response.content
                : (Array.isArray(response.content) ? (response.content[0] as any).text : "I'm not sure how to respond.");

            // Store assistant reply
            await query(
                `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
                [conversationId, reply]
            );

            // Deduct credits
            const tokensIn = Math.ceil(message.length / 4);
            const tokensOut = Math.ceil(reply.length / 4);
            const cost = (tokensIn * 0.000003) + (tokensOut * 0.000015); // Sonnet pricing

            await query(
                `INSERT INTO transactions (user_id, amount, type, description, meta)
                 VALUES ($1, $2, 'USAGE', 'Telegram message', $3)`,
                [user.id, -cost, JSON.stringify({ tokens_in: tokensIn, tokens_out: tokensOut, model: 'claude-sonnet-4-6', channel: 'telegram' })]
            );

            await query(
                `UPDATE users SET credits_balance = credits_balance - $1, updated_at = NOW() WHERE id = $2`,
                [cost, user.id]
            );

            await ctx.reply(reply);
        } catch (err) {
            console.error('Error processing Telegram message:', err);
            await ctx.reply("Sorry, something went wrong. Please try again.");
        }
    });
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!BOT_TOKEN) {
            console.error('TELEGRAM_BOT_TOKEN not set');
            return { statusCode: 200, body: 'ok' };
        }

        const b = getBot();

        // Verify the secret token if set
        const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
        if (secretToken) {
            const header = event.headers['x-telegram-bot-api-secret-token'] ||
                           event.headers['X-Telegram-Bot-Api-Secret-Token'];
            if (header !== secretToken) {
                return { statusCode: 403, body: 'Forbidden' };
            }
        }

        const update = JSON.parse(event.body || '{}');

        // Process the update using grammY's built-in handler
        await b.handleUpdate(update);

        return { statusCode: 200, body: 'ok' };
    } catch (err: any) {
        console.error('Telegram webhook error:', err);
        // Always return 200 to Telegram to prevent retry spam
        return { statusCode: 200, body: 'ok' };
    }
};
