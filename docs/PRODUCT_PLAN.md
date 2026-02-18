# Product Plan — OpenClaw Consumer Wrapper

**Working Name:** TBD (need a name)
**Founders:** Victor + cofounder
**Vision:** Give every person a private, always-on AI personal assistant — no technical setup required.

---

## 1. What We're Building

A platform that wraps OpenClaw into a managed, containerized experience. Users sign up, get an assistant, and talk to it from their phone. No EC2, no API keys, no terminal.

---

## 2. Architecture Overview

```
User (phone/web)
    ↓
Chat Interface (web app + mobile-friendly)
    ↓
Messaging Bridge (WhatsApp / Telegram / SMS)
    ↓
Backend API (creates job in DB)
    ↓
PostgreSQL jobs table (polling queue)
    ↓
Worker Pool (ECS Fargate — scales with queue depth)
    ├─ Worker 1 ─→ Polls for jobs ─→ Claims job
    ├─ Worker 2 ─→ Fetches user data from SQL & S3
    └─ Worker N ─→ Executes with OpenClaw ─→ Returns result
    ↓
AI Provider (Anthropic / OpenAI / Gemini — abstracted)
```

**Key Difference:** NOT one container per user. Instead, a **shared worker pool** that scales dynamically. Each worker can handle any job for any user by fetching their context from the database and S3.

### Infrastructure Decisions
- **Hosting:** AWS (ECS/Fargate for containers)
- **Messaging:** Telegram first, WhatsApp later
- **Billing:** Stripe (usage-based, Vercel-style)
- **Auth:** TBD (Clerk or Supabase Auth)

---

## 3. MVP Features (v0.1)

### 3a. Landing Page + Auth
- Marketing page explaining the product
- Sign up / log in (email + Google OAuth)
- Onboarding flow: name, timezone, "what do you need help with?"

### 3b. Worker Pool Management
- On signup → user record created in database (no dedicated container)
- Workers are generic and shared across all users
- User context (preferences, history) stored in PostgreSQL
- User filesystem (if any) stored in S3 (state_snapshots table)
- Auto-scaling: workers scale with job queue depth (min 1, max 50)
- Health monitoring — restart crashed workers automatically (ECS)

### 3c. Chat Interface
- Web-based chat UI (Next.js)
- Mobile responsive (this IS the mobile app for v1)
- Real-time message streaming (via WebSocket or SSE)
- File/image upload support (uploaded to S3, referenced in job payload)
- Message history (persisted in `messages` table)
- Job status indicator (pending/running/completed)

### 3d. One Messaging Channel
- Pick ONE: Telegram or WhatsApp
- Recommendation: **Telegram** (easier API, free, no business verification)
- User connects their Telegram → messages create jobs in the queue
- Two-way: they message the bot, worker processes job, bot replies

### 3e. Core Assistant Capabilities (comes free with OpenClaw)
- Reminders and scheduled tasks
- Web research
- Writing and drafting
- Memory across sessions
- General Q&A

### 3f. Billing
- Stripe integration
- **Usage-based pricing** (Vercel model):
  - Credits system — user buys/tops up credits
  - Each AI message costs X credits based on model used
  - Markup on actual API costs (aim for 30-50% margin)
  - Free tier: small starting credit balance to hook users
  - Clear usage dashboard so no bill shock
  - Auto-pause at $0 balance (no surprise charges)
- Token usage tracking per job (logged in `transactions` table)
- Cost calculated from AI API usage (tokens in/out, model type)
- Compute cost abstracted (amortized across all users via worker pool)

### 3g. Admin Dashboard
- User management (active users, credit balances)
- Worker pool health monitoring (active workers, queue depth, job completion rate)
- Usage metrics per user (messages sent, tokens used, credits spent)
- Cost tracking (API spend vs revenue, per-user profitability)
- Job queue stats (pending, running, completed, failed)

---

## 4. Tech Stack (Proposed)

| Layer | Tech | Reason |
|-------|------|--------|
| Frontend | Next.js + Tailwind | Fast, SSR, mobile-friendly |
| Auth | Clerk or Supabase Auth | Quick to implement |
| Backend API | Next.js API routes or separate Node/Express | Keeps it simple |
| Database | PostgreSQL (Supabase or managed) | Users, billing, usage logs |
| Container Orchestration | AWS ECS/Fargate | Scalable, pay-per-use containers |
| Messaging | Telegram Bot API | Free, easy, well-documented |
| Billing | Stripe | Industry standard |
| Monitoring | Uptime + container health checks | Basic for MVP |

### AWS Strategy
- **ECS Fargate** for worker pool — no servers to manage, pay per use
- **Auto-scaling** based on job queue depth (scale up when queue grows, scale down when idle)
- **Min 1 worker** always running for fast response (no cold starts)
- **Max 50 workers** (cost cap, can increase later)
- **ECR** for worker container images
- **RDS** (PostgreSQL) for user data, jobs queue, usage logs
- **S3** for user filesystems (state_snapshots)

---

## 5. Development Phases

### Phase 1 — Foundation (Weeks 1-2)
- [ ] Set up monorepo (frontend + backend + worker)
- [ ] Landing page with auth (Clerk)
- [ ] Database schema (users, conversations, messages, jobs, state_snapshots, transactions)
- [ ] Stripe integration (credits purchase)
- [ ] Worker proof-of-concept (poll jobs table, claim job, echo result)

### Phase 2 — Core Product (Weeks 3-4)
- [ ] Chat UI that creates jobs and polls for results
- [ ] Worker job execution (fetch context from DB/S3, run OpenClaw agent)
- [ ] Onboarding flow that sets user preferences in DB
- [ ] Message history persistence (messages table)
- [ ] Usage tracking (transactions table) and rate limiting (check credits_balance)

### Phase 3 — Messaging + Polish (Weeks 5-6)
- [ ] Telegram bot integration (creates jobs on message)
- [ ] Worker pool health monitoring (CloudWatch)
- [ ] Admin dashboard (user stats, queue depth, worker metrics)
- [ ] Error handling, job retries, edge cases
- [ ] Mobile responsiveness polish

### Phase 4 — Launch Prep (Week 7-8)
- [ ] Beta testing with 10-20 users
- [ ] Billing enforcement (free tier limits)
- [ ] Documentation / help center
- [ ] Analytics (Mixpanel/PostHog)
- [ ] Launch on Product Hunt / HN / Twitter

---

## 6. Open Questions

1. **Product name?**
2. **Who handles what?** Victor vs cofounder — frontend/backend/infra split?
3. **Domain?**
4. **Do you want a custom chat UI or embed an existing one?**

---

## 7. Risks

- **Cost management** — free tier abuse, need hard caps (credit limits) and fraud detection
- **Worker scaling** — queue can grow faster than we can scale workers (mitigate with max queue depth alerting)
- **Job timeouts** — long-running jobs can tie up workers (mitigate with 10-minute timeout)
- **Database bottleneck** — all workers polling same jobs table (mitigate with indexed queries, connection pooling)
- **S3 costs** — frequent filesystem uploads can get expensive (mitigate with delta sync later)
- **Competition** — OpenAI, Google, etc. could ship this themselves
- **Free tier economics** — need to nail the free balance so users convert but you don't bleed money

---

## 8. What Success Looks Like (3 months post-launch)

- 500+ active users
- <5% churn/month
- Unit economics positive (revenue per user > API + infra cost per user)
- Users sending 5+ messages/day average
- At least one "viral" use case people share

---

*This is the starting plan. Review it, tear it apart, and tell me what to change.*
