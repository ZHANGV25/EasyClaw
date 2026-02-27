# EasyClaw — Ship-to-Production TODO

## Completed

### Phase 0: Foundation Fixes
- [x] Add Clerk JWT auth to `createJob.ts`, `getJob.ts`, `listJobs.ts`
- [x] Create `backend/src/util/auth.ts` (requireAuth, AuthError, unauthorizedResponse)
- [x] Remove TODO comments from CDK stack, wire Clerk env to all Lambdas
- [x] Fix RDS: `removalPolicy: RETAIN`, `deletionProtection: true`, 7-day backups
- [x] Fix S3 buckets: `removalPolicy: RETAIN`
- [x] Update `.env.example` with all required variables

### Phase 1: Wire Frontend to Real Backend
- [x] Add `IS_EXTERNAL` and `apiPatch` to `api.ts`
- [x] Create `useAuthToken` hook for client-side Clerk JWT
- [x] Update `useStreamChat.ts` to pass auth tokens
- [x] Update `ConversationsContext.tsx` — fix double-request bug, add auth tokens
- [x] Update `dashboard/page.tsx` to pass auth tokens
- [x] Update `AddCreditsModal.tsx` to pass auth tokens
- [x] Add mock route gating in `middleware.ts` (404 when `NEXT_PUBLIC_API_URL` set)
- [x] Create `serverApi.ts` for server-side authenticated API calls

### Phase 2: OpenClaw Worker Integration
- [x] Create `openclaw-adapter.ts` — sidecar bridging job queue to OpenClaw WebSocket
- [x] Create `Dockerfile.openclaw` using `coollabsio/openclaw:latest`
- [x] Add `COMPUTER_USE` job type to `types.ts`
- [x] Add `computer_use` and `search_web` tools to chat handler
- [x] Update `executor.ts` with COMPUTER_USE fallback
- [x] Update `worker-stack.ts`: 4 vCPU / 8 GB, warm pool of 2, Bedrock permissions

### Phase 3: Stripe Payments
- [x] Create `stripe.ts` handler (checkout + webhook)
- [x] Add Stripe routes to CDK: `/api/credits/purchase`, `/api/webhooks/stripe`
- [x] Add credit balance check + per-message deduction in `chat.ts`
- [x] Auto-create user with $5.00 free credits on first login (`user.ts`)
- [x] Configure Stripe webhook in dashboard

### Infrastructure
- [x] CDK bootstrap AWS account
- [x] Deploy `EasyClaw-Backend-Stack` (VPC, RDS, Lambdas, API Gateway, S3)
- [x] Run DB setup Lambda (tables created)
- [x] Create Amplify app with env vars and build spec
- [x] Deploy `EasyClaw-Worker-Stack` (ECS Fargate, auto-scaling) — deploying
- [x] Set `NEXT_PUBLIC_API_URL` to API Gateway URL
- [x] Configure Stripe webhook secret
- [x] Connect CodeCommit repo to Amplify (app `d24tfvdrfnje2s`, auto-builds on push)
- [ ] Redeploy backend with `STRIPE_WEBHOOK_SECRET` env var

---

## Next Up

### Phase 4: Backend for All Feature Pages [DONE]
> The frontend pages exist with mock data. Backend handlers are needed.

- [x] **Memory system**
  - [x] Add `memories` table to schema (user_id, category, content, source, status)
  - [x] Create `backend/src/handlers/memory.ts` (GET/POST/PUT/DELETE)
  - [x] Add `save_memory` and `recall_memory` tools to chat handler
  - [x] Wire `apps/web/src/app/memory/page.tsx` to real endpoints
- [x] **Reminders system**
  - [x] Add `reminders` table to schema
  - [x] Create `backend/src/handlers/reminders.ts` (CRUD)
  - [x] Add `create_reminder` tool to chat handler
  - [ ] Add EventBridge / scheduled Lambda for firing reminders
  - [x] Wire `apps/web/src/app/reminders/page.tsx` to real endpoints
