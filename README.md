# EasyClaw

Your private, always-on AI personal assistant. No setup required.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
EasyClaw/
├── apps/web/          # Next.js frontend (landing page, chat UI)
├── packages/db/       # Drizzle ORM schema & database client
├── packages/config/   # Shared types, constants
├── packages/ui/       # Shared UI components (coming soon)
├── infra/             # Terraform & Docker (coming soon)
└── docs/              # Product docs, strategy
```

## Tech Stack

- **Frontend:** Next.js 14 + Tailwind CSS
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Clerk
- **Billing:** Stripe (coming)
- **Containers:** AWS ECS/Fargate (coming)
- **Messaging:** Telegram Bot API (coming)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```
