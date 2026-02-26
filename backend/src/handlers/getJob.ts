import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client } from 'pg';
import { requireAuth, unauthorizedResponse, AuthError } from '../util/auth';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const userId = await requireAuth(event);

    // Get job ID from path parameters
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing jobId parameter' }),
      };
    }

    // Connect to database
    await client.connect();

    // Get job (with user isolation)
    const result = await client.query(
      `SELECT id, status, type, input_payload, result_payload, created_at, updated_at
       FROM jobs
       WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Job not found' }),
      };
    }

    const job = result.rows[0];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(job),
    };
  } catch (error: any) {
    if (error instanceof AuthError) return unauthorizedResponse(error.message);
    console.error('[GetJob] Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to get job',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
