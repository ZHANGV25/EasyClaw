# EasyClaw

Your private, always-on AI personal assistant. No setup required.

## Project Structure

```
EasyClaw/
├── apps/web/          # Next.js frontend (landing page, chat UI)
├── backend/           # Node.js backend API with raw PostgreSQL
├── workers/           # Job worker container (polls queue, executes tasks)
├── infra/             # AWS CDK infrastructure (ECS/Fargate, auto-scaling)
├── packages/config/   # Shared types, constants
├── packages/ui/       # Shared UI components (coming soon)
└── docs/              # Product docs, architecture, strategy
```

## Tech Stack

- **Frontend:** Next.js 14 + Tailwind CSS
- **Backend:** Node.js + Express + PostgreSQL (raw queries)
- **Workers:** Node.js + TypeScript (ECS Fargate containers)
- **Infrastructure:** AWS CDK (TypeScript)
- **Database:** PostgreSQL (raw queries via pg library)
- **Auth:** Clerk
- **Billing:** Stripe (coming)
- **Containers:** AWS ECS/Fargate
- **Messaging:** Telegram Bot API (coming)

## Quick Start

### 1. Install Dependencies

```bash
# Root
pnpm install

# Backend
cd backend && npm install

# Workers
cd workers && npm install

# Infrastructure
cd infra && npm install
```

### 2. Setup Database

Apply schema:
```bash
psql $DATABASE_URL < backend/src/util/schema.sql
```

### 3. Start Development

```bash
# Backend API (port 3001)
cd backend && npm run dev

# Frontend (port 3000)
cd apps/web && pnpm dev

# Worker (local)
cd workers && npm run dev
```

## Deployment

### Deploy Infrastructure

```bash
cd infra

# Bootstrap CDK (first time)
cdk bootstrap

# Deploy metrics publisher Lambda
cdk deploy EasyClaw-Metrics-Stack

# Deploy worker pool with auto-scaling
cdk deploy EasyClaw-Worker-Stack

# Or deploy all
cdk deploy --all
```

See [infra/README.md](infra/README.md) for detailed deployment instructions.

## Architecture

### Worker Pool Model

**NOT one container per user.** Instead, a **scalable worker pool** that handles jobs for all users:

```
Frontend/API creates job → jobs table (PENDING)
                ↓
     [Worker Pool - scales with queue size]
     Worker 1, Worker 2, Worker 3, ... Worker N
                ↓
     Each worker polls: SELECT * FROM jobs WHERE status='PENDING' LIMIT 1 FOR UPDATE SKIP LOCKED
                ↓
     Worker fetches user data from SQL + filesystem from S3
                ↓
     Worker executes task → returns result
                ↓
     Worker returns to polling loop
```

### Auto-Scaling

- **Target:** 5 pending jobs per worker
- **Min workers:** 1 (always ready)
- **Max workers:** 50 (cost cap)
- **Scale up:** When pending_jobs / workers > 5 (60s cooldown)
- **Scale down:** When pending_jobs / workers < 5 (5min cooldown)

## API Usage

### Create a job

```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -d '{
    "type": "CHAT",
    "payload": {
      "message": "Hello, how are you?"
    }
  }'
```

Response:
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "PENDING",
  "message": "Job created successfully"
}
```

### Get job status

```bash
curl http://localhost:3001/api/jobs/{jobId} \
  -H "x-user-id: test-user-id"
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Container System](docs/CONTAINER_SYSTEM.md)
- [Product Plan](docs/PRODUCT_PLAN.md)
- [Agent Onboarding](docs/AGENT_ONBOARD.md)
- [Infrastructure](infra/README.md)

## Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/easyclaw
PORT=3001

# Workers
DATABASE_URL=postgresql://user:pass@host:5432/easyclaw
AWS_REGION=us-east-1
S3_BUCKET=easyclaw-state
POLL_INTERVAL_MS=5000

# Infrastructure (CDK)
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1
DATABASE_URL=postgresql://user:pass@host:5432/easyclaw
S3_BUCKET=easyclaw-state
```

## Development Workflow

1. **Backend API**: Creates jobs in database
2. **Worker**: Polls database, claims jobs, executes tasks
3. **Frontend**: Displays job status, results

### Test the full flow

1. Start backend: `cd backend && npm run dev`
2. Start worker locally: `cd workers && npm run dev`
3. Create a test job via API (see above)
4. Watch worker logs to see job execution

## License

MIT
