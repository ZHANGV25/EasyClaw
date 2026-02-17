import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = "11111111-1111-1111-1111-111111111111"; // TODO: Auth

        const txRes = await query(
            `SELECT * FROM transactions 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 20`,
            [userId]
        );

        // Map DB fields to frontend interface if needed, or just return snake_case
        // Frontend expects: id, type, amount, description, createdAt
        const transactions = txRes.rows.map((row: any) => ({
            id: row.id,
            type: row.type,
            amount: parseFloat(row.amount),
            description: row.description,
            createdAt: row.created_at
        }));

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET"
            },
            body: JSON.stringify({ transactions }),
        };
    } catch (err: any) {
        console.error("Handler Error:", err);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET"
            },
            body: JSON.stringify({
                error: (err as Error).name || "UnknownError",
                message: (err as Error).message || "An unexpected error occurred",
                requestId: event.requestContext?.requestId || "unknown"
            })
        };
    }
};
