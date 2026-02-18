# EasyClaw Workers

ECS Fargate workers that execute jobs from the PostgreSQL queue with browser automation capabilities.

## Architecture

- **Polling System**: Workers continuously poll the `jobs` table using `FOR UPDATE SKIP LOCKED` for atomic job claiming
- **Browser Automation**: Integrated Playwright for research tasks and web automation
- **Filesystem Management**: Downloads/uploads user state from S3 for persistent workspaces
- **Auto-scaling**: Scales 1-50 workers based on pending jobs (target: 5 jobs/worker)

## Job Types

### CHAT
Conversational AI tasks with context from previous messages.

### RESEARCH
Web research using browser automation:
1. Performs Google search
2. Visits top result
3. Captures page snapshot
4. Returns structured results

### ECHO
Simple echo task for testing (no browser required).

## Browser Integration

Workers include a full Chromium browser via Playwright for web automation:

```typescript
const browser = new BrowserManager();
await browser.initialize();

// Search
const results = await browser.search("query");

// Navigate
await browser.navigate("https://example.com");

// Snapshot
const snapshot = await browser.snapshot();

await browser.close();
```

## Container Details

**Base**: `node:22-alpine`

**Includes**:
- Chromium browser
- Playwright Core
- AWS SDK (S3, CloudWatch)
- PostgreSQL client

**Resource Requirements**:
- CPU: 1 vCPU
- Memory: 2 GB RAM
- Ephemeral Storage: 20 GB (for browser cache)

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:5432/easyclaw
AWS_REGION=us-east-1
S3_BUCKET=easyclaw-state
WORKER_ID=worker-xyz
POLL_INTERVAL_MS=1000
```

## Local Development

```bash
# Install dependencies
npm install

# Run locally (without Docker)
npm run dev

# Build TypeScript
npm run build

# Run built version
npm start
```

## Docker Build

```bash
# Build image
docker build -t easyclaw-worker .

# Run locally
docker run -it --rm \
  -e DATABASE_URL=postgresql://... \
  -e AWS_REGION=us-east-1 \
  -e S3_BUCKET=easyclaw-state \
  easyclaw-worker
```

## Testing Browser Automation

```bash
# Create a research job via API
curl -X POST https://api.easyclaw.com/jobs \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -d '{
    "type": "RESEARCH",
    "payload": {
      "query": "Claude AI capabilities"
    }
  }'

# Worker will:
# 1. Claim the job
# 2. Launch Chromium
# 3. Perform Google search
# 4. Visit top result
# 5. Extract page content
# 6. Return structured results
```

## Graceful Shutdown

Workers handle `SIGTERM` gracefully:
1. Stop polling for new jobs
2. Complete current job execution
3. Close browser instances
4. Exit cleanly

Shutdown timeout: 120 seconds (configured in ECS task definition)

## Monitoring

Workers log to CloudWatch:
- `/ecs/easyclaw-workers`

Key log events:
- `Starting worker` - Worker initialization
- `Claimed job` - Job claimed from queue
- `[Browser] Initializing` - Browser startup
- `[Browser] Searching for` - Search query execution
- `Job completed` - Successful execution
- `Execution failed` - Error details

## Troubleshooting

### Browser fails to launch

Check container logs for Chromium errors:
```bash
aws logs tail /ecs/easyclaw-workers --follow --filter-pattern "Browser"
```

Common issues:
- Memory limit too low (increase to 2GB minimum)
- Missing system dependencies (already in Dockerfile)
- Chromium sandbox issues (using `--no-sandbox`)

### Jobs timing out

Default timeout: 10 minutes per job

Increase if needed in `infra/lib/worker-stack.ts`:
```typescript
taskDefinition.addContainer('worker', {
  command: ['node', 'dist/index.js'],
  stopTimeout: cdk.Duration.seconds(300), // Increase if needed
});
```

### High memory usage

Chromium can use 500MB-1GB per instance. Workers:
- Launch browser per job (not persistent)
- Close browser after completion
- Clean up /tmp/workspace after each job

Monitor memory:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=easyclaw-workers
```
