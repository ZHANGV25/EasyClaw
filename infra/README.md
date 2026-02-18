# EasyClaw Infrastructure (AWS CDK)

This directory contains the AWS CDK infrastructure code for EasyClaw's worker pool.

## Stacks

1. **MetricsStack**: Lambda function that publishes queue depth metrics to CloudWatch every minute
2. **WorkerStack**: ECS Fargate service with auto-scaling based on queue depth

## Prerequisites

- AWS CLI configured with credentials
- Node.js >= 22
- CDK CLI: `npm install -g aws-cdk`
- Database URL (PostgreSQL)
- S3 bucket for state storage

## Setup

```bash
cd infra
npm install
```

## Configuration

Set environment variables:

```bash
export CDK_DEFAULT_ACCOUNT=<your-aws-account-id>
export CDK_DEFAULT_REGION=us-east-1
export DATABASE_URL=postgresql://user:pass@host:5432/easyclaw
export S3_BUCKET=easyclaw-state
```

## Deployment

### Bootstrap CDK (first time only)

```bash
cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
```

### Deploy Metrics Stack

```bash
cdk deploy EasyClaw-Metrics-Stack
```

This deploys:
- Lambda function to publish queue metrics
- EventBridge rule (runs every minute)

### Deploy Worker Stack

```bash
cdk deploy EasyClaw-Worker-Stack
```

This deploys:
- ECS Cluster
- Fargate Task Definition (worker container)
- ECS Service with auto-scaling (min: 1, max: 50 workers)
- CloudWatch Dashboard
- CloudWatch Alarms

### Deploy All

```bash
cdk deploy --all
```

## Auto-Scaling Configuration

**Target Tracking Policy:**
- Target Value: 5 pending jobs per worker
- Scale Out Cooldown: 60 seconds
- Scale In Cooldown: 5 minutes

**How it works:**
- When `PendingJobs / RunningWorkers > 5`: Add workers
- When `PendingJobs / RunningWorkers < 5`: Remove workers (after 5 min cooldown)

## Monitoring

### CloudWatch Dashboard

After deployment, access the dashboard:
```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EasyClaw-Workers
```

**Widgets:**
1. Pending Jobs (queue depth)
2. Running Workers (ECS task count)
3. Jobs per Worker (ratio)

### CloudWatch Logs

Worker logs:
```bash
aws logs tail /ecs/easyclaw-workers --follow
```

Metrics publisher logs:
```bash
aws logs tail /aws/lambda/EasyClaw-Metrics-Stack-MetricsPublisher --follow
```

## Scaling Operations

### Manual Scaling

Set desired count:
```bash
aws ecs update-service \
  --cluster easyclaw-workers \
  --service easyclaw-workers \
  --desired-count 10
```

### View Current Capacity

```bash
aws ecs describe-services \
  --cluster easyclaw-workers \
  --services easyclaw-workers \
  --query 'services[0].[desiredCount,runningCount,pendingCount]'
```

## Cleanup

```bash
cdk destroy --all
```

## Directory Structure

```
infra/
├── bin/
│   └── infra.ts           # CDK app entry point
├── lib/
│   ├── worker-stack.ts    # Worker ECS/Fargate stack
│   └── metrics-stack.ts   # Metrics publisher Lambda stack
├── cdk.json               # CDK configuration
├── package.json
└── tsconfig.json
```

## Troubleshooting

### Workers not scaling

Check metrics are being published:
```bash
aws cloudwatch get-metric-statistics \
  --namespace EasyClaw \
  --metric-name PendingJobs \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

### Worker crashes

Check logs:
```bash
aws logs tail /ecs/easyclaw-workers --follow --since 10m
```

Check task status:
```bash
aws ecs list-tasks --cluster easyclaw-workers --desired-status STOPPED
```

### High costs

- Check number of running workers
- Review CloudWatch Dashboard for queue depth trends
- Consider adjusting target value (increase to reduce workers)
