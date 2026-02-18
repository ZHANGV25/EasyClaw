# Phase 1: Foundation — Walkthrough

## What Was Built

The EasyClaw monorepo has been scaffolded with all foundational pieces in place.

### Architecture

```mermaid
graph TB
    subgraph "Monorepo (Turborepo + pnpm)"
        subgraph "apps/web — Next.js 16"
            LP["/ — Landing Page"]
            CH["/chat — Chat UI"]
            API["/api/* — API Routes (future)"]
        end
        subgraph "packages/"
            CFG["config — Types & Constants"]
            UI["ui — Shared Components (stub)"]
        end
        subgraph "backend/"
            SCHEMA["SQL Schema"]
            ROUTES["API Routes"]
        end
    end

    subgraph "External Services (not yet connected)"
        PG["PostgreSQL"]
        CL["Clerk Auth"]
        ST["Stripe"]
        AWS["AWS ECS/Fargate"]
    end

    LP --> CH
    CH --> API
    API --> ROUTES
    ROUTES --> PG
    LP --> CL
    API --> AWS
```

### Directory Structure

```
EasyClaw/
├── apps/web/                    # Next.js 16 + Tailwind CSS
│   └── src/app/
│       ├── layout.tsx           # Root layout (Inter font, dark mode)
│       ├── page.tsx             # Landing page (hero + features)
│       ├── chat/page.tsx        # Chat UI (Vercel-style)
│       └── globals.css          # Design system (custom properties)
├── backend/                     # Backend API
│   └── src/
│       └── util/schema.sql      # PostgreSQL schema (raw SQL)
├── packages/
│   └── config/
│       └── src/index.ts         # Shared types (ChatMessage, UserProfile)
├── .env.example                 # All env vars documented
├── .gitignore
├── package.json                 # Root (turbo + prettier)
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### Database Schema

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `users` | `id`, `email`, `credits_balance` | User accounts with Clerk ID |
| `conversations` | `user_id`, `title`, `state` | Conversation context and history |
| `messages` | `conversation_id`, `role`, `content` | Individual chat messages |
| `jobs` | `user_id`, `status`, `type`, `worker_id` | Job queue for worker pool |
| `state_snapshots` | `job_id`, `s3_key`, `version` | User filesystem versions in S3 |
| `transactions` | `user_id`, `amount`, `type` | Credit purchases and usage tracking |

---

## Verification Results

| Check | Status |
|-------|--------|
| `pnpm install` | ✅ All dependencies resolved |
| `pnpm --filter web dev` | ✅ Next.js 16.1.6 started, ready in 1.3s |
| Landing page (`/`) | ✅ Compiled (needs manual visual check) |
| Chat page (`/chat`) | ✅ Compiled (needs manual visual check) |

---

## Test Checklist (For You)

Run `pnpm dev` from the project root, then verify:

### Landing Page (`http://localhost:3000`)
- [ ] Page loads with dark theme
- [ ] "EasyClaw" logo + header visible
- [ ] Hero text: "Your Private AI Assistant" with gradient
- [ ] "Start Chatting — It's Free" button glows
- [ ] 6 feature cards render below the hero
- [ ] "Try It Free" button navigates to `/chat`
- [ ] Footer shows "© 2026 EasyClaw" and "Built at CMU 🎓"
- [ ] Mobile responsive (resize browser to phone width)

### Chat Page (`http://localhost:3000/chat`)
- [ ] Welcome message from assistant appears
- [ ] "Online" indicator visible in header
- [ ] "$1.00 credits" badge visible
- [ ] Type a message and press Enter → message appears as user bubble
- [ ] After 1.5s → mock assistant response appears
- [ ] Typing indicator (3 dots) shows during the 1.5s wait
- [ ] Timestamps visible on messages
- [ ] Messages auto-scroll to bottom
- [ ] Shift+Enter creates a newline (doesn't send)
- [ ] Send button is disabled when input is empty

### Project Structure
- [ ] `pnpm install` runs without errors
- [ ] `pnpm dev` starts the Next.js dev server
- [ ] No TypeScript errors in the terminal
