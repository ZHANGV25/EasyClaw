import { verifyToken } from '@clerk/backend';
import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Extracts and verifies the Clerk JWT from the Authorization header.
 * Returns the Clerk userId string.
 * Throws an AuthError if the token is missing or invalid.
 */
export async function requireAuth(event: APIGatewayProxyEvent): Promise<string> {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        throw new AuthError(401, 'Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);

    try {
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY || '',
        });
        const userId = payload.sub;
        if (!userId) {
            throw new AuthError(401, 'Token subject (userId) is missing');
        }
        return userId;
    } catch (err: any) {
        if (err instanceof AuthError) throw err;
        console.error('Clerk token verification failed:', err?.message);
        throw new AuthError(401, 'Invalid or expired token');
    }
}

export class AuthError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * Returns a standard 401 error response for use in Lambda handlers.
 */
export function unauthorizedResponse(message = 'Unauthorized') {
    return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'UNAUTHORIZED', message }),
    };
}
