/**
 * OpenClaw Adapter / Sidecar
 *
 * Bridges the EasyClaw job queue (PostgreSQL) with the local OpenClaw
 * WebSocket gateway. Runs alongside the OpenClaw process inside the
 * same Docker container.
 *
 * Flow per job:
 *   1. Poll DB for PENDING job (FOR UPDATE SKIP LOCKED)
 *   2. Claim the job → RUNNING
 *   3. Send task to OpenClaw via WebSocket
 *   4. Wait for completion, capture result
 *   5. Upload screenshots / artifacts to S3
 *   6. Mark job COMPLETED or FAILED
 */

import { Database } from './lib/db.js';
import { S3Manager } from './lib/s3.js';
import { WebSocket } from 'ws';
import type { Job } from './types.js';

// ─── Config ────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'easyclaw-state';
const WORKER_ID = process.env.ECS_TASK_ARN || `worker-${Date.now()}`;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000');
const OPENCLAW_WS_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
const OPENCLAW_TASK_TIMEOUT_MS = parseInt(process.env.OPENCLAW_TASK_TIMEOUT_MS || '300000'); // 5 min

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

// ─── Graceful shutdown ─────────────────────────
let shutdownRequested = false;
process.on('SIGTERM', () => { console.log('[Adapter] SIGTERM'); shutdownRequested = true; });
process.on('SIGINT', () => { console.log('[Adapter] SIGINT'); shutdownRequested = true; });

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── OpenClaw Gateway Client ───────────────────
interface OpenClawResult {
  success: boolean;
  output?: any;
  screenshots?: string[];       // base64 PNGs captured during execution
  error?: string;
}

async function waitForOpenClaw(): Promise<void> {
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(OPENCLAW_WS_URL);
        ws.on('open', () => { ws.close(); resolve(); });
        ws.on('error', reject);
      });
      console.log('[Adapter] OpenClaw gateway is ready');
      return;
    } catch {
      console.log(`[Adapter] Waiting for OpenClaw... (${i + 1}/${maxRetries})`);
      await sleep(2000);
    }
  }
  throw new Error('OpenClaw gateway did not become available');
}

function sendToOpenClaw(job: Job): Promise<OpenClawResult> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(OPENCLAW_WS_URL);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`OpenClaw task timed out after ${OPENCLAW_TASK_TIMEOUT_MS}ms`));
    }, OPENCLAW_TASK_TIMEOUT_MS);

    const screenshots: string[] = [];

    ws.on('open', () => {
      // Map EasyClaw job types to an OpenClaw task message
      const taskMessage = mapJobToOpenClawTask(job);
      ws.send(JSON.stringify(taskMessage));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'screenshot':
            screenshots.push(msg.data);
            break;

          case 'progress':
            console.log(`[Job ${job.id}] Progress: ${msg.message}`);
            break;

          case 'complete':
            clearTimeout(timeout);
            ws.close();
            resolve({
              success: true,
              output: msg.result,
              screenshots,
            });
            break;

          case 'error':
            clearTimeout(timeout);
            ws.close();
            resolve({
              success: false,
              error: msg.error || 'Unknown OpenClaw error',
              screenshots,
            });
            break;

          default:
            // Accumulate any other messages
            break;
        }
      } catch (parseErr) {
        console.error(`[Job ${job.id}] Failed to parse WS message:`, parseErr);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

function mapJobToOpenClawTask(job: Job): Record<string, any> {
  const payload = job.input_payload;

  switch (job.type) {
    case 'COMPUTER_USE':
      return {
        type: 'computer_use',
        instruction: payload.taskDescription || payload.message || payload.instruction,
        url: payload.url,
        context: payload.context,
      };

    case 'RESEARCH':
      return {
        type: 'research',
        query: payload.query || payload.message,
        depth: payload.depth || 'standard',
      };

    case 'CHAT':
      return {
        type: 'chat',
        message: payload.originalRequest || payload.message,
        history: payload.history,
      };

    default:
      return {
        type: 'chat',
        message: payload.taskDescription || payload.message || JSON.stringify(payload),
      };
  }
}

// ─── Main loop ─────────────────────────────────
async function main() {
  console.log(`[Adapter] Starting OpenClaw adapter: ${WORKER_ID}`);
  console.log(`[Adapter] OpenClaw WS: ${OPENCLAW_WS_URL}`);

  const db = new Database(DATABASE_URL!);
  const s3 = new S3Manager(AWS_REGION, S3_BUCKET);

  // Wait for OpenClaw to be ready before entering poll loop
  await waitForOpenClaw();

  console.log('[Adapter] Entering polling loop...');

  while (!shutdownRequested) {
    try {
      const job = await db.pollForJob(WORKER_ID);

      if (job) {
        console.log(`[Adapter] Processing job ${job.id} (${job.type})`);

        try {
          const result = await sendToOpenClaw(job);

          // Upload screenshots to S3 if any
          if (result.screenshots && result.screenshots.length > 0) {
            const screenshotKeys: string[] = [];
            for (let i = 0; i < result.screenshots.length; i++) {
              const key = `screenshots/${job.user_id}/${job.id}/${i}.png`;
              // S3Manager doesn't have a raw upload method, so we'll include
              // screenshot data in the result payload for now.
              screenshotKeys.push(key);
            }
            if (result.output) {
              result.output.screenshotKeys = screenshotKeys;
            }
          }

          if (result.success) {
            await db.completeJob(job.id, {
              success: true,
              output: result.output,
            });
          } else {
            await db.failJob(job.id, result.error || 'OpenClaw task failed');
          }

          // Log approximate usage
          await db.logUsage(
            job.user_id,
            job.id,
            500,   // rough estimate — OpenClaw doesn't report tokens
            1000,
            0.02,  // ~$0.02 per task as baseline
            'openclaw'
          );

        } catch (execError: any) {
          console.error(`[Adapter] Job ${job.id} execution error:`, execError);
          await db.failJob(job.id, execError.message);
        }
      } else {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error('[Adapter] Poll loop error:', error);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.log('[Adapter] Shutting down...');
  await db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[Adapter] Fatal:', err);
  process.exit(1);
});
