# EasyClaw Deployment Guide

Complete deployment instructions for the EasyClaw worker pool system with job queue architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     EasyClaw System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐      ┌──────────────┐                     │
│  │ API Gateway │ ───▶ │   Lambda     │                     │
│  │  /jobs      │      │  Functions   │                     │
│  └─────────────┘      └──────┬───────┘                     │
│                              │                              │
│                      ┌───────▼────────┐                     │
│                      │  PostgreSQL    │                     │
│                      │  jobs table    │                     │
│                      └───────┬────────┘                     │
│                              │                              │
│                      ┌───────▼────────┐                     │
│                      │  ECS Workers   │                     │
│                      │  (poll queue)  │                     │
│                      └───────┬────────┘                     │
│                              │                              │
│                      ┌───────▼────────┐                     │
│                      │ CloudWatch     │                     │
│                      │ Metrics        │                     │
│                      └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. AWS CLI & Credentials

```bash
# Install AWS CLI
# https://aws.amazon.com/cli/

# Configure credentials
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Output format (json)

# Verify
aws sts get-caller-identity
```

### 2. Node.js & pnpm

```bash
# Node.js >= 22
node --version

# pnpm
npm install -g pnpm
```

### 3. AWS CDK

```bash
# Install CDK CLI globally
npm install -g aws-cdk

# Verify
cdk --version
```

### 4. Database Setup

Set up PostgreSQL database (RDS, Neon, Supabase, or local):

```bash
# Apply schema
psql $DATABASE_URL < backend/src/util/schema.sql

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

Expected tables:
- users
- conversations
- messages
- jobs
- state_snapshots
- transactions

### 5. S3 Bucket

```bash
# Create S3 bucket for state storage
aws s3 mb s3://easyclaw-state --region us-east-1

# Or use existing bucket
export S3_BUCKET=your-existing-bucket
```

## Environment Variables

Create `.env` file in project root:

```bash
# AWS
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/easyclaw

# Storage
S3_BUCKET=easyclaw-state
```

Or export directly:

```bash
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1
export DATABASE_URL=postgresql://user:pass@host:5432/easyclaw
export S3_BUCKET=easyclaw-state
```

## Deployment Steps

### Step 1: Install Dependencies

```bash
# Workers
cd workers
npm install

# Lambda handlers
cd ../backend/src/handlers
npm install

# Infrastructure
cd ../../../infra
npm install
```

### Step 2: Bootstrap CDK (First Time Only)

```bash
cd infra

# Bootstrap CDK in your AWS account
cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
```

This creates:
- CDK staging bucket
- IAM roles for deployments
- ECR repository for Docker images

### Step 3: Build Worker Container

```bash
cd ../workers

# Test build locally
docker build -t easyclaw-worker .

# Verify image
docker images | grep easyclaw-worker
```

### Step 4: Deploy Infrastructure

```bash
cd ../infra

# Synthesize CloudFormation templates (optional - for review)
cdk synth

# Deploy API Stack (API Gateway + Lambda functions)
cdk deploy EasyClaw-Api-Stack

# Deploy Metrics Stack (CloudWatch metrics publisher)
cdk deploy EasyClaw-Metrics-Stack

# Deploy Worker Stack (ECS Fargate + Auto-scaling)
cdk deploy EasyClaw-Worker-Stack

# OR deploy all at once
cdk deploy --all
```

### Step 5: Verify Deployment

```bash
# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name EasyClaw-Api-Stack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo "API URL: $API_URL"

# Get ECS cluster info
aws ecs describe-services \
  --cluster easyclaw-workers \
  --services easyclaw-workers

