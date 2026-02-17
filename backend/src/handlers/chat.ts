import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const MODEL_ID = "anthropic.claude-opus-4-6-v1";

// 1. Define Tools using LangChain
const createJobTool = tool(
    async ({ task_description }) => {
        // This function is just a placeholder for the tool definition logic
        // The actual execution happens in the handler logic based on the tool call
        return `Task "${task_description}" created.`;
    },
    {
        name: "create_job",
        description: "Start a background job for a complex task.",
        schema: z.object({
            task_description: z.string().describe("A summary of what needs to be done."),
        }),
    }
);

const listJobsTool = tool(
    async ({ status }) => {
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

// 2. Initialize Model
const model = new ChatBedrockConverse({
    model: MODEL_ID,
    region: "us-east-1",
    maxTokens: 1024,
});

// Bind tools to the model
const modelWithTools = model.bindTools([createJobTool, listJobsTool]);

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { message, conversationId } = body;
        const userId = "user-123"; // TODO: Auth

        if (!message) {
            return { statusCode: 400, body: JSON.stringify({ error: "Message required" }) };
        }

        // 1. Create/Get Conversation
        let finalConversationId = conversationId;
        if (!finalConversationId) {
            const convRes = await query(
                `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id`,
                [userId, message.substring(0, 30)]
            );
            finalConversationId = convRes.rows[0].id;
        }

        // 2. Store User Message
        await query(
            `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
            [finalConversationId, message]
        );

        // 3. Invoke Model with LangChain
        const systemPrompt = `You are EasyClaw, an AI assistant.
Your goal is to help the user.
If the user asks for a complex task (e.g., "scan my emails", "scrape a website", "analyze this file"), 
you MUST use the "create_job" tool.
If the user asks about the status of their tasks or jobs, use the "list_jobs" tool.
If the user asks a simple question (e.g., "hello", "what can you do?"), answer directly in a helpful way.
Do not be verbose.`;

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(message)
        ];

        const response = await modelWithTools.invoke(messages);

        // 4. Handle Response (Tool Calls vs Text)
        if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0]; // Handle first tool call for now

            if (toolCall.name === 'create_job') {
                const input = toolCall.args;

                // Execute Logic (Create Job in DB)
                const jobRes = await query(
                    `INSERT INTO jobs (user_id, conversation_id, type, input_payload, status) 
                     VALUES ($1, $2, 'CHAT', $3, 'PENDING') RETURNING id`,
                    [userId, finalConversationId, JSON.stringify({ originalRequest: message, taskDescription: input.task_description })]
                );

                const jobId = jobRes.rows[0].id;
                const reply = `I've started a task for you: "${input.task_description}". (Job ID: ${jobId})`;

                // Store Assistant Reply
                await query(
                    `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
                    [finalConversationId, reply]
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        conversationId: finalConversationId,
                        jobId,
                        message: reply,
                        status: "QUEUED"
                    }),
                };
            } else if (toolCall.name === 'list_jobs') {
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

                // Store Assistant Reply
                await query(
                    `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
                    [finalConversationId, reply]
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        conversationId: finalConversationId,
                        message: reply,
                        status: "COMPLETED" // No background job started for listing
                    }),
                };
            }
        }

        // Default Text Response
        const reply = typeof response.content === 'string' ? response.content :
            (Array.isArray(response.content) ? (response.content[0] as any).text : "I'm not sure.");

        await query(
            `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
            [finalConversationId, reply]
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                conversationId: finalConversationId,
                message: reply,
                status: "COMPLETED"
            }),
        };

    } catch (err: any) {
        console.error("Handler Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
