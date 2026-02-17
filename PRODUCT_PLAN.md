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
Container Orchestration Layer
    ↓
User's Isolated OpenClaw Container (1 per user)
    ↓
AI Provider (Anthropic / OpenAI / Gemini — abstracted)
```

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

### 3b. Container Provisioning
- On signup → spin up an isolated OpenClaw container for the user
- Pre-configured with SOUL.md, USER.md, AGENTS.md (populated from onboarding)
- Auto-manages API keys (user doesn't see them)
- Health monitoring — restart crashed containers

### 3c. Chat Interface
- Web-based chat UI (Next.js)
- Mobile responsive (this IS the mobile app for v1)
- Real-time message streaming
- File/image upload support
- Message history (persisted)

### 3d. One Messaging Channel
- Pick ONE: Telegram or WhatsApp
- Recommendation: **Telegram** (easier API, free, no business verification)
- User connects their Telegram → messages route to their container
- Two-way: they message the bot, bot replies

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
  - Markup on actual API + compute costs (aim for 30-50% margin)
  - Free tier: small starting credit balance to hook users
  - Clear usage dashboard so no bill shock
  - Auto-pause at $0 balance (no surprise charges)
- Token usage tracking per container
- Compute time tracking (container uptime)

### 3g. Admin Dashboard
- User management
- Container health monitoring
- Usage metrics per user
- Cost tracking (your API spend vs revenue)

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
- **ECS Fargate** for container management — no servers to manage, pay per use
- **Sleep/wake containers** to save costs — spin down after 30min idle, wake on message
- **ECR** for container images
- **RDS** (PostgreSQL) for user data
- **S3** for file storage per user

---

## 5. Development Phases

### Phase 1 — Foundation (Weeks 1-2)
- [ ] Set up monorepo (frontend + backend + infra)
- [ ] Landing page with auth
- [ ] Basic database schema (users, subscriptions, containers)
- [ ] Stripe integration (subscription creation)
- [ ] Container provisioning proof-of-concept (manually spin up OpenClaw in a container)

### Phase 2 — Core Product (Weeks 3-4)
- [ ] Chat UI connected to user's OpenClaw container
- [ ] Automated container provisioning on signup
- [ ] Onboarding flow that configures the assistant
- [ ] Message history persistence
- [ ] Usage tracking and rate limiting

### Phase 3 — Messaging + Polish (Weeks 5-6)
- [ ] Telegram bot integration
- [ ] Container health monitoring + auto-restart
- [ ] Admin dashboard (basic)
- [ ] Error handling, edge cases, loading states
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

- **Cost management** — free tier abuse, need hard caps and fraud detection
- **Container cold starts** — sleeping containers to save money vs wake-up latency
- **Scaling** — 1 container per user gets expensive fast; need aggressive sleep/wake
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
