# Work Split — Frontend (Victor) vs Backend (Partner)

> **Rule: Do not edit each other's files without asking.** If you need something from the other side, update the API contract below and tell the other person.

---

## File Ownership

### Frontend (Victor) — ONLY touch these:
```
apps/web/src/app/              # All pages and layouts
apps/web/src/components/       # UI components
apps/web/src/hooks/            # Custom React hooks
apps/web/src/lib/              # Frontend utilities (fetch wrappers, formatters)
apps/web/src/styles/           # Additional styles
apps/web/public/               # Static assets
packages/ui/                   # Shared UI component library
```

### Backend (Partner) — ONLY touch these:
```
apps/api/                      # All API routes and server logic
packages/db/                   # Database schema, migrations, queries
packages/config/               # Shared types and constants
infra/                         # Terraform, Docker, deployment scripts
```

### Shared (discuss before editing):
```
apps/web/src/app/api/          # Next.js API routes (if using instead of apps/api/)
packages/config/src/index.ts   # Types used by both sides
.env.example                   # Environment variables
docs/                          # Documentation
```

---

## API Contract

This is the source of truth. Both sides build to this spec. If you need a change, update this doc and notify the other person.

### Authentication
All endpoints require Clerk auth. Frontend sends the session token via `Authorization: Bearer <token>`. Backend validates with Clerk SDK.

---

### `POST /api/chat`
Send a message to the user's assistant. Returns a streaming response.

**Request:**
```json
{
  "message": "Help me find a dentist that takes Aetna"
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"type": "token", "content": "I'll"}
data: {"type": "token", "content": " help"}
data: {"type": "token", "content": " you"}
data: {"type": "done", "usage": {"tokensIn": 42, "tokensOut": 156, "costUsd": 0.003}}
```

**Error responses:**
```json
{"error": "NO_CREDITS", "message": "Your credit balance is $0.00. Please add credits to continue."}
{"error": "CONTAINER_STARTING", "message": "Your assistant is waking up. Please wait a moment."}
{"error": "CONTAINER_ERROR", "message": "Something went wrong. We're restarting your assistant."}
```

**Frontend behavior:**
- Stream tokens into chat bubble in real-time
- Show typing indicator until first token arrives
- On `done`, update credit balance from response
- On `NO_CREDITS`, show "Add Credits" modal
- On `CONTAINER_STARTING`, show "Waking up..." with spinner (poll until ready)

---

### `GET /api/user`
Get current user profile and status.

**Response:**
```json
{
  "id": "uuid",
  "name": "Victor",
  "email": "victor@example.com",
  "timezone": "America/New_York",
  "creditsBalance": 4.27,
  "container": {
    "status": "RUNNING",
    "lastActiveAt": "2026-02-17T03:00:00Z"
  },
  "createdAt": "2026-02-15T00:00:00Z"
}
```

---

### `POST /api/onboarding`
Called after signup to configure the user's assistant.

**Request:**
```json
{
  "name": "Victor",
  "timezone": "America/New_York",
  "interests": "startup founder, need help with research and scheduling",
  "assistantName": "Jarvis"
}
```

**Response:**
```json
{
  "success": true,
  "containerId": "uuid"
}
```

**What backend does:** Creates user record, spins up container, writes SOUL.md and USER.md to S3 with onboarding data.

---

### `POST /api/credits/purchase`
Initiate a credit purchase via Stripe.

