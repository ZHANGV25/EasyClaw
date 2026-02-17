# Backend Integration Guide

This document outlines the API endpoints that are currently mocked in the Frontend and need to be implemented by the Backend service.

## Summary of Changes (Frontend Session)
- **Agent Activity Blocks**: Frontend now parses and visualizes `activity` events (thoughts, tool calls) from the chat stream.
- **Dashboard**: Fully implemented UI for credits, usage history, and assistant status.
- **Settings**: UI for user profile, assistant configuration, and a secure vault for API keys.
- **Telegram**: Connect flow with QR code generation and connection polling.
- **Mock APIs**: All of the above are powered by Next.js Route Handlers (`apps/web/src/app/api/...`) which mock the backend logic.

---

## API Endpoints to Implement

### Authentication
- **Current**: Clerk is used on the frontend.
- **Backend**: Must validate Clerk session tokens in the `Authorization` header.

### 1. Chat & Agent (`/api/chat`)
- **`POST /api/chat`**
    - **Input**: `{ message: string, conversationId?: string }`
    - **Output**: SSE Stream (Server-Sent Events)
    - **Events**:
        - `token`: Text content.
        - `activity`: Agent thought/tool call (see `AgentStep` type).
        - `artifact`: File creation/update.
        - `done`: Stream completion + usage stats.

### 2. User & Settings (`/api/user`, `/api/settings`)
- **`GET /api/user`**
    - **Output**: User profile, credits balance, assistant config, container status.
- **`POST /api/settings`** (or `PATCH /api/user`)
    - **Input**: `{ name, timezone, assistant: { name, interests } }`
    - **Output**: Updated user object.

### 3. Usage & Credits (`/api/usage`, `/api/credits`)
- **`GET /api/usage`**
    - **Output**: Daily usage stats (cost, message count) for the last 7+ days.
- **`GET /api/credits/history`**
    - **Output**: List of transactions (purchases, usage deductions, grants).
- **`POST /api/credits/purchase`**
    - **Input**: `{ amountUsd: number }`
    - **Output**: `{ checkoutUrl: string }` (Stripe Checkout session URL).

### 4. Secure Vault (`/api/vault`)
- **`GET /api/vault`**
    - **Output**: List of stored secrets (metadata only, mask the actual values).
- **`POST /api/vault`**
    - **Input**: `{ key: string, value: string }`
    - **Output**: Created secret metadata.
- **`DELETE /api/vault?id=...`**
    - **Output**: Success status.

### 5. Telegram (`/api/telegram`)
- **`POST /api/telegram/connect`**
    - **Output**: `{ botUrl: string }` (Unique deep link to start the bot).
- **`GET /api/telegram/connect`**
    - **Output**: `{ connected: boolean }` (Polls to see if user has started the bot).

---

## Next Steps
1.  **Infrastructure**: Provision the backend service (Node.js/Python) and Database (Postgres).
2.  **Container Orchestration**: Implement the logic to spin up/down user agent containers.
3.  **API Migration**: Replace the mock Next.js route handlers with proxies to the real backend service.
