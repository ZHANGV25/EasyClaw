import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = "user-123"; // TODO: Auth

        // 1. Get total cost from transactions (USAGE type)
        const usageRes = await query(
            `SELECT SUM(amount) as total_cost 
             FROM transactions 
             WHERE user_id = $1 AND type = 'USAGE' AND created_at > NOW() - INTERVAL '7 days'`,
            [userId]
        );
        const totalCost = Math.abs(parseFloat(usageRes.rows[0].total_cost || '0'));

        // 2. Get daily usage for the chart (last 7 days)
        const dailyRes = await query(
            `SELECT 
                DATE(created_at) as date,
                SUM(amount) as cost_usd,
                COUNT(*) as messages
             FROM transactions
             WHERE user_id = $1 AND type = 'USAGE' AND created_at > NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at)
             ORDER BY DATE(created_at) ASC`,
            [userId]
        );

        const daily = dailyRes.rows.map((row: any) => ({
            date: row.date.toISOString(),
            costUsd: Math.abs(parseFloat(row.cost_usd || '0')),
            messages: parseInt(row.messages || '0')
        }));

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET"
            },
            body: JSON.stringify({
                totalCost,
                daily
            }),
        };
    } catch (err: any) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
