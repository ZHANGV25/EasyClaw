import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = "11111111-1111-1111-1111-111111111111"; // TODO: Auth

        const userRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);

        // If user doesn't exist, return mock profile for now (or 404)
        if (userRes.rowCount === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    id: userId,
                    name: "Guest User",
                    creditsBalance: 0,
                    isMock: true
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(userRes.rows[0]),
        };
    } catch (err: any) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
