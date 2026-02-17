# Web Environment Feature Strategy

This document outlines how we will bring the powerful "local" capabilities of OpenClaw (OpenClaws) into the `EasyClaw` secure web environment.

## Core Philosophy
We transform "Local System Access" into "Cloud Container Access". The user doesn't give the agent control of their *laptop*; they give the agent a *powerful cloud computer* that they can control and monitor from the web.

---

## 1. The "Eyes": Web Browsing & Research
**Feature:** The agent can browse the web, read pages, and interact with sites (SaaS tools, research).
**Challenge:** No local browser window to show the user.

### Implementation
- **Container**: Run **Playwright** (or Puppeteer) in `headless=new` mode inside the user's container.
- **Visual Feedback (The "Cool" Factor)**:
  - **Live Stream**: Use `novnc` or MJPEG stream to show a low-FPS "Live View" of the agent's browser in the Web Dashboard.
  - **Snapshots**: If streaming is too expensive for MVP, capture screenshots at key steps (e.g., "Found search results", "Filled form") and display them in the Chat Activity feed.
- **Security**: Run the browser in a sandbox (e.g., `browserless/chrome` image) to prevent container escapes.

## 2. The "Hands": Tool Execution & System Access
**Feature:** "Full System Access" (Terminal, filesystem, applications).
**Challenge:** We can't let users run `rm -rf /` on our host.

### Implementation
- **Sandboxed "Computer"**: The user's container *is* their computer.
  - It comes pre-installed with `git`, `python`, `node`, `curl`.
  - The agent can install packages (user-scoped) if needed.
- **Filesystem**:
  - Mount a persistent **EFS** or **S3-synced** volume to `/home/agent/workspace`.
  - **Web UI**: A "Files" tab where users can view, download, or upload files for the agent to use.
- **Tooling**:
  - Use **MCP (Model Context Protocol)** or a standard tool definition json to expose these system commands safely.
  - **Terminal View**: (Optional Power Feature) A read-only terminal stream in the dashboard showing the raw commands the agent is running.

## 3. The "Voice": Proactive Messaging & Apps
**Feature:** Sending WhatsApp/Telegram messages, connecting to Slack/Discord.
**Challenge:** Authentication and state persistence.

### Implementation
- **Unified Messaging Bridge**:
  - The container runs a lightweight bridge ensuring it's always "online" to receive webhooks from Telegram/WhatsApp.
  - **Auth**: API keys are stored in the **Secure Vault** (in DB, filtered as env vars).
- **Session Persistence**:
  - `whatsapp-web.js` or similar libraries require session files. These must be persisted to the User's Data Volume so they survive container restarts.

## 4. The "Brain": Memory & Context
**Feature:** Remembering everything about the user.
**Challenge:** Stateless containers forget when they restart.

### Implementation
- **Vector Database**:
  - Use `pgvector` (in our Postgres DB) to store all conversation history and "facts" extracted from chats.
- **The "Soul" File**:
  - Sync `SOUL.md` (personality) and `USER.md` (facts about user) from the S3 bucket to the container at boot.
  - The Agent updates `USER.md` locally -> Sidecar process syncs it back to S3.

---

## Summary of New Components Needed

| Feature | Component | status |
| :--- | :--- | :--- |
| **Visual Browsing** | Playwright + Stream Server | **Planned** |
| **File System** | EFS/S3 Mount + "Files" UI | **Planned** |
| **App Connectors** | Secure Vault + Session Persistence | **In Progress** |
| **Proactivity** | Cron Scheduler in Container | **Planned** |