# Check CloudWatch logs
aws logs tail /ecs/easyclaw-workers --follow
```

## Stack Details

### Stack 1: EasyClaw-Api-Stack

**Resources:**
- API Gateway REST API
- 3 Lambda functions:
  - `easyclaw-create-job` (POST /jobs)
  - `easyclaw-get-job` (GET /jobs/{jobId})
  - `easyclaw-list-jobs` (GET /jobs)
- CloudWatch Log Groups

**Outputs:**
- `ApiUrl`: API Gateway endpoint
- Lambda ARNs

**Estimated Cost:**
- Free tier: 1M requests/month free
- After: $1 per million requests
- Lambda: $0.20 per million requests

### Stack 2: EasyClaw-Metrics-Stack

**Resources:**
- Lambda function (publishes queue metrics)
- EventBridge rule (runs every minute)

**What it does:**
- Queries `jobs` table for pending/running/failed counts
- Publishes metrics to CloudWatch namespace `EasyClaw`
- Triggers worker auto-scaling

**Estimated Cost:**
- ~$0.01/month (43,200 invocations/month)

### Stack 3: EasyClaw-Worker-Stack

**Resources:**
- ECS Cluster
- Fargate Task Definition (1 vCPU, 2GB RAM)
- ECS Service with auto-scaling
- Application Auto Scaling Target & Policy
- CloudWatch Dashboard
- CloudWatch Alarms

**Auto-scaling Configuration:**
- Min: 1 worker (always running)
- Max: 50 workers
- Target: 5 pending jobs per worker
- Scale out cooldown: 60 seconds
- Scale in cooldown: 5 minutes

**Estimated Cost:**
- 1 worker (min): ~$30/month
- 10 workers: ~$300/month
- 50 workers (max): ~$1,500/month

## Testing the System

### 1. Create a Job

```bash
curl -X POST ${API_URL}jobs \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -d '{
    "type": "CHAT",
    "payload": {
      "message": "Hello from EasyClaw!"
    }
  }'
```

Expected response:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "message": "Job created successfully"
}
```

### 2. Check Job Status

```bash
JOB_ID=<jobId-from-above>

curl ${API_URL}jobs/${JOB_ID} \
  -H "x-user-id: test-user-id"
```

### 3. List Jobs

```bash
curl ${API_URL}jobs?limit=10 \
  -H "x-user-id: test-user-id"
```

### 4. Watch Worker Logs

```bash
# Real-time logs
aws logs tail /ecs/easyclaw-workers --follow

# Filter for job execution
aws logs tail /ecs/easyclaw-workers --follow --filter-pattern "Claimed job"
```

### 5. Monitor Queue Depth

```bash
# Get current queue depth
aws cloudwatch get-metric-statistics \
  --namespace EasyClaw \
  --metric-name PendingJobs \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

### 6. Check Running Workers

```bash
aws ecs describe-services \
  --cluster easyclaw-workers \
  --services easyclaw-workers \
  --query 'services[0].[desiredCount,runningCount,pendingCount]'
```

## Monitoring

### CloudWatch Dashboard

After deployment, access the dashboard:

```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EasyClaw-Workers
```

**Widgets:**
1. Pending Jobs (queue depth)
2. Running Workers (ECS task count)
3. Jobs per Worker (ratio)

### CloudWatch Alarms

- **HighQueueDepth**: Triggers when pending jobs > 100
- **MaxCapacityReached**: Triggers when workers = 50

### Logs

```bash
# Worker logs
aws logs tail /ecs/easyclaw-workers --follow

# Metrics publisher logs
aws logs tail /aws/lambda/EasyClaw-Metrics-Stack-MetricsPublisher --follow

# API Lambda logs
aws logs tail /aws/lambda/easyclaw-create-job --follow
```

## Updating the System

### Update Worker Code

```bash
cd workers

# Make changes to src/
# ...

# Rebuild and deploy
cd ../infra
cdk deploy EasyClaw-Worker-Stack

# Force new deployment (if no code changes)
aws ecs update-service \
  --cluster easyclaw-workers \
  --service easyclaw-workers \
  --force-new-deployment
```

### Update Lambda Functions

```bash
cd backend/src/handlers

# Make changes to handlers/
# ...

# Redeploy API stack
cd ../../../infra
cdk deploy EasyClaw-Api-Stack
```

### Update Infrastructure

```bash
cd infra

# Modify lib/*.ts files
# ...

# Deploy changes
cdk deploy --all
```

## Scaling Operations

### Manual Scaling

```bash
# Scale to specific count
aws ecs update-service \
  --cluster easyclaw-workers \
  --service easyclaw-workers \
  --desired-count 10

