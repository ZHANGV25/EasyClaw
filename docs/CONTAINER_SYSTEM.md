# Container System Implementation

## Overview

This document outlines the implementation strategy for EasyClaw's container system, with a focus on how we can leverage components from [OpenClaw](https://github.com/openclaw/openclaw.git) while building our managed, job-polling architecture.

## Current EasyClaw Architecture Context

From our existing architecture:
- **Database Schema**: Users, conversations, messages, jobs (polling queue), state_snapshots, transactions
- **Hosting**: AWS ECS/Fargate for container orchestration
- **Storage**: S3 for user filesystems (referenced in state_snapshots)
- **Database**: PostgreSQL for user data, usage tracking, job queues

## Container Architecture

### Scalable Worker Pool Model

**NOT one container per user.** Instead, we use a **generic worker pool** that scales with queue depth:

```
Frontend/API creates job -> jobs table (PENDING)
                ↓
     [Worker Pool - scales with queue size]
     Worker 1, Worker 2, Worker 3, ... Worker N
                ↓
     Each worker polls: SELECT * FROM jobs WHERE status='PENDING' LIMIT 1 FOR UPDATE SKIP LOCKED
                ↓
     Worker claims job, sets status='RUNNING', worker_id=ECS_TASK_ID
                ↓
     Worker fetches user data from SQL + filesystem from S3
                ↓
     Worker executes task (any user, any job type)
                ↓
     Worker reports completion, updates job status
                ↓
     Worker returns to polling loop
```

### Job Flow

```
1. Job Creation (Frontend/API)
   ├─→ User sends message or triggers action
   ├─→ API creates row in jobs table (status='PENDING')
   └─→ Returns job_id to frontend for tracking

2. Job Acquisition (Worker)
   ├─→ Worker polls: SELECT * FROM jobs WHERE status='PENDING' LIMIT 1 FOR UPDATE SKIP LOCKED
   ├─→ Worker sets status='RUNNING', worker_id=<ECS_TASK_ID>, locked_at=NOW()
   └─→ Transaction committed (job is now claimed)

3. Context Loading (Worker)
   ├─→ Fetch user from SQL: SELECT * FROM users WHERE id=job.user_id
   ├─→ Fetch conversation context: SELECT * FROM conversations WHERE id=job.conversation_id
   ├─→ Fetch recent messages: SELECT * FROM messages WHERE conversation_id=... ORDER BY created_at DESC LIMIT 20
   └─→ Download filesystem: GET state_snapshots WHERE job_id=... -> Download from S3 using s3_key

4. Task Execution (Worker)
   ├─→ Unzip filesystem to working directory
   ├─→ Initialize browser automation (if needed)
   ├─→ Execute task with OpenClaw capabilities
   └─→ Handle errors gracefully (fail state, not crash)

5. Job Completion (Worker)
   ├─→ Update job: SET status='COMPLETED'/'FAILED', result_payload={...}
   ├─→ Upload modified filesystem back to S3 (if changed)
   ├─→ Create new state_snapshot entry with new s3_key
   ├─→ Log transaction for billing: INSERT INTO transactions (user_id, amount, type='USAGE')
   └─→ Clean up local state, return to polling loop
```

### Worker Lifecycle

