# EasyClaw Design & Architecture

> **The Vision:** Give every person a private, always-on AI personal assistant — no technical setup required.

---

## 1. Product Overview

EasyClaw wraps the powerful OpenClaw engine into a managed, containerized cloud experience. Instead of requiring users to run local containers or manage EC2 instances, we provide a "personal cloud computer" that their AI agent controls.

### Core Philosophy
We transform **"Local System Access"** into **"Cloud Container Access"**. The user doesn't give the agent control of their *laptop*; they give the agent a *powerful cloud computer* that they can control and monitor from the web.

### Key Capabilities
1.  **The Eyes (Web Browsing):** Agent browses the web, reads pages, interacts with SaaS tools.
2.  **The Hands (Tool Execution):** Full system access (Terminal, filesystem) within a secure sandbox.
3.  **The Voice (Messaging):** Proactive messaging via WhatsApp/Telegram.
4.  **The Brain (Memory):** Persistent memory of user preferences and history.

---

## 2. Technical Architecture

### Infrastructure
- **Platform:** AWS ECS (Fargate) for scalable, serverless containers.
- **Worker Model:** **Shared Worker Pool**. We do NOT run one container per user 24/7.
- **Scaling:** Workers scale dynamically based on job queue depth (Queue-based Auto Scaling).
- **Database:** PostgreSQL for user data, job queues, and vector memory (`pgvector`).
- **Filesystem:** S3-synced volumes for persistent user workspaces.

### Data Flow
1.  **Ingress:** User message (Telegram/Web) -> API -> `messages` table.
2.  **Job Creation:** API creates job -> `jobs` table (`status='PENDING'`).
3.  **Claim:** Worker polls `jobs` -> Claims job (`status='RUNNING'`).
4.  **Context:** Worker hydrates state from SQL/S3 (user preferences, file system).
5.  **Execution:** OpenClaw agent runs the task.
6.  **Completion:** Worker saves state -> Updates job -> Sends reply.

---

## 3. Web Feature Strategy

### A. Live Browser View (`/browser`)
- **Goal:** Transparency. Show the user what the agent is doing.
- **Implementation:**
    - Headless browser (Playwright) running in the worker container.
    - **Visuals:** Stream screenshots via SSE (Server-Sent Events) to the frontend.
    - **UI:** A "Browser Viewer" component that mimics a browser window (URL bar, traffic lights).

### B. File System Access
- **Goal:** Allow users to upload/download files for the agent.
- **Implementation:**
    - S3 bucket mounted or synced to `/home/agent/workspace`.
    - Web UI provides a file manager interface to this bucket.

### C. App Connectors
- **Goal:** Persist sessions for WhatsApp/Telegram/Slack.
- **Implementation:**
    - Session files stored in the user's persistent volume (S3-synced).
    - Secrets stored in a secure vault in the database.

---

## 4. Visual Design System

Our design language is **"Apple-level Polish"**: minimalist, clean, and highly functional.

### Typography
- **Primary:** `SF Pro Display` / `Inter` / system-ui (Clean sans-serif).
- **Monospace:** `JetBrains Mono` (For code, logs, and technical data).

### Color Palette (Light Mode Default)
- **Backgrounds:**
    - Primary: `#ffffff` (White)
    - Secondary: `#f4f4f5` (Zinc-100)
    - Chat Bubble (User): `#007AFF` (iMessage Blue) or `#18181b` (Zinc-900)
    - Chat Bubble (AI): `#E9E9EB` (Light Gray)
- **Text:**
    - Primary: `#09090b` (Zinc-950)
    - Secondary: `#71717a` (Zinc-500)
    - Muted: `#a1a1aa` (Zinc-400)
- **Accents:**
    - Brand: `#000000` (Black)
    - Success: `#22c55e` (Green-500)
    - Warning: `#f59e0b` (Amber-500)
    - Danger: `#ef4444` (Red-500)

### UI Components
- **Chat Interface:** modeeled after iMessage.
    - Blue/Black bubbles for user (right).
    - Gray bubbles for AI (left).
    - "Typing..." indicator bubbles.
- **Glassmorphism:** Used sparingly for overlays, sidebars, and sticky headers.
    - `backdrop-filter: blur(12px)`
    - Minimal borders: `1px solid rgba(0,0,0,0.1)`
- **Cards:**
    - Flat, white background.
    - Subtle borders: `border-zinc-200`.
    - Soft shadows on hover.

### Dark Mode
- Full support via CSS variables (`.dark` class).
- Backgrounds invert to specific zinc shades (`#000000`, `#0a0a0a`).
- Text inverts to white/gray.

---

## 5. Security Principles

1.  **Isolation First:** Every database query MUST be scoped by `user_id`.
2.  **Sandboxed Execution:** Agents run in ephemeral containers with limited network access (allow-list).
3.  **Secret Management:** API keys (OpenAI, Twilio) are encrypted at rest.
4.  **No Persisted Credentials:** User credentials for 3rd party sites are ideally not stored, or stored in encrypted session blobs.
