import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client } from 'pg';

interface CreateJobRequest {
  type: string;
  payload: Record<string, any>;
  conversationId?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const { type, payload, conversationId } = JSON.parse(event.body) as CreateJobRequest;

    if (!type || !payload) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing required fields: type, payload' }),
      };
    }

    // Get user ID from Clerk auth (via authorizer or JWT)
    // For now, extract from headers or path parameters
    const userId = event.headers['x-user-id'] || event.requestContext.authorizer?.userId || 'test-user-id';

    // Connect to database
    await client.connect();

    // Create job
    const result = await client.query<{ id: string }>(
      `INSERT INTO jobs (user_id, conversation_id, type, input_payload, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id`,
      [userId, conversationId || null, type, JSON.stringify(payload)]
    );

    const jobId = result.rows[0].id;

    console.log(`[CreateJob] Created job ${jobId} (type: ${type}) for user ${userId}`);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        jobId,
        status: 'PENDING',
        message: 'Job created successfully',
      }),
    };
  } catch (error: any) {
    console.error('[CreateJob] Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to create job',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