```
1. Worker Startup (ECS Task Start)
   ├─→ Initialize database connection
   ├─→ Initialize S3 client
   ├─→ Set worker_id = ECS_TASK_ARN
   └─→ Enter polling loop

2. Polling Loop (Continuous)
   ├─→ Query: SELECT * FROM jobs WHERE status='PENDING' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
   ├─→ If no job: sleep 5 seconds, retry
   ├─→ If job found: proceed to execution
   └─→ Transaction ensures only one worker claims each job

3. Job Execution (Any User, Any Job Type)
   ├─→ Fetch user data: SELECT * FROM users WHERE id=job.user_id
   ├─→ Fetch conversation: SELECT * FROM conversations WHERE id=job.conversation_id
   ├─→ Fetch state snapshot: SELECT s3_key FROM state_snapshots WHERE job_id=...
   ├─→ Download filesystem from S3, unzip to /tmp/workspace/{job_id}/
   ├─→ Execute task using OpenClaw capabilities
   └─→ Log usage to transactions table

4. Job Completion
   ├─→ Upload modified filesystem to S3 (new s3_key)
   ├─→ INSERT INTO state_snapshots (job_id, s3_key, version)
   ├─→ UPDATE jobs SET status='COMPLETED', result_payload={...}, updated_at=NOW()
   ├─→ Clean up /tmp/workspace/{job_id}/
   └─→ Return to polling loop

5. Worker Shutdown (Graceful)
   ├─→ Stop accepting new jobs
   ├─→ Finish current job (or mark as FAILED if timeout)
   ├─→ Close database connections
   └─→ Exit
```

## OpenClaw Integration Points

### Components to Evaluate for Reuse

#### 1. Browser Automation Layer
**OpenClaw Components:**
- Playwright/Puppeteer integration
- Browser context management
- Page interaction utilities
- Screenshot/recording capabilities

**EasyClaw Needs:**
- Similar browser exploration for web research
- User task execution (form filling, data extraction, etc.)
- Session persistence across jobs

**Integration Strategy:**
- [ ] Clone OpenClaw repo for analysis
- [ ] Identify browser automation module structure
- [ ] Extract reusable components into `packages/browser-automation`
- [ ] Add S3-backed session storage for persistence

#### 2. Task Execution Framework
**OpenClaw Components:**
- Task parsing and routing
- Context management (SOUL.md, USER.md, AGENTS.md)
- Memory/state handling
- Tool/action execution

**EasyClaw Adaptation:**
- Replace file-based config with DB-backed user preferences
- Add job polling loop instead of direct CLI invocation
- Implement API callback mechanism for progress updates

#### 3. Agent Capabilities
**OpenClaw Features:**
- Web research and browsing
- Calendar/reminder management
- Writing and drafting
- General Q&A with memory

**EasyClaw Enhancements:**
- Phone call capabilities (future)
- Multi-user isolation (critical)
- Usage tracking for billing
- Rate limiting per user tier

## Technical Implementation

### Database Schema (Current)

From `backend/src/util/schema.sql`:

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,                   -- Clerk ID or generated
    email VARCHAR(255) NOT NULL,
    credits_balance NUMERIC(10, 4) DEFAULT 0.0000,
    stripe_customer_id VARCHAR(255),
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table (the polling queue)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    type VARCHAR(50) NOT NULL DEFAULT 'CHAT',
    input_payload JSONB DEFAULT '{}',
    result_payload JSONB,
    worker_id VARCHAR(255),                -- ECS Task ID
    locked_at TIMESTAMP WITH TIME ZONE,    -- Race condition handling
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- State snapshots (filesystem versions in S3)
CREATE TABLE state_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    s3_key VARCHAR(255) NOT NULL,          -- s3://easyclaw-state/{user_id}/{job_id}/fs.zip
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions (credit usage tracking)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 4) NOT NULL,        -- Negative for usage, positive for purchase
    type VARCHAR(50) NOT NULL CHECK (type IN ('PURCHASE', 'USAGE', 'FREE_TIER', 'REFUND')),
    description TEXT,
    meta JSONB DEFAULT '{}',               -- {job_id, tokens_in, tokens_out, model}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Index for Performance:**
```sql
CREATE INDEX idx_jobs_status_pending ON jobs(status) WHERE status = 'PENDING';
```

### Worker Polling Logic (Pseudocode)

