import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client } from 'pg';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get user ID from auth
    const userId = event.headers['x-user-id'] || event.requestContext.authorizer?.userId || 'test-user-id';

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
