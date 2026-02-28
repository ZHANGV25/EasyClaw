# EasyClaw — High-Level Overview

> A hosted platform that makes [OpenClaw](https://github.com/openclaw/openclaw) accessible to everyone — no setup, no self-hosting, just sign up and go.

## What is this?

OpenClaw is an open-source AI personal assistant that can browse the web, manage files, send messages, and automate workflows. It's powerful but requires technical setup to self-host.

**EasyClaw removes that barrier.** Users sign up, get $5.00 in free credits, and immediately have a personal AI assistant backed by Claude that can:

- Chat naturally (powered by Claude Opus via AWS Bedrock)
- Browse the web in real-time — users watch the AI work (COMPUTER_USE jobs)
- Do web research (RESEARCH jobs)
- Remember things about you (memory system with pending/confirmed states)
- Set reminders (CRUD exists, scheduler not yet built)
- Connect via Telegram for on-the-go access (Claude Sonnet)
- Run background tasks (job queue with auto-scaling workers)

## Architecture at a Glance

```
User (Web / Telegram)
        |
   [Clerk Auth]
        |
   [API Gateway]  ──── rate limited: 100 rps, burst 50
        |
   [Lambda Handlers]  ──── ~20 functions (Node 20, 512MB, 5min timeout)
        |
   [RDS Postgres]  ──── t4g.micro, 8 tables, job queue via SKIP LOCKED
        |
   [ECS Fargate Workers]  ──── 4 vCPU / 8 GB, min 2, max 50
        |                       auto-scale on queue depth (5 jobs/worker)
   [OpenClaw Runtime]  ──── browser automation, computer use
        |
   [S3]  ──── screenshots (live), state snapshots, user data
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Tailwind, deployed on AWS Amplify |
| Auth | Clerk (JWT, webhooks for user provisioning) |
| API | API Gateway REST → Lambda (Node 20) |
| Database | PostgreSQL on RDS (raw `pg` queries, no ORM) |
| Workers | ECS Fargate containers running OpenClaw + sidecar adapter |
| AI Provider | AWS Bedrock (Claude Sonnet 4.6 for workers, Claude Opus 4.6 for chat) |
| Payments | Stripe (checkout sessions, webhook for fulfillment) |
| Messaging | Telegram Bot API via grammY |
| Infra-as-Code | AWS CDK (TypeScript) |
| CI | GitHub Actions (type-check + build), Amplify (auto-deploy frontend) |

## Repo Layout

```
EasyClaw/
├── apps/web/              # Next.js frontend
│   ├── src/app/           # Pages: chat, dashboard, memory, activity, reminders, etc.
│   ├── src/components/    # ChatView, Sidebar, BrowserViewer, etc.
│   ├── src/hooks/         # useAuthToken, useStreamChat
│   ├── src/lib/           # api.ts (client), serverApi.ts (server, unused)
│   └── src/contexts/      # ConversationsContext, ThemeContext
├── backend/               # CDK stack + Lambda handlers
│   ├── lib/backend-stack.ts   # Main infra: VPC, RDS, API Gateway, Lambdas, S3
│   └── src/handlers/          # One file per feature (chat, user, stripe, memory, etc.)
├── workers/               # Job execution containers
│   ├── src/openclaw-adapter.ts # OpenClaw sidecar (bridges queue to WebSocket)
│   ├── src/lib/db.ts           # Database client for workers
│   ├── src/lib/s3.ts           # S3 upload client (screenshots)
│   ├── Dockerfile.openclaw     # OpenClaw worker image (production)
│   └── Dockerfile              # Standard worker image (unused)
├── infra/                 # Supporting CDK stacks
│   └── lib/               # worker-stack.ts, metrics-stack.ts
└── docs/                  # This file and others
```

## Database Schema

8 tables, `users.id` is `TEXT` (stores Clerk user ID strings like `user_xxx`):

| Table | Purpose |
|-------|---------|
| `users` | User profiles, credit balances, Clerk ID as PK |
| `conversations` | Chat sessions, one per thread |
| `messages` | Individual chat messages (user + assistant) |
| `jobs` | The polling queue — PENDING → RUNNING → COMPLETED/FAILED |
| `state_snapshots` | S3 keys for state artifacts |
| `transactions` | Credit history (USAGE, PURCHASE, FREE_TIER, REFUND) |
| `memories` | Facts the assistant learns about users |
| `reminders` | Scheduled reminders set via chat |

Schema managed via `db-setup` Lambda handler (includes migration support).

## How Jobs Flow

1. User sends a chat message → `POST /api/chat` Lambda
2. Claude (Opus) decides if tools are needed and may call `computer_use`, `search_web`, etc.
3. Tool creates a row in `jobs` table with status `PENDING`
4. ECS workers poll: `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`
5. Worker claims job → delegates to OpenClaw via local WebSocket
6. OpenClaw executes (browses, types, takes screenshots)
7. Sidecar streams screenshots to S3 + updates `jobs.result_payload._progress`
8. Frontend polls `GET /api/browser/status` every 1.5s for live presigned screenshot URLs
9. Worker writes final result to `jobs.result_payload` → status `COMPLETED`

## Worker Architecture

Each ECS Fargate task runs:
- **OpenClaw runtime** (base image `coollabsio/openclaw:latest`) — browser, AI agent, gateway
- **Sidecar adapter** (`openclaw-adapter.ts`) — bridges Postgres job queue to OpenClaw WebSocket

The sidecar is injected via `OPENCLAW_DOCKER_INIT_SCRIPT` and runs in the background alongside the OpenClaw gateway. Key environment variables:

```
AWS_PROFILE=default                    # Triggers credential detection for Bedrock
AWS_REGION=us-east-1                   # Bedrock region
OPENCLAW_PRIMARY_MODEL=amazon-bedrock/us.anthropic.claude-sonnet-4-6-v1:0
OPENCLAW_GATEWAY_TOKEN=internal-container-token
DATABASE_URL=...                       # From CDK stack props
```

## Live Browser Viewing

The core UX — users watch the AI browse the web in real-time:

1. **Worker side**: `onScreenshot` callback decodes base64 → uploads to S3 as `screenshots/{jobId}/latest.png` → writes progress to `jobs.result_payload._progress`
2. **Backend**: `GET /api/browser/status` Lambda finds the user's active COMPUTER_USE job, generates a presigned S3 GET URL for the latest screenshot
3. **Frontend**: `BrowserViewer` component polls every 1.5s, renders `<img>` with presigned URL, shows action text overlay and completion/failure states

## Billing Model

- New users: $5.00 free credits on signup (via Clerk webhook or auto-create fallback)
- Stripe checkout for top-ups
- Per-message deduction based on token estimates:
  - Opus: ~$0.000015/input token, ~$0.000075/output token
  - Sonnet: ~$0.000003/input token, ~$0.000015/output token
  - OpenClaw tasks: flat $0.02/task
- Token estimation: `ceil(message.length / 4)`

## Deployment

Three CDK stacks + Amplify:

| Stack | Deploys From | Contains |
|-------|-------------|----------|
| `EasyClaw-Backend-Stack` | `backend/` | VPC, RDS, API Gateway, ~20 Lambdas, S3 buckets |
| `EasyClaw-Worker-Stack` | `infra/` | ECS Cluster, Fargate tasks (4vCPU/8GB), auto-scaling, dashboard |
| `EasyClaw-Metrics-Stack` | `infra/` | Lambda that publishes PendingJobs metric every 1min |
| Amplify (auto) | `apps/web/` | Next.js frontend, auto-deploys on push to main |

### Deploy Commands

```bash
# Backend (requires CLERK_SECRET_KEY in env)
cd backend && CLERK_SECRET_KEY=sk_test_... npx cdk deploy

# Workers
cd infra && npx cdk deploy EasyClaw-Worker-Stack --exclusively

# DB migration (after schema changes)
aws lambda invoke --function-name <DbSetupLambda-name> --payload '{}' /tmp/out.json

# Frontend deploys automatically on git push to main
```

### Required Environment Variables

**Backend stack** (set at deploy time):
- `CLERK_SECRET_KEY` — Clerk JWT verification
- `CLERK_PUBLISHABLE_KEY` — Clerk frontend key

**Worker stack** (set in CDK):
- `DATABASE_URL` — passed as stack prop
- `S3_BUCKET` — passed as stack prop
- `ANTHROPIC_API_KEY` — optional, if not using Bedrock

**Not yet configured:**
- `STRIPE_WEBHOOK_SECRET` — for payment fulfillment
- `TELEGRAM_BOT_TOKEN` — for Telegram integration
- `CLERK_WEBHOOK_SECRET` — for user provisioning webhook

## Monitoring

```bash
# Worker logs
aws logs tail /ecs/easyclaw-workers --follow

# Filter for adapter activity
aws logs tail /ecs/easyclaw-workers --filter-pattern '"Adapter"'

# Filter for job processing
aws logs tail /ecs/easyclaw-workers --filter-pattern '"Processing job"'

# Check ECS service status
aws ecs describe-services --cluster easyclaw-workers --services easyclaw-workers

# CloudWatch dashboard
# https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EasyClaw-Workers
```

## Current State (Feb 2026)

**What works:** Auth, chat (Opus via Bedrock), credits, conversation history, dashboard, memory, reminders (CRUD), activity feed, settings, onboarding, live browser viewer (frontend), CI, Amplify auto-deploy, CloudWatch monitoring, ECS workers running with OpenClaw + Bedrock.

**What's left for launch:**
1. End-to-end test of computer use flow (OpenClaw → screenshots → browser viewer)
2. Deploy Stripe webhook secret for payment fulfillment
3. Deploy Telegram bot token for mobile access
4. Deploy Clerk webhook secret for user provisioning
5. Build reminder scheduler (EventBridge Lambda)
6. E2E smoke tests
7. Infrastructure hardening (RDS upgrade, WAF)
