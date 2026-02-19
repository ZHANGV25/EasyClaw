# Prompt: Mobile Responsiveness Audit & Fix

## Priority: v2

## Context
We have an EasyClaw web app (Next.js, Tailwind, Clerk auth) with multiple pages: landing, chat, dashboard, settings, telegram, onboarding, activity, reminders. The sidebar has a mobile hamburger toggle, but we haven't done a proper mobile responsiveness pass. Since many users will access the web dashboard from their phones (especially after chatting on Telegram), mobile needs to work well.

## What to Do
Audit and fix all pages for mobile (320px–768px) and tablet (768px–1024px) breakpoints.

### Pages to Audit

**1. Landing page (`HeroScrollDemo.tsx`)**
- Hero scroll: verify text doesn't overflow, 3D elements hidden on mobile
- Value props: should stack to single column on mobile
- Use cases: 3-column grid → single column
- How it works: 3-column → single column
- Pricing: 3-column → single column (recommended card should still be visually highlighted)
- FAQ: should already work (single column) — verify padding
- CTA: verify text sizing

**2. Chat (`ChatView.tsx`)**
- Message bubbles shouldn't overflow on narrow screens
- Input area should be fixed to bottom, full width
- Sidebar should overlay (not push content) on mobile
- Avatar/header shouldn't crowd the message area

**3. Dashboard (`dashboard/page.tsx`)**
- Stats cards: grid should collapse to single column
- Usage chart: should be horizontally scrollable or simplified on mobile
- Transaction list: should be readable without horizontal scroll

**4. Settings (`settings/page.tsx`)**
- Tab bar: horizontal scroll if tabs overflow
- Form inputs: full width on mobile
- Vault secrets table: responsive

**5. Onboarding (`onboarding/page.tsx`)**
- Wizard steps: should work well on narrow screens
- Buttons: full width on mobile

**6. Telegram (`telegram/page.tsx`)**
- Already centered layout — verify it looks good on small screens

### General Rules
- Minimum touch target: 44px × 44px for all interactive elements
- No horizontal overflow/scroll on any page (except intentional carousels)
- Text should never be smaller than 14px on mobile
- Modals should be full-screen or bottom-sheet on mobile (not tiny centered boxes)
- Sidebar: slide-in overlay on mobile, fixed on desktop (already implemented — verify it works)
- Test at: 320px (iPhone SE), 375px (iPhone), 390px (iPhone 14), 768px (iPad)

### Styling approach
- Use existing Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
- Don't restructure components — just add responsive overrides
- If a component is fundamentally broken on mobile, note it and suggest a restructure

### Deliverable
- Fix all responsive issues found
- Add a comment `// Mobile: ...` above any non-obvious responsive adjustments
- Test by resizing browser to each breakpoint

### Don't
- Don't redesign any page — just make existing designs work on mobile
- Don't add a mobile-only navigation (hamburger already exists)
- Don't add new dependencies
