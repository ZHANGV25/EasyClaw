# EasyClaw Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EasyClaw System                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐    ┌─────────────────┐   │
│  │  Amplify      │     │ API Gateway  │    │ ECS Fargate     │   │
│  │  (Next.js)    │────▶│  (REST)      │    │ (Workers x2-50) │   │
│  └──────────────┘     └──────┬───────┘    └────────┬────────┘   │
│                              │                      │            │
│                       ┌──────▼───────┐              │            │
│                       │   Lambda     │              │            │
│                       │  (~20 fns)   │              │            │
│                       └──────┬───────┘              │            │
│                              │                      │            │
│                       ┌──────▼──────────────────────▼──────┐    │
│                       │     RDS PostgreSQL (t4g.micro)     │    │
│                       │  jobs table = polling queue         │    │
│                       └──────┬─────────────────────────────┘    │
│                              │                                   │
│                       ┌──────▼───────┐    ┌──────────────┐      │
│                       │     S3       │    │  Bedrock     │      │
│                       │ screenshots  │    │ Claude 4.6   │      │
│                       └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

```bash
# AWS CLI configured
aws sts get-caller-identity

# Node.js >= 22, pnpm, CDK CLI
node --version && pnpm --version && cdk --version

# Docker running (for worker image builds)
docker info
```

## CDK Stacks

| Stack | Directory | What It Creates |
|-------|-----------|----------------|
| `EasyClaw-Backend-Stack` | `backend/` | VPC, RDS, API Gateway, ~20 Lambdas, S3 buckets |
| `EasyClaw-Worker-Stack` | `infra/` | ECS Cluster, Fargate Service, auto-scaling, CloudWatch dashboard |
| `EasyClaw-Metrics-Stack` | `infra/` | Lambda + EventBridge rule (publishes queue metrics every 1min) |

Frontend deploys automatically via **AWS Amplify** on push to `main`.

## Deploy Backend

```bash
cd backend
npm install

# Required env vars at deploy time
export CLERK_SECRET_KEY=sk_test_...
export CLERK_PUBLISHABLE_KEY=pk_test_...

npx cdk deploy --require-approval never
```

After deploy, initialize/migrate the database:

```bash
# Get the function name from CDK output
aws lambda invoke \
  --function-name <DbSetupLambda function name> \
  --payload '{}' /tmp/db-setup.json \
  --region us-east-1

cat /tmp/db-setup.json
# Should show: {"statusCode":200,"body":"{\"message\":\"Database initialized successfully\"}"}
```

The db-setup handler is idempotent and includes migrations (e.g., UUID→TEXT for user IDs).

## Deploy Workers

```bash
cd infra
npm install

npx cdk deploy EasyClaw-Worker-Stack --exclusively --require-approval never
```

This builds a Docker image (`workers/Dockerfile.openclaw`) for linux/amd64 and pushes it to ECR. The ECS service rolls out new tasks with a 120s health check start period.

**Worker environment (configured in CDK):**

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | From stack props | Postgres connection |
| `S3_BUCKET` | From stack props | Screenshot uploads |
| `AWS_PROFILE` | `default` | Triggers Bedrock credential detection |
| `AWS_REGION` | `us-east-1` | Bedrock region |
| `OPENCLAW_PRIMARY_MODEL` | `amazon-bedrock/us.anthropic.claude-sonnet-4-6-v1:0` | AI model |
| `OPENCLAW_GATEWAY_TOKEN` | `internal-container-token` | WebSocket auth |
| `POLL_INTERVAL_MS` | `5000` | Job queue poll interval |
| `OPENCLAW_TASK_TIMEOUT_MS` | `300000` | 5min task timeout |

## Deploy Metrics (Optional)

```bash
cd infra
npx cdk deploy EasyClaw-Metrics-Stack --exclusively --require-approval never
```

Publishes `EasyClaw/PendingJobs` metric to CloudWatch every minute, which drives worker auto-scaling.

## Frontend (Automatic)

Amplify auto-deploys from `main` branch. To check status:

```bash
# Or visit the Amplify console
# Frontend URL: https://main.d24tfvdrfnje2s.amplifyapp.com/
```

