# Prompt: Task / Activity History Page

## Priority: MVP

## Context
We have an EasyClaw web app (Next.js, Tailwind, Clerk auth). The chat view already has an `ActivityBlock` component that shows agent steps inline (thought, tool-call, terminal, file-write). But there's no standalone page where users can see a chronological feed of everything their agent has done.

## What to Build
A new page at `/activity` that shows a chronological feed of completed agent tasks.

### Requirements

**Page: `apps/web/src/app/activity/page.tsx`**
- Wrapped in `<DashboardShell>` (same as dashboard/settings)
- Add "Activity" to the sidebar nav in `Sidebar.tsx` (between Overview and Settings)
- Use an activity feed icon (clock or list icon)

**Layout:**
- Header: "Activity" title, subtitle "Everything your assistant has done"
- Filter bar: "All" | "Today" | "This Week" | "This Month" (pill toggles)
- Optional search input to filter by keyword

**Feed items — each task card shows:**
- Timestamp (relative: "2 hours ago", absolute on hover)
- Task summary — one line describing what happened: "Booked dentist appointment", "Cancelled gym membership", "Set weekly reminder"
- Status badge: ✅ Completed | ⚠️ Partial | ❌ Failed
- Expandable detail — click to see the full agent steps (reuse `ActivityBlock` component)
- Conversation link — "View in chat →" links to `/chat/[id]`

**Empty state:**
- Friendly message: "No activity yet. Start a conversation and your assistant will get to work."
- CTA button: "Start chatting →" links to `/chat`

**API route: `apps/web/src/app/api/activity/route.ts`**
- GET endpoint, authenticated via Clerk
- Query params: `?filter=today|week|month|all&search=keyword&limit=50&offset=0`
- Returns: `{ tasks: Task[], hasMore: boolean }`
- For now, return mock data that matches the interface

**Types: `apps/web/src/types/activity.ts`** (extend existing)
```typescript
export interface Task {
  id: string;
  conversationId: string;
  summary: string;
  status: "completed" | "partial" | "failed";
  steps: AgentStep[];
  createdAt: string;
  completedAt?: string;
}
```

### Styling
- Match existing dashboard aesthetic (use CSS variables from globals.css)
- Cards should have subtle borders, hover states
- Respect dark/light theme via ThemeContext
- Mobile responsive — single column on mobile, comfortable on desktop

### Don't
- Don't build a real backend — mock the API response
- Don't modify the chat streaming logic
- Don't add new dependencies
