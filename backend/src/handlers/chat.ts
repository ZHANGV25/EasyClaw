import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';
import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const MODEL_ID = "us.anthropic.claude-opus-4-6-v1";

// ─── Tool Definitions ──────────────────────────

// @ts-ignore - LangChain tool type inference can cause deep recursion
const createJobTool = tool(
    async ({ task_description }: { task_description: string }) => {
        return `Task "${task_description}" created.`;
    },
    {
        name: "create_job",
        description: "Start a background CHAT job for a complex conversational task.",
        schema: z.object({
            task_description: z.string().describe("A summary of what needs to be done."),
        }),
    }
);

// @ts-ignore
const computerUseTool = tool(
    async ({ instruction, url }: { instruction: string; url?: string }) => {
        return `Computer use task started: "${instruction}"`;
    },
    {
        name: "computer_use",
        description: "Start a COMPUTER_USE job. OpenClaw takes control of a virtual browser to execute a multi-step task — e.g. fill out forms, navigate websites, scrape data, or perform actions on behalf of the user.",
        schema: z.object({
            instruction: z.string().describe("Detailed instruction of what the agent should do on the computer."),
            url: z.string().optional().describe("Starting URL to navigate to, if applicable."),
        }),
    }
);

// @ts-ignore
const researchTool = tool(
    async ({ query: q }: { query: string }) => {
        return `Research started for: "${q}"`;
    },
    {
        name: "search_web",
        description: "Start a RESEARCH job. OpenClaw browses the web, searches for information, and compiles results.",
        schema: z.object({
            query: z.string().describe("The search query or research topic."),
        }),
    }
);

// @ts-ignore - LangChain tool type inference can cause deep recursion
const listJobsTool = tool(
    async ({ status }: { status?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" }) => {
        return "Fetching jobs...";
    },
    {
        name: "list_jobs",
        description: "List recent background jobs and their status.",
        schema: z.object({
            status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]).optional().describe("Filter by job status. If omitted, returns all recent jobs."),
        }),
    }
);

// ─── Model ──────────────────────────────────────

const model = new ChatBedrockConverse({
    model: MODEL_ID,
    region: "us-east-1",
    maxTokens: 1024,
});

const modelWithTools = model.bindTools([createJobTool, computerUseTool, researchTool, listJobsTool]);

