# Agent Onboarding Prompt

Copy-paste everything below the line into Antigravity or any coding agent.

---

## Step 1: Clone and Read

Clone the repo and read every file before doing anything:

```
git clone https://github.com/ZHANGV25/EasyClaw.git
cd EasyClaw
```

Read all files in this order:
1. `PRODUCT_PLAN.md` — full product plan, architecture, tech stack, MVP phases
2. `ANTIGRAVITY_PROMPT.md` — detailed project context, coding guidelines, structure
3. `YC_STRATEGY.md` — business context (read for understanding, not for coding)
4. `REVIEWS.md` — how code reviews work
5. `AGENT_ONBOARD.md` — this file

## Step 2: Understand What We're Building

**EasyClaw** is a consumer SaaS that wraps OpenClaw (open-source AI assistant framework) into a managed, containerized experience. Non-technical people sign up, get a private AI personal assistant, and talk to it via web chat and Telegram. No servers, no API keys, no terminal.

**Key decisions already made:**
- AWS (ECS/Fargate) for container orchestration
- Next.js + Tailwind frontend
- Telegram as first messaging channel
- Stripe usage-based billing (Vercel model — free tier + pay for what you use)
- PostgreSQL for data
- One isolated OpenClaw container per user

## Step 3: Project Structure

When creating files, follow this monorepo structure:

```
EasyClaw/
├── apps/
│   ├── web/                 # Next.js frontend (landing, auth, chat, dashboard, billing)
│   └── api/                 # Backend API (container mgmt, auth, billing, Telegram webhook)
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── db/                  # Database schema, migrations, queries (Drizzle or Prisma)
│   └── config/              # Shared config, types, constants
├── infra/
│   ├── terraform/           # AWS infrastructure as code
│   ├── docker/              # OpenClaw container image + configs
│   └── scripts/             # Deployment, provisioning scripts
├── docs/                    # Product docs (existing files move here eventually)
├── .env.example             # Environment variable template
├── turbo.json               # Turborepo config
├── package.json             # Root package.json
└── README.md
```

## Step 4: Coding Guidelines

- **Move fast.** This is vibe-coded. Working > perfect. Ship it, iterate later.
- **TypeScript everywhere.** No plain JS.
- **Use existing libraries.** Don't reinvent auth, billing, UI components.
- **Mobile-first.** Every page must work on a phone. Most users will be on mobile.
- **Environment variables** for all secrets and config. Never hardcode.
- **Commit often** with clear messages. Push to main (no branch workflow for MVP).

## Step 5: Critical Design Constraints

1. **Multi-tenancy isolation.** Every database query, every API call, every container operation MUST be scoped to a user. Never leak data between users.
2. **Cost tracking at every layer.** Every AI API call must be metered and attributed to a user. This is how we bill.
3. **Container lifecycle.** Containers sleep after 30min idle, wake on message. Handle: creating, running, sleeping, waking, crashed, deleted.
4. **Free tier caps.** Free users get a starting credit balance. At $0, assistant pauses. No surprise bills ever.
5. **The user never sees "OpenClaw."** This is EasyClaw. They have an assistant, not a framework. No technical jargon in the UI.

## Step 6: Build Order

Follow this sequence. Don't skip ahead.

### Phase 1 — Foundation
1. Scaffold the monorepo (Turborepo + pnpm)
2. Set up Next.js app in `apps/web/` with Tailwind
3. Add auth (Clerk or Supabase Auth — pick whichever is faster)
4. Landing page — clean, simple, explains the product, sign-up CTA
5. Database schema: users, credits, containers, usage_logs
6. Stripe integration — create customer on signup, credit purchase flow

### Phase 2 — Core Product
7. Chat UI — streaming messages, mobile responsive, message history
8. Backend API — proxy messages between web UI and user's OpenClaw container
9. Container provisioning — API to spin up/down ECS Fargate tasks per user
10. Onboarding flow — name, timezone, what they need help with → populates OpenClaw config files (SOUL.md, USER.md)
11. Usage tracking — count tokens per message, deduct credits

### Phase 3 — Messaging + Polish
12. Telegram bot — webhook receives messages, routes to user's container, sends replies back
13. Container health monitoring — detect crashes, auto-restart
14. Admin dashboard — user list, container status, revenue, costs
15. Error handling everywhere — container down, credits exhausted, API failures

## Step 7: After Each Feature

After completing a feature:
1. Commit and push to `main`
2. Note what you built and any open issues
3. The code will be audited separately — don't worry about perfection, just make it work

## Long-Term Vision (context only, don't build this now)

EasyClaw is phase 1 of a larger play. The eventual goal is an agent-discoverable business directory — a protocol that lets AI agents find and interact with local businesses (book appointments, get quotes, etc.). EasyClaw is the product that surfaces the need for that infrastructure. For now, just build the assistant product.
