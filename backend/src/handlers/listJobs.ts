import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client } from 'pg';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const userId = await requireAuth(event);

    // Get limit from query parameters
    const limit = parseInt(event.queryStringParameters?.limit || '20');

    // Connect to database
    await client.connect();

    // Get user's jobs
    const result = await client.query(
      `SELECT id, status, type, created_at, updated_at
       FROM jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        jobs: result.rows,
        count: result.rows.length,
      }),
    };
  } catch (error: any) {
    if (error instanceof AuthError) return unauthorizedResponse(error.message);
    console.error('[ListJobs] Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to list jobs',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