- [x] **Activity feed**
  - [x] Create `backend/src/handlers/activity.ts` (GET — query jobs with results)
  - [x] Wire `apps/web/src/app/activity/page.tsx` to real endpoint
- [x] **Browser viewer**
  - [x] Create `backend/src/handlers/browser.ts` (GET status)
  - [x] Wire `apps/web/src/app/browser/page.tsx` to real endpoint
  - [ ] SSE streaming for live browser view (deferred)
- [x] Add new Lambdas + API routes to `backend-stack.ts`
- [x] Redeploy backend stack
- [x] Wire settings page to real API with auth tokens

### Phase 6: Onboarding & User Creation [DONE]
> Completes the signup-to-first-chat experience.

- [x] Implement real `POST /api/onboarding` (save preferences in users.meta)
- [x] Create Clerk webhook handler for `user.created` (auto-create DB row)
- [x] Wire settings page to `PATCH /api/user`
- [x] Add onboarding + clerk-webhook routes to CDK

### Phase 5: Telegram Integration [DONE]
> Multi-client support. Depends on stable backend.

- [x] Implement Telegram bot via grammY / Bot API
- [x] Create `backend/src/handlers/telegram-webhook.ts` (receives updates, routes to Bedrock)
- [x] Account linking: `/api/telegram/connect` generates one-time token, bot `/start` links user
- [x] Store Telegram↔EasyClaw user mapping in `users.meta` (telegram_id, telegram_username)
- [x] Wire `apps/web/src/app/telegram/page.tsx` to real endpoints with auth tokens
- [x] Add GET/DELETE to `/api/telegram/connect` for status checking and disconnecting
- [ ] Set TELEGRAM_BOT_TOKEN env var and register webhook URL with Telegram API

### Phase 7: Infrastructure Hardening [P2 — before public launch]
- [ ] Upgrade RDS to `t4g.small`, enable Multi-AZ
- [ ] Add RDS Proxy for Lambda connection pooling
- [ ] Add WAF on API Gateway (rate limiting)
- [ ] Enable API Gateway throttling
- [ ] Store all secrets in AWS Secrets Manager (not env vars)
- [ ] Fix N+1 query in `conversations.ts` (use JOIN)

### Phase 8: Testing & Polish [P2]
- [ ] E2E smoke test: signup → chat → see response
- [ ] E2E smoke test: Stripe checkout → credits appear
- [ ] E2E smoke test: Telegram message → response
- [ ] Error handling pass (proper HTTP codes, meaningful messages)
- [ ] Add CloudWatch alarms (Lambda errors, 5xx rate, job failures)

### Phase 9: CI/CD [P3]
- [ ] GitHub Actions: type-check + lint + build on push to `main`
- [ ] Auto-deploy backend via `cdk deploy` in CI
- [ ] Auto-deploy frontend via Amplify GitHub integration
- [ ] Preview environments on PR (stretch)

---

## Key URLs

| Resource | URL |
|----------|-----|
| API Gateway | `https://v2hk7dxl4g.execute-api.us-east-1.amazonaws.com/prod/` |
| Frontend (Amplify) | `https://main.d24tfvdrfnje2s.amplifyapp.com` |
| Stripe Dashboard | `https://dashboard.stripe.com/test/webhooks` |
| CloudWatch Workers | `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EasyClaw-Workers` |

## Key Files

| Purpose | Path |
|---------|------|
| Backend CDK stack | `backend/lib/backend-stack.ts` |
| Worker CDK stack | `infra/lib/worker-stack.ts` |
| Chat handler (tools) | `backend/src/handlers/chat.ts` |
| Auth utility | `backend/src/util/auth.ts` |
| API client | `apps/web/src/lib/api.ts` |
| DB schema | `backend/src/util/schema.sql` |
| OpenClaw adapter | `workers/src/openclaw-adapter.ts` |
| Stripe handler | `backend/src/handlers/stripe.ts` |
