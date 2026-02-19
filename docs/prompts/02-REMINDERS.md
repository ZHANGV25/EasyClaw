# Prompt: Reminders & Scheduled Tasks Page

## Priority: MVP

## Context
We have an EasyClaw web app (Next.js, Tailwind, Clerk auth). The AI assistant can set reminders and scheduled tasks (cron jobs) via OpenClaw's cron system. But users have no way to see upcoming reminders, edit them, or cancel them from the web UI.

## What to Build
A new page at `/reminders` that shows all scheduled/upcoming tasks and past reminders.

### Requirements

**Page: `apps/web/src/app/reminders/page.tsx`**
- Wrapped in `<DashboardShell>`
- Add "Reminders" to sidebar nav in `Sidebar.tsx` (use a bell or calendar icon)

**Layout — two sections:**

**1. Upcoming (top)**
- Header: "Upcoming" with count badge
- List of scheduled reminders/tasks, sorted by next fire time
- Each item shows:
  - What: reminder text ("Call Mom", "Check flight prices")
  - When: next fire time in user's timezone ("Sunday at 2:00 PM", "Every Monday at 9:00 AM")
  - Recurrence badge: "One-time" | "Daily" | "Weekly" | "Custom"
  - Actions: Pause (toggle), Delete (with confirm)
- If nothing upcoming: "No upcoming reminders. Ask your assistant to set one."

**2. Past (below)**
- Header: "Past" — collapsed by default, expandable
- Shows recently fired reminders (last 30 days)
- Each item: what, when it fired, status (delivered / missed)
- Faded styling to distinguish from upcoming

**Reminder card component: `apps/web/src/components/ReminderCard.tsx`**
- Reusable card for both upcoming and past
- Subtle left border color: blue for upcoming, gray for past, red for paused
- Hover state with action buttons revealed

**API routes:**
- `GET /api/reminders` — returns `{ upcoming: Reminder[], past: Reminder[] }`
- `PATCH /api/reminders/[id]` — update (pause/resume)
- `DELETE /api/reminders/[id]` — delete
- All authenticated via Clerk
- Mock data for now

**Types: `apps/web/src/types/reminders.ts`**
```typescript
export interface Reminder {
  id: string;
  text: string;
  schedule: {
    kind: "at" | "every" | "cron";
    nextFireAt: string; // ISO timestamp
    humanReadable: string; // "Every Sunday at 2 PM"
    recurrence: "one-time" | "daily" | "weekly" | "monthly" | "custom";
  };
  status: "active" | "paused" | "completed" | "expired";
  createdAt: string;
  lastFiredAt?: string;
  conversationId?: string; // link back to chat where it was created
}
```

### Styling
- Match existing dashboard aesthetic
- Use CSS variables, respect dark/light theme
- Mobile responsive
- Delete should have a confirmation step (small inline confirm, not a modal)

### Don't
- Don't build real cron integration — mock the API
- Don't add a "create reminder" form (users create reminders by chatting)
- Don't add new dependencies