The frontend needs `NEXT_PUBLIC_API_URL` set in Amplify environment variables:
```
NEXT_PUBLIC_API_URL=https://v2hk7dxl4g.execute-api.us-east-1.amazonaws.com/prod
```

## Verify Deployment

### Check Workers

```bash
# ECS service status
aws ecs describe-services \
  --cluster easyclaw-workers \
  --services easyclaw-workers \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'

# Worker logs (live)
aws logs tail /ecs/easyclaw-workers --follow --region us-east-1

# Check if adapter started
aws logs tail /ecs/easyclaw-workers --filter-pattern '"init"' --since 30m

# Check if Bedrock provider is configured
aws logs tail /ecs/easyclaw-workers --filter-pattern '"provider"' --since 30m
```

### Check Backend

```bash
# API Gateway URL
echo "https://v2hk7dxl4g.execute-api.us-east-1.amazonaws.com/prod/"

# Test health (should return 401 without auth)
curl -s https://v2hk7dxl4g.execute-api.us-east-1.amazonaws.com/prod/api/user
```

### Check Database

```bash
# Invoke db-setup to verify schema
aws lambda invoke \
  --function-name <DbSetupLambda> \
  --payload '{}' /tmp/out.json && cat /tmp/out.json
```

## Common Operations

```bash
# Force new worker deployment (no code changes)
aws ecs update-service --cluster easyclaw-workers --service easyclaw-workers --force-new-deployment

# Scale workers manually
aws ecs update-service --cluster easyclaw-workers --services easyclaw-workers --desired-count 5

# Check job queue
# (requires DB access — use ECS exec or Lambda)
aws ecs execute-command --cluster easyclaw-workers --task <task-id> --container worker --interactive --command "/bin/bash"

# View CloudWatch dashboard
# https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EasyClaw-Workers
```

## Environment Variables Not Yet Configured

These are needed for full functionality but not required for core chat + computer use:

| Variable | Where | Purpose |
|----------|-------|---------|
| `STRIPE_WEBHOOK_SECRET` | Backend stack | Stripe payment fulfillment |
| `STRIPE_SECRET_KEY` | Backend stack | Stripe checkout sessions |
| `TELEGRAM_BOT_TOKEN` | Backend stack | Telegram bot integration |
| `CLERK_WEBHOOK_SECRET` | Backend stack | User provisioning on signup |

## Troubleshooting

### Workers crash-looping

```bash
# Check stopped task reason
aws ecs list-tasks --cluster easyclaw-workers --desired-status STOPPED
aws ecs describe-tasks --cluster easyclaw-workers --tasks <task-arn> \
  --query 'tasks[0].{reason:stoppedReason,exit:containers[0].exitCode}'

# Common causes:
# - "exec format error" → Docker image built for wrong platform (need linux/amd64)
# - "OPENCLAW_GATEWAY_TOKEN is required" → Missing env var
# - "host not found in upstream browser" → Missing /etc/hosts entry in init script
```

### OpenClaw returns "Invalid API Key"

```bash
# Check which provider OpenClaw selected
aws logs tail /ecs/easyclaw-workers --filter-pattern '"provider"' --since 10m

# If it shows "synthetic" instead of "amazon-bedrock":
# - Ensure AWS_PROFILE=default is set
# - Remove SYNTHETIC_API_KEY if present
# - Set OPENCLAW_PRIMARY_MODEL explicitly
```

### Chat returns "UNAUTHORIZED"

- Check that `CLERK_SECRET_KEY` was set during backend deploy
- Check Lambda env: the key is baked in at deploy time, not runtime

### Chat returns UUID error

- Run the db-setup Lambda to migrate `users.id` from UUID to TEXT
- The migration is idempotent and safe to re-run

## Estimated Costs

| Resource | Monthly Cost |
|----------|-------------|
| RDS t4g.micro | ~$15 |
| 2 Fargate workers (4vCPU/8GB) | ~$240 |
| API Gateway + Lambda | ~$5 (low traffic) |
| S3 | ~$1 |
| CloudWatch | ~$5 |
| Amplify | Free tier |
| **Total (idle)** | **~$266/month** |

Workers are the main cost driver. Scale to 0 when not in use to save ~$240/month.
