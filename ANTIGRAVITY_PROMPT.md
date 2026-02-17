# Master Project Prompt — Antigravity

Copy-paste this into Antigravity when starting a new session or onboarding an agent.

---

## Prompt

You are building a consumer SaaS product — a managed wrapper around OpenClaw (an open-source AI personal assistant framework). The goal is to let non-technical, everyday people have a private, always-on AI personal assistant without any setup.

### What OpenClaw Is
OpenClaw is an open-source AI assistant that runs on a server. It supports:
- Multi-channel messaging (Telegram, WhatsApp, Discord, SMS, etc.)
- Persistent memory across sessions (file-based: SOUL.md, USER.md, MEMORY.md, daily notes)
- Scheduled tasks and reminders (cron)
- Web search and research
- Browser automation (experimental)
- Sub-agent spawning for parallel tasks
- Configurable AI models (Anthropic, OpenAI, Gemini, etc.)

Docs: https://docs.openclaw.ai | Source: https://github.com/openclaw/openclaw

### What We're Building
A platform where:
1. User signs up on our web app
2. We spin up an isolated OpenClaw container (AWS ECS/Fargate) per user
3. User talks to their assistant via web chat + Telegram
4. Usage-based billing (Vercel model) — free tier included
5. The assistant remembers them, helps with everyday tasks, and runs 24/7

### Architecture
```
User (web/Telegram)
    ↓
Our Web App (Next.js + Tailwind)
    ↓
API Layer (Next.js API routes or Express)
    ↓
Container Orchestration (AWS ECS/Fargate)
    ↓
User's Isolated OpenClaw Container
    ↓
AI Provider APIs (Anthropic/OpenAI/Gemini)
```

### Tech Stack
- **Frontend:** Next.js + Tailwind CSS
- **Auth:** Clerk or Supabase Auth
- **Database:** PostgreSQL (Supabase or AWS RDS)
- **Containers:** AWS ECS/Fargate + ECR
- **Messaging:** Telegram Bot API
- **Billing:** Stripe (usage-based credits)
- **Monitoring:** Basic health checks + uptime

### Key Product Decisions
- **Usage-based pricing** like Vercel — users buy/top up credits, each AI interaction costs credits based on model. Free tier with starting balance.
- **One container per user** — full isolation, privacy-first
- **Containers sleep after inactivity** — wake on incoming message to save costs
- **Telegram first** — WhatsApp later (requires business verification)
- **Onboarding flow** populates the assistant's memory (name, timezone, preferences)

### Project Structure
```
/
├── apps/
│   ├── web/                 # Next.js frontend (landing, chat, dashboard, billing)
│   └── api/                 # Backend API (container mgmt, auth, billing, Telegram webhook)
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── db/                  # Database schema, migrations, queries
│   └── config/              # Shared config, types, constants
├── infra/
│   ├── terraform/           # AWS infrastructure as code
│   ├── docker/              # OpenClaw container image + configs
│   └── scripts/             # Deployment, provisioning scripts
├── docs/                    # Internal documentation
└── README.md
```

### MVP Phases
**Phase 1 (Foundation):** Monorepo setup, landing page, auth, DB schema, Stripe, container POC
**Phase 2 (Core):** Chat UI, auto container provisioning, onboarding, usage tracking
**Phase 3 (Messaging):** Telegram integration, health monitoring, admin dashboard
**Phase 4 (Launch):** Beta testing, billing enforcement, analytics, launch

### Coding Guidelines
- This is a vibe-coded project — move fast, ship fast, refactor later
- Prioritize working features over perfect architecture
- Use existing libraries/templates whenever possible (don't reinvent)
- Keep components small and files focused
- TypeScript everywhere
- Environment variables for all secrets/config
- Every feature should work on mobile (responsive-first)

### When Building, Always Consider
1. **Multi-tenancy** — everything is scoped to a user, never leak data between users
2. **Cost awareness** — track and limit API/compute usage at every layer
3. **Container lifecycle** — spin up, sleep, wake, kill. Handle all states gracefully
4. **Error states** — containers crash, APIs fail, credits run out. Handle it all.
5. **Free tier abuse** — rate limiting, fraud detection, hard caps

### Current Status
Starting from scratch. Begin with Phase 1.

---

*Reference PRODUCT_PLAN.md for the full detailed plan.*