# Reset to auto-scaling (will revert to target)
# Just wait for auto-scaling to kick in, or trigger by creating jobs
```

### Adjust Auto-Scaling Target

Edit `infra/lib/worker-stack.ts`:

```typescript
scaling.scaleOnMetric('QueueDepthTargetTracking', {
  metric: queueDepthMetric,
  targetValue: 10,  // Change from 5 to 10 (fewer workers)
  // ...
});
```

Then redeploy:
```bash
cdk deploy EasyClaw-Worker-Stack
```

## Troubleshooting

### Workers Not Starting

```bash
# Check ECS events
aws ecs describe-services \
  --cluster easyclaw-workers \
  --services easyclaw-workers \
  --query 'services[0].events[:5]'

# Check task failures
aws ecs list-tasks \
  --cluster easyclaw-workers \
  --desired-status STOPPED

# Get task logs
aws logs tail /ecs/easyclaw-workers --since 10m
```

### Jobs Stuck in PENDING

```bash
# Check if workers are running
aws ecs describe-services \
  --cluster easyclaw-workers \
  --services easyclaw-workers

# Check queue depth
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM jobs GROUP BY status;"

# Check worker logs for errors
aws logs tail /ecs/easyclaw-workers --follow
```

### Metrics Not Publishing

```bash
# Check metrics Lambda logs
aws logs tail /aws/lambda/EasyClaw-Metrics-Stack-MetricsPublisher --follow

# Check EventBridge rule
aws events describe-rule --name EasyClaw-Metrics-Stack-MetricsPublishSchedule

# Manually invoke Lambda
aws lambda invoke \
  --function-name EasyClaw-Metrics-Stack-MetricsPublisher \
  /tmp/output.json
```

### High Costs

```bash
# Check current worker count
aws ecs describe-services \
  --cluster easyclaw-workers \
  --services easyclaw-workers \
  --query 'services[0].runningCount'

# Reduce max capacity in code
# Edit infra/lib/worker-stack.ts: maxCapacity: 20 (instead of 50)
cdk deploy EasyClaw-Worker-Stack

# Or reduce target value (more jobs per worker)
# targetValue: 10 (instead of 5)
```

## Cleanup

### Delete All Stacks

```bash
cd infra

# Delete in reverse order
cdk destroy EasyClaw-Worker-Stack
cdk destroy EasyClaw-Metrics-Stack
cdk destroy EasyClaw-Api-Stack

# Or destroy all
cdk destroy --all
```

### Verify Deletion

```bash
# Check for remaining resources
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  | grep EasyClaw

# Delete S3 bucket (if no longer needed)
aws s3 rb s3://$S3_BUCKET --force
```

## Production Checklist

Before going to production:

- [ ] Enable Clerk authentication on API Gateway
- [ ] Configure RDS Proxy for Lambda connection pooling
- [ ] Set up VPC for workers (private subnets)
- [ ] Enable CloudWatch Container Insights
- [ ] Configure SNS alerts for alarms
- [ ] Set up AWS Backup for RDS
- [ ] Enable AWS WAF on API Gateway
- [ ] Configure custom domain for API
- [ ] Set up CloudFront for API caching
- [ ] Enable X-Ray tracing
- [ ] Configure log retention (reduce from 1 week if needed)
- [ ] Set up Cost Explorer alerts
- [ ] Document runbooks for incidents
- [ ] Test disaster recovery procedures

## Cost Optimization

1. **Reduce min workers to 0** (but adds cold start latency)
2. **Increase target value** (fewer workers, longer queue times)
3. **Use RDS Proxy** (reduce Lambda connection overhead)
4. **Optimize worker resources** (reduce vCPU/memory if possible)
5. **Use Lambda provisioned concurrency** for API (if high traffic)
6. **Enable S3 Intelligent-Tiering** for state storage
7. **Set CloudWatch log retention** to 3 days instead of 1 week

## Support

For issues or questions:
- Check logs first (CloudWatch)
- Review CDK outputs for resource IDs
- Use AWS X-Ray for distributed tracing
- Contact: [your-email@example.com]
