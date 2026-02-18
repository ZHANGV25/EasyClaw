import { Database } from './lib/db.js';
import { S3Manager } from './lib/s3.js';
import { JobExecutor } from './lib/executor.js';

// Environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'easyclaw-state';
const WORKER_ID = process.env.ECS_TASK_ARN || `worker-${Date.now()}`;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000');

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Graceful shutdown
let shutdownRequested = false;

process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received, gracefully shutting down...');
  shutdownRequested = true;
});

process.on('SIGINT', () => {
  console.log('[Worker] SIGINT received, gracefully shutting down...');
  shutdownRequested = true;
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`[Worker] Starting worker: ${WORKER_ID}`);
  console.log(`[Worker] Region: ${AWS_REGION}, Bucket: ${S3_BUCKET}`);
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS}ms`);

  // Initialize clients
  const db = new Database(DATABASE_URL!);
  const s3 = new S3Manager(AWS_REGION, S3_BUCKET);
  const executor = new JobExecutor(db, s3);

  console.log('[Worker] Initialized, entering polling loop...');

  // Main polling loop
  while (!shutdownRequested) {
    try {
      // Poll for job
      const job = await db.pollForJob(WORKER_ID);

      if (job) {
        // Execute job
        await executor.execute(job);
      } else {
        // No jobs available, sleep
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error('[Worker] Error in polling loop:', error);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.log('[Worker] Shutdown complete, closing connections...');
  await db.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