```typescript
async function pollForJobs() {
  while (true) {
    try {
      // Atomic claim with FOR UPDATE SKIP LOCKED
      const job = await db.query(`
        SELECT * FROM jobs
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);

      if (!job) {
        await sleep(5000); // No jobs, wait 5 seconds
        continue;
      }

      // Claim the job
      await db.query(`
        UPDATE jobs
        SET status = 'RUNNING',
            worker_id = $1,
            locked_at = NOW()
        WHERE id = $2
      `, [WORKER_ID, job.id]);

      // Execute job
      await executeJob(job);

    } catch (error) {
      console.error('Poll error:', error);
      await sleep(5000);
    }
  }
}

async function executeJob(job: Job) {
  try {
    // 1. Fetch user data
    const user = await db.query('SELECT * FROM users WHERE id = $1', [job.user_id]);

    // 2. Fetch conversation context
    const conversation = await db.query('SELECT * FROM conversations WHERE id = $1', [job.conversation_id]);
    const messages = await db.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20', [job.conversation_id]);

    // 3. Download filesystem from S3
    const snapshot = await db.query('SELECT s3_key FROM state_snapshots WHERE job_id = $1 ORDER BY version DESC LIMIT 1', [job.id]);
    const fsPath = await downloadAndUnzip(snapshot.s3_key, `/tmp/workspace/${job.id}/`);

    // 4. Execute task using OpenClaw
    const result = await runOpenClawTask(job.type, job.input_payload, { user, conversation, messages, fsPath });

    // 5. Upload modified filesystem
    const newS3Key = await zipAndUpload(`/tmp/workspace/${job.id}/`, `state/${user.id}/${job.id}/fs-v${snapshot.version + 1}.zip`);
    await db.query('INSERT INTO state_snapshots (job_id, s3_key, version) VALUES ($1, $2, $3)', [job.id, newS3Key, snapshot.version + 1]);

    // 6. Log usage
    await db.query('INSERT INTO transactions (user_id, amount, type, description, meta) VALUES ($1, $2, $3, $4, $5)',
      [user.id, -result.cost, 'USAGE', `Job ${job.id}`, { job_id: job.id, tokens_in: result.tokensIn, tokens_out: result.tokensOut }]);

    // 7. Mark job complete
    await db.query('UPDATE jobs SET status = $1, result_payload = $2, updated_at = NOW() WHERE id = $3',
      ['COMPLETED', result, job.id]);

    // 8. Cleanup
    await fs.rm(`/tmp/workspace/${job.id}/`, { recursive: true });

  } catch (error) {
    // Mark job as failed
    await db.query('UPDATE jobs SET status = $1, result_payload = $2, updated_at = NOW() WHERE id = $3',
      ['FAILED', { error: error.message }, job.id]);
  }
}
```

### Worker Code Structure

```
worker/
├── src/
│   ├── main.ts              # Entry point, polling loop
│   ├── poller.ts            # Job polling with FOR UPDATE SKIP LOCKED
│   ├── executor.ts          # Job execution orchestrator
│   ├── context-loader.ts    # Fetch user/conversation/messages from DB
│   ├── fs-manager.ts        # S3 download/upload, zip/unzip
│   ├── browser/             # OpenClaw browser automation
│   │   ├── context.ts
│   │   ├── actions.ts
│   │   └── recorder.ts
│   ├── agents/              # OpenClaw agent capabilities
│   │   ├── research.ts      # Web research tasks
│   │   ├── chat.ts          # Conversational tasks
│   │   └── tools.ts         # Tool execution (future: calling)
│   ├── billing.ts           # Usage logging to transactions table
│   └── utils/
│       ├── db.ts            # PostgreSQL client
│       ├── s3.ts            # S3 client
│       ├── logger.ts
│       └── metrics.ts
├── Dockerfile               # Multi-stage build with OpenClaw dependencies
├── package.json
└── .env.example
```

## Implementation Phases

### Phase 1: Minimal Viable Worker
- [ ] Database connection and polling loop with FOR UPDATE SKIP LOCKED
- [ ] Job claiming logic (update status, worker_id, locked_at)
- [ ] S3 filesystem download/upload utilities (zip/unzip)
- [ ] Context loader (fetch user, conversation, messages from DB)
- [ ] Echo test task: claim job, download FS, echo result, upload FS, mark complete
- [ ] Dockerize worker with basic health checks

### Phase 2: OpenClaw Integration Research
- [ ] Clone and analyze OpenClaw repository structure
- [ ] Document reusable components and their dependencies
- [ ] Identify licensing constraints (likely open source)
- [ ] Plan extraction strategy (fork vs. reimplementation)
- [ ] Test OpenClaw locally with sample tasks

### Phase 3: Browser Automation
- [ ] Extract OpenClaw browser automation code (Playwright/Puppeteer)
- [ ] Adapt for job-based execution model
- [ ] Test with simple web scraping task (e.g., fetch weather from Google)
- [ ] Add screenshot/recording capabilities
- [ ] Handle browser crashes gracefully

### Phase 4: Agent Capabilities (Chat, Research)
- [ ] Port OpenClaw chat agent (Anthropic API integration)
- [ ] Port web research agent (browser + LLM reasoning)
- [ ] Replace file-based config (SOUL.md, USER.md) with DB queries
- [ ] Add usage tracking: log tokens to transactions table
- [ ] Implement user isolation boundaries (all queries have WHERE user_id = ?)

### Phase 5: Container Orchestration & Scaling
- [ ] Deploy worker to AWS ECS Fargate
- [ ] Set up auto-scaling: scale workers based on pending jobs count
- [ ] Configure task graceful shutdown (finish current job before terminating)
- [ ] Monitor worker health (CloudWatch logs, metrics)
- [ ] Cost optimization: right-size worker resources (CPU/memory)

### Phase 6: Phone Calling (Future)
- [ ] Research voice API options (Twilio, Bland AI, Vapi, etc.)
- [ ] Design calling workflow (job type: 'CALL')
- [ ] Integrate with job system (input: phone number, script; output: transcript)
- [ ] Add call recording and transcription to S3
- [ ] Billing for call duration

## Key Considerations

### Multi-tenancy & Isolation
**Critical for security: workers handle multiple users**
- Every DB query MUST have `WHERE user_id = ?` (from job payload)
- Filesystem isolated to `/tmp/workspace/{job_id}/` (wiped after job)
- No shared state between jobs
- Browser contexts isolated per job (separate Playwright context)
- Credentials never logged or exposed

### Stateless Worker Design
- Workers can be killed at any moment (ECS task termination)
- All state persisted to DB or S3 immediately (no in-memory caching)
- Jobs can be retried by different worker if worker crashes
- Job claiming is atomic (FOR UPDATE SKIP LOCKED prevents double-claiming)
- Graceful shutdown: finish current job before terminating

### Scaling Strategy
- **Auto-scaling metric**: Number of PENDING jobs in queue
- **Scale-up rule**: If `pending_jobs > workers * 2`, add worker
- **Scale-down rule**: If `pending_jobs == 0` for 5 minutes, remove worker
- **Min workers**: 1 (always ready for jobs)
- **Max workers**: 50 (cost cap, can increase later)
- **Worker lifecycle**: ~60 minute max uptime, then gracefully replaced (prevent memory leaks)

### Performance & Cost Optimization
- **Polling frequency**: 5 seconds when idle (tunable)
- **S3 optimization**: Use versioned snapshots, only upload if filesystem changed
- **Database connection pooling**: Reuse connections across jobs
- **Job timeout**: Kill jobs after 10 minutes to prevent runaway costs
- **Filesystem caching**: Consider worker-local cache for frequently used files (future)

### Observability & Monitoring
- **CloudWatch Logs**: All worker stdout/stderr
- **Metrics**: Job completion rate, worker utilization, queue depth, latency
- **Alerts**: Job failure rate > 10%, queue depth > 100, worker OOM
- **Tracing**: Log job_id, user_id, worker_id for every operation

## Auto-Scaling with Target Tracking

### Overview

**Target Tracking** is the recommended auto-scaling approach for EasyClaw's MVP. It automatically maintains a target metric value by adjusting the worker count.

**How It Works:**
- AWS monitors a CloudWatch metric (e.g., `PendingJobs`)
- Target value: "Keep X pending jobs per worker"
- Auto Scaling automatically adds/removes workers to maintain target
- No manual threshold configuration needed

### Target Metric: Queue Depth per Worker

```
Target Value = 5 pending jobs per worker

