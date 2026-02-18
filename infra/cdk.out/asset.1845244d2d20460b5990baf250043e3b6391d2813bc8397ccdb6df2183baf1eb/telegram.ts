import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            botUrl: "https://t.me/EasyClawBot?start=VALID_TOKEN_123",
            connected: false
        })
    };
};
