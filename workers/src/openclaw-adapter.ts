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
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const OPENCLAW_WS_URL = OPENCLAW_GATEWAY_TOKEN
  ? `${OPENCLAW_GATEWAY_URL}?token=${OPENCLAW_GATEWAY_TOKEN}`
  : OPENCLAW_GATEWAY_URL;
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

interface OpenClawCallbacks {
  onScreenshot?: (base64Data: string) => void;
  onProgress?: (message: string) => void;
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

function sendToOpenClaw(job: Job, callbacks?: OpenClawCallbacks): Promise<OpenClawResult> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(OPENCLAW_WS_URL);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`OpenClaw task timed out after ${OPENCLAW_TASK_TIMEOUT_MS}ms`));
    }, OPENCLAW_TASK_TIMEOUT_MS);

    const screenshots: string[] = [];
    let connected = false;
    let reqCounter = 0;
    const nextId = () => `req-${++reqCounter}`;

    // Send a typed WS request frame
    function sendReq(method: string, params: Record<string, any>): string {
      const id = nextId();
      ws.send(JSON.stringify({ type: 'req', id, method, params }));
      return id;
    }

    ws.on('open', () => {
      console.log(`[Job ${job.id}] WebSocket open, waiting for challenge...`);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // ── Gateway handshake ──────────────────────
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          console.log(`[Job ${job.id}] Got challenge, sending connect...`);
          sendReq('connect', {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: 'easyclaw-adapter', version: '1.0.0', platform: 'linux', mode: 'operator' },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            caps: [],
            commands: [],
            permissions: {},
            auth: { token: OPENCLAW_GATEWAY_TOKEN },
            locale: 'en-US',
            userAgent: 'easyclaw-adapter/1.0.0',
          });
          return;
        }

        // ── Connect response (hello-ok) ────────────
        if (msg.type === 'res' && msg.ok && msg.payload?.type === 'hello-ok') {
          connected = true;
          console.log(`[Job ${job.id}] Connected to OpenClaw (protocol ${msg.payload.protocol})`);

          // Now send the agent task
          const taskPayload = mapJobToOpenClawTask(job);
          const prompt = taskPayload.instruction || taskPayload.query || taskPayload.message || JSON.stringify(taskPayload);
          console.log(`[Job ${job.id}] Sending agent.chat prompt: ${prompt.substring(0, 100)}...`);
          sendReq('agent.chat', { message: prompt });
          return;
        }

        // ── Connect error ──────────────────────────
        if (msg.type === 'res' && !msg.ok && !connected) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`OpenClaw connect failed: ${JSON.stringify(msg.error)}`));
          return;
        }

        // ── Agent events ───────────────────────────
        if (msg.type === 'event') {
          const ev = msg.event || '';
          const payload = msg.payload || {};

          // Screenshot events
          if (ev === 'agent.screenshot' || ev === 'browser.screenshot') {
            if (payload.data || payload.base64) {
              const b64 = payload.data || payload.base64;
              screenshots.push(b64);
              if (callbacks?.onScreenshot) {
                try { callbacks.onScreenshot(b64); } catch (e) {
                  console.error(`[Job ${job.id}] onScreenshot error:`, e);
                }
              }
            }
          }

          // Progress / activity events
          if (ev.startsWith('agent.') && payload.message) {
            console.log(`[Job ${job.id}] Progress: ${payload.message}`);
            if (callbacks?.onProgress) {
              try { callbacks.onProgress(payload.message); } catch (e) {
                console.error(`[Job ${job.id}] onProgress error:`, e);
              }
            }
          }

          // Agent run completed
          if (ev === 'agent.run.completed' || ev === 'agent.done') {
            clearTimeout(timeout);
            ws.close();
            resolve({
              success: true,
              output: payload.result || payload.output || payload,
              screenshots,
            });
            return;
          }

          // Agent error
          if (ev === 'agent.run.error' || ev === 'agent.error') {
            clearTimeout(timeout);
            ws.close();
            resolve({
              success: false,
              error: payload.error || payload.message || 'Agent error',
              screenshots,
            });
            return;
          }
        }

        // ── Response to agent.chat ─────────────────
        if (msg.type === 'res' && connected) {
          if (msg.ok) {
            // agent.chat accepted — results come via events
            console.log(`[Job ${job.id}] agent.chat accepted: ${JSON.stringify(msg.payload || {}).substring(0, 200)}`);
          } else {
            clearTimeout(timeout);
            ws.close();
            resolve({
              success: false,
              error: `agent.chat failed: ${JSON.stringify(msg.error)}`,
              screenshots,
            });
          }
          return;
        }

        // Legacy message types (in case gateway sends simpler format)
        switch (msg.type) {
          case 'screenshot':
            screenshots.push(msg.data);
            if (callbacks?.onScreenshot) {
              try { callbacks.onScreenshot(msg.data); } catch (e) { /* ignore */ }
            }
            break;
          case 'progress':
            console.log(`[Job ${job.id}] Progress: ${msg.message}`);
            if (callbacks?.onProgress) {
              try { callbacks.onProgress(msg.message); } catch (e) { /* ignore */ }
            }
            break;
          case 'complete':
            clearTimeout(timeout);
            ws.close();
            resolve({ success: true, output: msg.result, screenshots });
            break;
          case 'error':
            clearTimeout(timeout);
            ws.close();
            resolve({ success: false, error: msg.error || 'Unknown error', screenshots });
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

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      if (!connected) {
        reject(new Error(`WebSocket closed before connect (code=${code} reason=${reason})`));
      }
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
          // Define live-streaming callbacks
          let screenshotIndex = 0;
          const callbacks: OpenClawCallbacks = {
            onScreenshot: (base64Data: string) => {
              screenshotIndex++;
              const screenshotKey = `screenshots/${job.id}/latest.png`;
              const buffer = Buffer.from(base64Data, 'base64');

              // Fire-and-forget: upload to S3 + update DB progress
              Promise.all([
                s3.uploadBuffer(screenshotKey, buffer, 'image/png'),
                db.updateJobProgress(job.id, {
                  screenshotKey,
                  screenshotUpdatedAt: new Date().toISOString(),
                  screenshotIndex,
                }),
              ]).catch((err) => {
                console.error(`[Job ${job.id}] Failed to stream screenshot:`, err);
              });
            },
            onProgress: (message: string) => {
              db.updateJobProgress(job.id, {
                action: message,
                actionUpdatedAt: new Date().toISOString(),
              }).catch((err) => {
                console.error(`[Job ${job.id}] Failed to update progress:`, err);
              });
            },
          };

          const result = await sendToOpenClaw(job, callbacks);

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