Examples:
- 10 pending jobs → 2 workers (10 / 5 = 2)
- 25 pending jobs → 5 workers (25 / 5 = 5)
- 0 pending jobs → 1 worker (min capacity)
- 300 pending jobs → 50 workers (max capacity cap)
```

### Publishing Queue Depth Metric

**Option A: Scheduled Lambda (Recommended for MVP)**

```typescript
// lambda/publish-queue-metrics.ts
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { Pool } from 'pg';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });
const db = new Pool({ connectionString: process.env.DATABASE_URL });

export const handler = async () => {
  // Query queue depth
  const result = await db.query(`
    SELECT COUNT(*) as pending FROM jobs WHERE status = 'PENDING'
  `);

  const pendingJobs = parseInt(result.rows[0].pending);

  // Publish to CloudWatch
  await cloudwatch.putMetricData({
    Namespace: 'EasyClaw',
    MetricData: [{
      MetricName: 'PendingJobs',
      Value: pendingJobs,
      Unit: 'Count',
      Timestamp: new Date(),
    }],
  });

  console.log(`Published metric: ${pendingJobs} pending jobs`);
};

// Deploy with EventBridge schedule: rate(1 minute)
```

**Option B: Backend publishes on job creation**

```typescript
// backend/src/lib/metrics.ts
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });

