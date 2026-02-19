# Prompt: Live Browser View

## Priority: v2

## Context
We have an EasyClaw web app (Next.js, Tailwind, Clerk auth) where users chat with an AI assistant that can browse the web on their behalf. Under the hood, OpenClaw controls a headless browser to perform tasks (searching, booking, filling forms). Currently this is a black box — the user sends a request and gets a result. We want to make it transparent.

## What to Build
A live browser viewer that lets users watch what their agent's browser is doing in real time. This is a read-only view — users cannot interact with the browser, only observe.

### Requirements

**Integration point: inside ChatView**
- When the agent is actively using the browser during a conversation, show a "Watch live" button inline in the chat
- Clicking it opens a panel (side panel on desktop, bottom sheet on mobile) with the browser view
- Panel can be resized, minimized, or closed

**Browser viewer component: `apps/web/src/components/BrowserViewer.tsx`**
- Displays a stream of browser screenshots (not a full VNC — just periodic screenshots)
- Shows current URL in a mock address bar at the top
- Small status indicator: "Navigating...", "Filling form...", "Waiting for page..."
- Aspect ratio: roughly 16:10, with a subtle browser chrome frame
- Screenshots update via WebSocket or SSE (same pattern as chat streaming)
- When not actively browsing: show last screenshot with "Browser idle" overlay

**Standalone page: `apps/web/src/app/browser/page.tsx`**
- Full-page browser viewer (for users who want to watch on a bigger screen)
- Wrapped in `<DashboardShell>`
- Shows the live view + a timeline of recent browser actions below it
- Add "Browser" to sidebar nav (use an eye or monitor icon)

**API:**
- `GET /api/browser/stream` — SSE endpoint that pushes screenshot frames (base64 JPEG) and URL updates
- `GET /api/browser/status` — returns `{ active: boolean, currentUrl?: string, lastScreenshotAt?: string }`
- Mock with a few static screenshots for now

**Types: `apps/web/src/types/browser.ts`**
```typescript
export interface BrowserFrame {
  timestamp: string;
  url: string;
  screenshotBase64: string; // JPEG
  action?: string; // "Clicking 'Book Now'", "Typing in search field"
  status: "navigating" | "interacting" | "waiting" | "idle";
}
```

### Styling
- Browser chrome: dark header bar with URL, colored dots (macOS style)
- Screenshot area: subtle shadow, rounded corners
- Loading state: skeleton shimmer over screenshot area
- "Live" indicator: small red dot + "LIVE" text when actively streaming
- Match existing dashboard aesthetic, dark/light theme support

### UX Details
- Auto-close panel when agent finishes browsing
- Keep last 10 screenshots in memory for scrubbing back
- Show a "Your agent is browsing..." toast/notification when browser activates during chat

### Don't
- Don't implement real WebSocket/VNC — mock the stream with timed static images
- Don't allow user interaction with the browser (read-only)
- Don't add heavy dependencies (no VNC libraries)
- Don't modify the existing chat streaming logic
