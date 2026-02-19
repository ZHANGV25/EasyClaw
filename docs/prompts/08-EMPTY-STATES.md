# Prompt: Empty & Loading States

## Priority: v2

## Context
We have an EasyClaw web app (Next.js, Tailwind, Clerk auth). Several pages fetch data and display it, but the empty states (zero data) and loading states (data in flight) aren't consistent or polished. A new user who just signed up will see empty states on every page — this is their first impression of the product.

## What to Do
Add polished empty states and consistent loading skeletons to all data-driven pages.

### Pages to Update

**1. Chat (`ChatView.tsx`) — No conversations**
- Empty state: centered illustration or icon area
- Headline: "What can I help with?"
- Subtitle: "Type a message to get started. I can book appointments, set reminders, research anything, and more."
- Suggested prompts (3-4 clickable chips): "Book a dinner reservation", "Set a reminder for tomorrow", "Find flights to Miami", "Cancel my gym membership"
- Clicking a chip populates the input and sends

**2. Dashboard (`dashboard/page.tsx`) — New user, zero usage**
- Credits card: show balance (probably from free tier), "You have 50 free credits to start"
- Usage chart: don't show an empty chart. Instead: "Start chatting to see your usage here"
- Transaction history: "No transactions yet"
- Container status: show "Ready" with a green dot

**3. Activity (`activity/page.tsx`) — No tasks yet**
- Icon: clipboard or list icon
- "No activity yet"
- "Start a conversation and your assistant will get to work."
- CTA: "Start chatting →" → `/chat`

**4. Reminders (`reminders/page.tsx`) — No reminders**
- Icon: bell icon
- "No reminders set"
- 'Ask your assistant to set one. Try: "Remind me to call Mom every Sunday at 2pm"'
- CTA: "Start chatting →" → `/chat`

**5. Settings (`settings/page.tsx`) — Vault empty**
- Vault tab with no secrets: "No secrets stored. Add API keys or passwords for your assistant to use securely."

### Loading States
Create a reusable skeleton component: `apps/web/src/components/Skeleton.tsx`

```typescript
// Usage: <Skeleton className="h-4 w-32" />
// Renders a pulsing gray rectangle
```

Apply loading skeletons to:
- Dashboard: 3 stat card skeletons + chart skeleton + 5 transaction row skeletons
- Activity: 5 task card skeletons
- Reminders: 3 reminder card skeletons
- Chat history: message bubble skeletons (alternating sides)
- Settings: form field skeletons

### Skeleton pattern
- Rounded rectangles with `bg-black/5` (light) or `bg-white/5` (dark)
- CSS animation: pulse (opacity 0.5 → 1 → 0.5, 1.5s loop)
- Match the approximate size/shape of the real content

### General Rules
- Every page that fetches data should have 3 states: Loading → Empty → Populated
- Loading: show skeletons (never a blank white screen)
- Empty: show a helpful message with a CTA to get started
- Error: show a simple error message with a "Retry" button (some pages already have this — make it consistent)
- Empty states should feel encouraging, not sad

### Styling
- Use CSS variables for theme compatibility
- Empty state containers: centered, max-width 400px, subtle opacity
- Icons in empty states: 48px, `opacity-30`
- Headlines: `text-lg font-medium`
- Subtitles: `text-sm text-[var(--color-text-secondary)]`

### Don't
- Don't add illustrations or images (just use simple SVG icons or emoji)
- Don't change existing populated states
- Don't add new dependencies (no skeleton libraries)