export async function publishQueueDepth(count: number) {
  await cloudwatch.putMetricData({
    Namespace: 'EasyClaw',
    MetricData: [{
      MetricName: 'PendingJobs',
      Value: count,
      Unit: 'Count',
    }],
  });
}

// Call after creating job:
// await publishQueueDepth(pendingCount);
```

### Scale Up Behavior

**Trigger:** `PendingJobs / RunningWorkers > TargetValue`

**Example with target = 5 jobs/worker:**

```
Current State: 3 workers, 20 pending jobs
Ratio: 20 / 3 = 6.67 jobs/worker (exceeds target of 5)

Action: Add workers to bring ratio down
New desired: 20 / 5 = 4 workers
Scale up: +1 worker

Timeline:
T+0s:   Alarm triggers (ratio > target)
T+10s:  ECS starts launching new task
T+45s:  New worker container starts
T+60s:  Worker begins polling for jobs
T+120s: Scale-up cooldown begins (prevents rapid scaling)
```

**Scale-Up Settings:**
- **Cooldown**: 60 seconds (wait before scaling up again)
- **Evaluation Period**: 1 minute (how long to observe breach)
- **Datapoints**: 1 out of 1 (scale immediately on first breach)

### Scale Down Behavior

**Trigger:** `PendingJobs / RunningWorkers < TargetValue`

**Example with target = 5 jobs/worker:**

```
Current State: 10 workers, 30 pending jobs
Ratio: 30 / 10 = 3 jobs/worker (below target of 5)

Action: Remove workers to bring ratio up
New desired: 30 / 5 = 6 workers
Scale down: -4 workers

Timeline:
T+0s:   Alarm triggers (ratio < target)
T+5m:   Scale-down cooldown expires
T+5m:   ECS decreases desired count (10 → 6)
T+5m:   ECS selects 4 tasks to terminate
T+5m:   ECS sends SIGTERM to selected workers
T+6m:   Workers finish current jobs gracefully
T+7m:   Workers exit, tasks terminated
```

**Scale-Down Settings:**
- **Cooldown**: 300 seconds (5 minutes - prevent thrashing)
- **Evaluation Period**: 5 minutes (sustained low load before scaling down)
- **Datapoints**: 3 out of 3 (require 3 consecutive low readings)

**Graceful Termination:**
```typescript
// worker/src/main.ts
let shutdownRequested = false;