**Request:**
```json
{
  "amountUsd": 10.00
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Frontend behavior:** Redirect to Stripe Checkout. Stripe redirects back to `/dashboard?payment=success`.

---

### `GET /api/credits/history`
Get credit transaction history.

**Response:**
```json
{
  "transactions": [
    {"id": "uuid", "type": "PURCHASE", "amount": 10.00, "createdAt": "2026-02-17T00:00:00Z"},
    {"id": "uuid", "type": "USAGE", "amount": -0.003, "model": "claude-sonnet-4", "createdAt": "2026-02-17T01:00:00Z"},
    {"id": "uuid", "type": "FREE_TIER", "amount": 5.00, "createdAt": "2026-02-15T00:00:00Z"}
  ],
  "balance": 14.997
}
```

---

### `GET /api/usage`
Get usage breakdown (for dashboard charts).

**Response:**
```json
{
  "today": {"messages": 12, "tokensIn": 4200, "tokensOut": 8100, "costUsd": 0.15},
  "thisWeek": {"messages": 45, "tokensIn": 18000, "tokensOut": 32000, "costUsd": 0.62},
  "byDay": [
    {"date": "2026-02-17", "messages": 12, "costUsd": 0.15},
    {"date": "2026-02-16", "messages": 33, "costUsd": 0.47}
  ],
  "byModel": [
    {"model": "claude-sonnet-4", "messages": 40, "costUsd": 0.42},
    {"model": "claude-haiku-3.5", "messages": 5, "costUsd": 0.01}
  ]
}
```

---

### `GET /api/chat/history`
Get previous messages.

**Request params:** `?limit=50&before=<message_id>`

**Response:**
```json
{
  "messages": [
    {"id": "uuid", "role": "user", "content": "Find me a dentist", "createdAt": "2026-02-17T01:00:00Z"},
    {"id": "uuid", "role": "assistant", "content": "I found 3 options...", "createdAt": "2026-02-17T01:00:05Z"}
  ],
  "hasMore": true
}
```

---

### `POST /api/telegram/connect`
Generate a Telegram bot connection link for the user.

**Response:**
```json
{
  "botUrl": "https://t.me/EasyClawBot?start=<user_token>",
  "connected": false
}
```

---

### `POST /api/settings`
Update user settings.

**Request:**
```json
{
  "name": "Victor",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{"success": true}
```

---

### `DELETE /api/account`
Delete account and all data.

**Response:**
```json
{"success": true}
```

**What backend does:** Kills container, deletes S3 data, deletes DB records, cancels Stripe customer.

---

## Build Order

### Sprint 1 (Week 1)

**Frontend:**
1. Auth pages (Clerk sign-in/sign-up)
2. Onboarding flow (multi-step form)
3. Landing page final polish
4. Chat UI hooked to `POST /api/chat` (use mock endpoint until backend ready)

**Backend:**
1. Sync DB schema with architecture docs (add `jobs`, `messages`, `user_secrets`)
2. Fix `real` → `numeric` for all money columns
3. Clerk webhook → create user in DB
4. Stub all API endpoints with mock data
5. `POST /api/onboarding` with real DB writes

### Sprint 2 (Week 2)

**Frontend:**
1. Dashboard page (credits, usage chart, container status)
2. Stripe Checkout flow (purchase credits)
3. Settings page
4. Chat history (infinite scroll with `GET /api/chat/history`)

**Backend:**
1. Container provisioning (ECS Fargate spin-up)
2. `POST /api/chat` with real container proxy + SSE streaming
3. Stripe integration (checkout session, webhook, credit top-up)
4. Usage metering (token counting, credit deduction)

### Sprint 3 (Week 3)

**Frontend:**
1. Telegram connect page
2. "Add Credits" modal on zero balance
3. Loading/error states everywhere
4. Mobile polish + PWA manifest

**Backend:**
1. Telegram bot webhook + message routing
2. Container sleep/wake logic
3. Health monitoring + auto-restart
4. S3 per-user file structure

---

## Rules of Engagement

1. **Don't block each other.** Backend stubs endpoints with mock data on day 1. Frontend builds against mocks.
2. **Types are shared.** If you add a new type, put it in `packages/config/src/index.ts`.
3. **API changes go through this doc.** Don't change an endpoint shape without updating the contract and telling the other person.
4. **Commit often, push often.** Both sides should be able to pull and see progress.
5. **If something is broken, say so.** Don't waste hours debugging a contract mismatch.