// ─── Handler ────────────────────────────────────

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log("Handler started", JSON.stringify(event));
    try {
        const userId = await requireAuth(event);
        console.log("Parsing body...");
        const body = JSON.parse(event.body || '{}');
        const { message, conversationId } = body;

        if (!message) {
            return { statusCode: 400, body: JSON.stringify({ error: "Message required" }) };
        }

        // ── Credit check ────────────────────────
        const balanceRes = await query(
            `SELECT credits_balance FROM users WHERE id = $1`,
            [userId]
        );
        if (balanceRes.rows.length > 0) {
            const balance = parseFloat(balanceRes.rows[0].credits_balance);
            if (balance <= 0) {
                return {
                    statusCode: 402,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ error: "NO_CREDITS", message: "Insufficient credits. Please add funds." }),
                };
            }
        }

        // ── Create or get conversation ──────────
        let finalConversationId = conversationId;
        if (!finalConversationId) {
            const convRes = await query(
                `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id`,
                [userId, message.substring(0, 30)]
            );
            finalConversationId = convRes.rows[0].id;
        }

        // ── Store user message ──────────────────
        console.log("Storing user message...");
        await query(
            `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
            [finalConversationId, message]
        );

        // ── Invoke model ────────────────────────
        const systemPrompt = `You are EasyClaw, an AI assistant.
Your goal is to help the user.
If the user asks for a complex task that requires controlling a computer (e.g., "fill out this form", "scrape a website", "book a flight"), use the "computer_use" tool.
If the user wants web research or information gathering, use the "search_web" tool.
If the user asks for a complex conversational task that should run in the background, use the "create_job" tool.
If the user asks about the status of their tasks or jobs, use the "list_jobs" tool.
If the user asks a simple question, answer directly. Be concise.`;

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(message)
        ];

        console.log("Invoking model...");
        const response = await modelWithTools.invoke(messages);
        console.log("Model response received:", JSON.stringify(response));

        // ── Handle tool calls ───────────────────
        if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0];

            if (toolCall.name === 'create_job') {
                const input = toolCall.args;
                const jobRes = await query(
                    `INSERT INTO jobs (user_id, conversation_id, type, input_payload, status)
                     VALUES ($1, $2, 'CHAT', $3, 'PENDING') RETURNING id`,
                    [userId, finalConversationId, JSON.stringify({ originalRequest: message, taskDescription: input.task_description })]
                );
                const jobId = jobRes.rows[0].id;
                const reply = `I've started a task for you: "${input.task_description}". (Job ID: ${jobId})`;
                await storeReplyAndDeduct(userId, finalConversationId, reply, message);
                return jsonOk({ conversationId: finalConversationId, jobId, message: reply, status: "QUEUED" });
            }

            if (toolCall.name === 'computer_use') {
                const input = toolCall.args;
                const jobRes = await query(
                    `INSERT INTO jobs (user_id, conversation_id, type, input_payload, status)
                     VALUES ($1, $2, 'COMPUTER_USE', $3, 'PENDING') RETURNING id`,
                    [userId, finalConversationId, JSON.stringify({ instruction: input.instruction, url: input.url, originalRequest: message })]
                );
                const jobId = jobRes.rows[0].id;
                const reply = `I've started a computer task: "${input.instruction}". I'll take control and complete this for you. (Job ID: ${jobId})`;
                await storeReplyAndDeduct(userId, finalConversationId, reply, message);
                return jsonOk({ conversationId: finalConversationId, jobId, message: reply, status: "QUEUED" });
            }

            if (toolCall.name === 'search_web') {
                const input = toolCall.args;
                const jobRes = await query(
                    `INSERT INTO jobs (user_id, conversation_id, type, input_payload, status)
                     VALUES ($1, $2, 'RESEARCH', $3, 'PENDING') RETURNING id`,
                    [userId, finalConversationId, JSON.stringify({ query: input.query, originalRequest: message })]
                );
                const jobId = jobRes.rows[0].id;
                const reply = `I'm researching "${input.query}" for you. I'll browse the web and compile the results. (Job ID: ${jobId})`;
                await storeReplyAndDeduct(userId, finalConversationId, reply, message);
                return jsonOk({ conversationId: finalConversationId, jobId, message: reply, status: "QUEUED" });
            }

            if (toolCall.name === 'list_jobs') {
                const input = toolCall.args;
                let text = `SELECT id, type, status, created_at, input_payload FROM jobs WHERE user_id = $1`;
                const params: any[] = [userId];

                if (input.status) {
                    text += ` AND status = $2`;
                    params.push(input.status);
                }

                text += ` ORDER BY created_at DESC LIMIT 5`;

                const jobsRes = await query(text, params);
                const jobs = jobsRes.rows;

                let reply = "";
                if (jobs.length === 0) {
                    reply = "You have no active jobs.";
                } else {
                    reply = "Here are your recent jobs:\n" + jobs.map((j: any) =>
                        `- [${j.status}] ${j.type} (ID: ${j.id}): ${JSON.stringify(j.input_payload).substring(0, 50)}...`
                    ).join("\n");
                }

                await storeReplyAndDeduct(userId, finalConversationId, reply, message);
                return jsonOk({ conversationId: finalConversationId, message: reply, status: "COMPLETED" });
            }
        }

        // ── Default text response ───────────────
        const reply = typeof response.content === 'string' ? response.content :
            (Array.isArray(response.content) ? (response.content[0] as any).text : "I'm not sure.");

        await storeReplyAndDeduct(userId, finalConversationId, reply, message);

        return jsonOk({ conversationId: finalConversationId, message: reply, status: "COMPLETED" });

    } catch (err: any) {
        if (err instanceof AuthError) return unauthorizedResponse(err.message);
        console.error("Handler Error:", err);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                error: (err as Error).name || "UnknownError",
                message: (err as Error).message || "An unexpected error occurred",
                requestId: event.requestContext?.requestId || "unknown"
            })
        };
    }
};

// ─── Helpers ────────────────────────────────────

function jsonOk(data: Record<string, any>) {
    return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(data),
    };
}

async function storeReplyAndDeduct(userId: string, conversationId: string, reply: string, userMessage: string) {
    // Store assistant reply
    await query(
        `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
        [conversationId, reply]
    );

    // Estimate cost and deduct credits
    const tokensIn = Math.ceil(userMessage.length / 4);
    const tokensOut = Math.ceil(reply.length / 4);
    const cost = (tokensIn * 0.000015) + (tokensOut * 0.000075); // Opus pricing estimate

    await query(
        `INSERT INTO transactions (user_id, amount, type, description, meta)
         VALUES ($1, $2, 'USAGE', $3, $4)`,
        [userId, -cost, `Chat message`, JSON.stringify({ tokens_in: tokensIn, tokens_out: tokensOut, model: MODEL_ID })]
    );

    await query(
        `UPDATE users SET credits_balance = credits_balance - $1, updated_at = NOW() WHERE id = $2`,
        [cost, userId]
    );
}