process.on('SIGTERM', () => {
  console.log('SIGTERM received, gracefully shutting down...');
  shutdownRequested = true;
});

async function pollLoop() {
  while (!shutdownRequested) {
    const job = await pollForJob();
    if (job) {
      await executeJob(job);
    } else {
      await sleep(5000);
    }
  }

  console.log('Shutdown complete, no jobs in progress');
  process.exit(0);
}
```

### Infrastructure Configuration

#### AWS CDK Implementation

```typescript
// infra/lib/worker-scaling-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class WorkerScalingStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // ... (ECS cluster, task def, service setup) ...

    // Custom CloudWatch metric
    const queueDepthMetric = new cloudwatch.Metric({
      namespace: 'EasyClaw',
      metricName: 'PendingJobs',
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
    });

    // Auto Scaling with Target Tracking
    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 50,
    });

    scaling.scaleOnMetric('TargetQueueDepth', {
      metric: queueDepthMetric,
      targetValue: 5, // Target: 5 pending jobs per worker
      scaleInCooldown: cdk.Duration.minutes(5),  // Wait 5 min before scaling down
      scaleOutCooldown: cdk.Duration.seconds(60), // Wait 60s before scaling up again
    });

    // Lambda to publish metrics
    const metricPublisher = new lambda.Function(this, 'MetricPublisher', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/publish-queue-metrics'),
      environment: {
        DATABASE_URL: process.env.DATABASE_URL!,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(10),
    });

    // Schedule: Run every minute
    const rule = new events.Rule(this, 'MetricPublishSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
    });
    rule.addTarget(new targets.LambdaFunction(metricPublisher));

    // Output
    new cdk.CfnOutput(this, 'ServiceArn', {
      value: service.serviceArn,
      description: 'ECS Service ARN',
    });
  }
}
```

#### Terraform Implementation

```hcl
# infra/terraform/worker-autoscaling.tf

# CloudWatch metric (published by Lambda)
# No resource needed - metric created when first datapoint published

# Lambda function to publish metrics
resource "aws_lambda_function" "publish_metrics" {
  filename         = "lambda/publish-queue-metrics.zip"
  function_name    = "easyclaw-publish-queue-metrics"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 10

  environment {
    variables = {
      DATABASE_URL = var.database_url
      AWS_REGION   = var.aws_region
    }
  }
}

# EventBridge rule: Run every minute
resource "aws_cloudwatch_event_rule" "publish_metrics_schedule" {
  name                = "easyclaw-publish-metrics"
  description         = "Publish queue depth metric every minute"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.publish_metrics_schedule.name
  target_id = "PublishMetricsLambda"
  arn       = aws_lambda_function.publish_metrics.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.publish_metrics.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.publish_metrics_schedule.arn
}

# Application Auto Scaling Target
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 50
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.workers.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Target Tracking Scaling Policy
resource "aws_appautoscaling_policy" "queue_depth_tracking" {
  name               = "queue-depth-target-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 5.0 # Target: 5 pending jobs per worker

    customized_metric_specification {
      metric_name = "PendingJobs"
      namespace   = "EasyClaw"
      statistic   = "Average"
    }

    scale_in_cooldown  = 300 # 5 minutes
    scale_out_cooldown = 60  # 60 seconds
  }
}
```

### Monitoring & Alerts

**CloudWatch Dashboard:**
```typescript
const dashboard = new cloudwatch.Dashboard(this, 'WorkerDashboard', {
  dashboardName: 'EasyClaw-Workers',
  widgets: [
    [
      new cloudwatch.GraphWidget({
        title: 'Pending Jobs',
        left: [queueDepthMetric],
      }),
      new cloudwatch.GraphWidget({
        title: 'Running Workers',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ECS',
            metricName: 'RunningTaskCount',
            dimensionsMap: {
              ServiceName: service.serviceName,
            },
            statistic: 'Average',
          }),
        ],
      }),
    ],
    [
      new cloudwatch.GraphWidget({
        title: 'Jobs per Worker',
        left: [
          new cloudwatch.MathExpression({
            expression: 'm1 / m2',
            usingMetrics: {
              m1: queueDepthMetric,
              m2: runningWorkersMetric,
            },
          }),
        ],
      }),
    ],
  ],
});
```

**CloudWatch Alarms:**
```typescript
// Alert when queue depth exceeds threshold
new cloudwatch.Alarm(this, 'HighQueueDepth', {
  metric: queueDepthMetric,
  threshold: 100,
  evaluationPeriods: 2,
  alarmDescription: 'Queue depth too high - consider increasing max workers',
  actionsEnabled: true,
  alarmActions: [snsTopicArn], // Send to Slack/PagerDuty
});

