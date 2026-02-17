# Backend Interface & Architecture

> **Status**: DRAFT (v2.1 - Worker Pool Revision)
> **Goal**: Define the contract between Frontend, Backend (AWS CDK), and Worker Containers.

This document outlines the API endpoints, database schema, and infrastructure requirements for the real backend implementation.

---

## 1. Infrastructure (AWS CDK)

All infrastructure is defined and deployed via **AWS CDK (TypeScript)**.

*   **Compute**:
    *   **Backend API**: AWS Lambda (Node.js/Python) via API Gateway.
    *   **Worker Pool**: ECS Fargate Service (Auto-scaling based on `jobs` queue depth).
        *   **Strategy**: "Warm Pool" of generic workers.
        *   **Isolation**: Workers process **ONE** job and then exit (replaced by a fresh container) to ensure zero data leakage.
*   **Database**: AWS RDS (Postgres 16+). **Raw SQL** access only (no ORM).
*   **Storage**: AWS S3.
    *   `s3://easyclaw-user-data/{userId}/` (Persistent storage).
    *   `s3://easyclaw-state-snapshots/{jobId}.zip` (Worker state for pausable agents).
*   **LLM Provider**: AWS Bedrock.
    *   **Model**: `anthropic.claude-3-sonnet-20240229-v1:0` (Modular design to allow swaps).

---

## 2. Database Schema (Raw Postgres)

All tables must include `created_at` and `updated_at`.

### `users`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (matches Clerk ID). |
| `email` | `VARCHAR` | |
| `credits_balance` | `NUMERIC(10, 4)` | precise 4 decimal places. |
| `stripe_customer_id` | `VARCHAR` | |
| `meta` | `JSONB` | Settings, timezone, assistant name. |

### `conversations`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | PK. |
| `user_id` | `UUID` | FK -> users.id. |
| `title` | `VARCHAR` | |
| `state` | `JSONB` | Summary context/metadata. |

### `messages`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | PK. |
| `conversation_id` | `UUID` | FK -> conversations.id. |
| `role` | `VARCHAR` | 'user' or 'assistant'. |
| `content` | `TEXT` | |
| `tokens_usage` | `INTEGER` | For billing. |

### `jobs` (The Polling Queue)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | PK. |
| `user_id` | `UUID` | FK -> users.id. |
| `status` | `VARCHAR` | 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'. |
| `type` | `VARCHAR` | 'CHAT', 'TASK', 'CRON'. |
| `input_payload` | `JSONB` | Data needed to start the job. |
| `result_payload` | `JSONB` | Final output. |
| `worker_id` | `VARCHAR` | AWS ECS Task ID (if running). |
| `locked_at` | `TIMESTAMP` | For race condition handling. |

### `state_snapshots`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | PK. |
| `job_id` | `UUID` | FK -> jobs.id. |
| `s3_key` | `VARCHAR` | Path to the zip file. |
| `version` | `INTEGER` | Incremental version. |

---

## 3. LLM Abstraction (Modular)

The backend MUST implement a modular `LLMClient` interface.

```typescript
interface LLMHeader {
  provider: "bedrock" | "openai" | "anthropic";
  modelId: string;
}

interface LLMRequest {
  systemPrompt: string;
  messages: Message[];
  tools?: ToolDefinition[];
}

// Current Implementation: AWS Bedrock Adapter
class BedrockClient implements LLMClient {
  // Uses @aws-sdk/client-bedrock-runtime
  // Model: anthropic.claude-3-sonnet-20240229-v1:0
}
```

---

## 4. Worker & Job Protocol

The system uses a **Pull-Based Worker Pool**. Any idle worker can pick up any job.

### Race Condition & Locking Logic
To prevent multiple workers from grabbing the same job:
1.  **Transaction**: `BEGIN;`
2.  **Lock**: `SELECT * FROM jobs WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED LIMIT 1;`
3.  **Claim**: `UPDATE jobs SET status = 'RUNNING', locked_at = NOW(), worker_id = $1 WHERE id = $2;`
4.  **Commit**: `COMMIT;`

### Worker Lifecycle (The "One-Shot" Loop)
1.  **Wake Up**: Worker container starts (managed by ECS Auto Scaling).
2.  **Poll**: Call `GET /api/internal/jobs/poll`.
    *   *If no jobs*: Sleep X seconds, retry.
3.  **Download Context**:
    *   User Data: Download from `s3://easyclaw-user-data/{userId}/`.
    *   Job State: If resuming, download `s3://easyclaw-state-snapshots/{jobId}.zip`.
4.  **Execute**: Run the LLM loop until blocked (waiting for user input) or finished.
5.  **Persist State (Checkpoint)**:
    *   Zip `/app/state`.
    *   Upload to S3.
    *   Call `POST /api/internal/jobs/checkpoint`.
6.  **Complete**: Call `POST /api/internal/jobs/complete`.
7.  **Die**: Container exits (`process.exit(0)`). ECS replaces it with a fresh, clean container.

---

## 5. API Endpoints

### User Facing (Frontend Consumer)
These mocks exist in `apps/web/src/api/...` and need real implementation.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chat` | Creates a row in `messages`, triggers a row in `jobs`. (Does NOT run LLM directly). Returns SSE stream by tailing the job events/logs. |
| `GET` | `/api/user` | Returns User + Credits + Current Job Status. |
| `POST` | `/api/telegram/connect` | Generates Deep Link. |

### Internal (Worker Consumer)
Protected by internal Vibe-Auth-Token.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/internal/jobs/poll` | See Race Condition Logic above. |
| `POST` | `/api/internal/jobs/update` | Updates status (e.g. "Thinking...", "calling tool X"). |
| `POST` | `/api/internal/state/upload` | Uploads state zip (Presigned URL generation). |

---

## 6. Development Workflow (Local)

1.  **Database**: Run Postgres locally via Docker: `docker run -p 5432:5432 postgres:16`
2.  **Backend**: Run API server locally (connects to local DB, AWS Bedrock via AWS_PROFILE).
3.  **Worker**: Run `worker.ts` script locally. It polls `localhost:3000`.

---
