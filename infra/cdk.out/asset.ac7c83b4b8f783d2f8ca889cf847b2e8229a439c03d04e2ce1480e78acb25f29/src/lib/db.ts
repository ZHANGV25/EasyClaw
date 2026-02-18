import pg from 'pg';
import type { Job, User, Conversation, Message, StateSnapshot } from '../types.js';

const { Pool } = pg;

export class Database {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async pollForJob(workerId: string): Promise<Job | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Atomic claim with FOR UPDATE SKIP LOCKED
      const result = await client.query<Job>(`
        SELECT *
        FROM jobs
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const job = result.rows[0];

      // Claim the job
      await client.query(`
        UPDATE jobs
        SET status = 'RUNNING',
            worker_id = $1,
            locked_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `, [workerId, job.id]);

      await client.query('COMMIT');

      console.log(`[Worker ${workerId}] Claimed job ${job.id} (type: ${job.type})`);
      return job;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUser(userId: string): Promise<User | null> {
    const result = await this.pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const result = await this.pool.query<Conversation>(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );
    return result.rows[0] || null;
  }

  async getMessages(conversationId: string, limit: number = 20): Promise<Message[]> {
    const result = await this.pool.query<Message>(
      `SELECT * FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows.reverse(); // Return in chronological order
  }

  async getLatestSnapshot(jobId: string): Promise<StateSnapshot | null> {
    const result = await this.pool.query<StateSnapshot>(
      `SELECT * FROM state_snapshots
       WHERE job_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [jobId]
    );
    return result.rows[0] || null;
  }

  async completeJob(jobId: string, resultPayload: Record<string, any>): Promise<void> {
    await this.pool.query(
      `UPDATE jobs
       SET status = 'COMPLETED',
           result_payload = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(resultPayload), jobId]
    );
    console.log(`[Job ${jobId}] Marked as COMPLETED`);
  }

  async failJob(jobId: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE jobs
       SET status = 'FAILED',
           result_payload = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ error }), jobId]
    );
    console.log(`[Job ${jobId}] Marked as FAILED: ${error}`);
  }

  async createSnapshot(jobId: string, s3Key: string, version: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO state_snapshots (job_id, s3_key, version)
       VALUES ($1, $2, $3)`,
      [jobId, s3Key, version]
    );
  }

  async logUsage(userId: string, jobId: string, tokensIn: number, tokensOut: number, cost: number, model: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO transactions (user_id, amount, type, description, meta)
       VALUES ($1, $2, 'USAGE', $3, $4)`,
      [
        userId,
        -cost, // Negative for usage
        `Job ${jobId}`,
        JSON.stringify({ job_id: jobId, tokens_in: tokensIn, tokens_out: tokensOut, model })
      ]
    );
  }

  async createMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, $2, $3)`,
      [conversationId, role, content]
    );
    console.log(`[Conversation ${conversationId}] Created ${role} message`);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