// Alert when workers at max capacity
new cloudwatch.Alarm(this, 'MaxCapacityReached', {
  metric: runningWorkersMetric,
  threshold: 50,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  evaluationPeriods: 1,
  alarmDescription: 'Workers at max capacity - queue may be backing up',
});
```

### Tuning the Target Value

**Start conservative, tune based on observation:**

| Target Value | Behavior | Use Case |
|--------------|----------|----------|
| **3 jobs/worker** | Aggressive scaling, more workers | Low latency critical, expensive jobs |
| **5 jobs/worker** | Balanced (recommended for MVP) | General use, good cost/performance |
| **10 jobs/worker** | Conservative scaling, fewer workers | Cost-sensitive, fast jobs |
| **20 jobs/worker** | Minimal scaling | Very fast jobs (<5s), high cost pressure |

**Adjustment Process:**
1. Start with target = 5
2. Monitor average job execution time
3. If jobs queue for >30 seconds: decrease target (more workers)
4. If workers are idle often: increase target (fewer workers)
5. Iterate based on P95 latency and cost

### Comparison: Target Tracking vs Step Scaling

| Aspect | Target Tracking | Step Scaling |
|--------|----------------|--------------|
| **Complexity** | Simple, single target value | Complex, multiple thresholds |
| **Configuration** | 3 lines of code | 10+ lines of code |
| **Tuning** | Adjust one number | Adjust multiple thresholds |
| **Behavior** | Smooth, proportional scaling | Stepped, threshold-based |
| **Best For** | MVP, general use | Production, fine control |

**Recommendation:** Start with **Target Tracking** for MVP, upgrade to Step Scaling only if you need:
- Different scale-up rates at different queue depths
- Asymmetric scale-up/scale-down behavior
- Integration with multiple metrics

## Open Questions

1. **OpenClaw Licensing**: What's the license? Can we fork and modify? (Likely MIT/Apache 2.0)
2. **Job Priority**: FIFO (current) or priority-based queue? (e.g., paid users jump the queue)
3. **Failure Handling**: Retry failed jobs? How many times? (Proposal: 3 retries with exponential backoff)
4. **Filesystem Sync**: Full upload/download or delta sync? (Start with full, optimize later)
5. **Browser Session**: One browser instance per worker (reused across jobs) or per job? (Proposal: per worker for perf)
6. **Worker Timeout**: Should workers auto-terminate after N jobs to prevent memory leaks? (Proposal: yes, after 1 hour or 20 jobs)
7. **Job Preemption**: Should high-priority jobs be able to preempt low-priority ones? (Future consideration)
8. **Target Value**: Start with 5 jobs/worker, tune based on observed latency and cost

## Next Steps

1. Clone OpenClaw repository and explore codebase structure
2. Test OpenClaw locally to understand capabilities
3. Identify specific modules for browser automation
4. Draft technical extraction plan
5. Prototype basic polling container with S3 integration

---

*This is a living document. Update as we make architectural decisions.*
