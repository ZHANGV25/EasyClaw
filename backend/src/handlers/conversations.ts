import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = await requireAuth(event);
        const method = event.httpMethod;
        const pathParams = event.pathParameters;

        // GET /api/conversations/{id}/messages — fetch message history
        if (method === 'GET' && pathParams?.id) {
            const conversationId = pathParams.id;
            const limit = parseInt(event.queryStringParameters?.limit || '50');
            const before = event.queryStringParameters?.before; // cursor: message ID

            // Verify conversation belongs to user
            const convCheck = await query(
                `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
                [conversationId, userId]
            );
            if (convCheck.rowCount === 0) {
                return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Conversation not found" }) };
            }

            let messagesQuery: string;
            let params: any[];

            if (before) {
                // Cursor-based pagination: get messages older than the cursor
                messagesQuery = `
                    SELECT id, role, content, created_at
                    FROM messages
                    WHERE conversation_id = $1
                      AND created_at < (SELECT created_at FROM messages WHERE id = $2)
                    ORDER BY created_at DESC
                    LIMIT $3`;
                params = [conversationId, before, limit + 1];
            } else {
                messagesQuery = `
                    SELECT id, role, content, created_at
                    FROM messages
                    WHERE conversation_id = $1
                    ORDER BY created_at DESC
                    LIMIT $2`;
                params = [conversationId, limit + 1];
            }

            const res = await query(messagesQuery, params);
            const hasMore = res.rows.length > limit;
            const rows = hasMore ? res.rows.slice(0, limit) : res.rows;

            // Reverse to chronological order
            const messages = rows.reverse().map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.created_at,
            }));

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ messages, hasMore }),
            };
        }

        if (method === 'GET') {
            // List conversations with last message via LATERAL JOIN (single query)
            const res = await query(
                `SELECT c.id, c.title, c.updated_at, c.created_at, lm.content AS last_message
                 FROM conversations c
                 LEFT JOIN LATERAL (
                     SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
                 ) lm ON true
                 WHERE c.user_id = $1
                 ORDER BY c.updated_at DESC`,
                [userId]
            );

            const conversations = res.rows.map((conv: any) => ({
                id: conv.id,
                title: conv.title,
                lastMessage: conv.last_message || "No messages yet",
                updatedAt: conv.updated_at,
                createdAt: conv.created_at,
            }));

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ conversations }),
            };
        }

        else if (method === 'POST') {
            // Create conversation
            const body = JSON.parse(event.body || '{}');
            const title = body.title || "New Conversation";

            const res = await query(
                `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *`,
                [userId, title]
            );
            const conv = res.rows[0];

            return {
                statusCode: 201,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    id: conv.id,
                    title: conv.title,
                    lastMessage: "",
                    updatedAt: conv.updated_at,
                    createdAt: conv.created_at
                }),
            };
        }

        else if (method === 'PATCH') {
            // Rename conversation
            const id = event.queryStringParameters?.id;
            if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Missing id" }) };

            const body = JSON.parse(event.body || '{}');
            if (!body.title) return { statusCode: 400, body: JSON.stringify({ error: "Missing title" }) };

            const res = await query(
                `UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *`,
                [body.title, id, userId]
            );

            if (res.rowCount === 0) return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };

            const conv = res.rows[0];
            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    id: conv.id,
                    title: conv.title,
                    lastMessage: "", // We could fetch it, but frontend might not need it for rename
                    updatedAt: conv.updated_at,
                    createdAt: conv.created_at
                }),
            };
        }

        else if (method === 'DELETE') {
            // Delete conversation
            const id = event.queryStringParameters?.id;
            if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Missing id" }) };

            await query(
                `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: true }),
            };
        }

        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };

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
