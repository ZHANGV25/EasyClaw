# Prompt: Pricing Section on Landing Page

## Priority: MVP

## Context
We have an EasyClaw landing page in `apps/web/src/components/landing/HeroScrollDemo.tsx`. It's a single-page scroll site with: hero scroll animation → value props → use cases → how it works → CTA. We need a pricing section between "how it works" and the final CTA.

## What to Build
A pricing section added directly inside `HeroScrollDemo.tsx`, after the "How it works" section and before the CTA.

### Requirements

**Section header:**
- Small label: "Pricing" (same `text-[10px] font-mono tracking-[0.3em] uppercase opacity-40` style as other sections)
- Headline: "Pay for what you use. Nothing more."

**Layout: 3 columns on desktop, stacked on mobile**

**Column 1 — Free Tier**
- Title: "Free"
- Price: "$0"
- Subtitle: "To get started"
- Includes:
  - 50 free credits
  - Basic tasks (reminders, search, simple requests)
  - Telegram access
  - 7-day message history
- CTA button: "Get Started" → `/sign-up` (outline style, black border)

**Column 2 — Pay As You Go (highlighted/recommended)**
- Title: "Credits"
- Price: "From $5"
- Subtitle: "For real work"
- Includes:
  - Everything in Free
  - Complex tasks (bookings, research, multi-step)
  - Full message history
  - Priority response times
  - Credits never expire
- CTA button: "Get Started" → `/sign-up` (solid black bg, white text)
- Subtle "recommended" badge or highlighted border

**Column 3 — Enterprise / Team (coming soon)**
- Title: "Team"
- Price: "Coming soon"
- Subtitle: "For power users"
- Includes:
  - Everything in Credits
  - Shared assistants
  - Admin dashboard
  - Custom integrations
  - Volume discounts
- CTA button: "Join Waitlist" → mailto or form (outline style, muted)

**Below the cards — a simple explainer:**
- "What's a credit?" one-liner: "One credit ≈ one simple task. Complex tasks use more. You always see the cost before confirming."
- Keep this to 2-3 short lines max

### Styling
- White background (continues from previous sections)
- Cards: subtle border (`border-black/5`), rounded corners, padding
- Recommended card: slightly elevated shadow or darker border (`border-black/20`)
- Consistent with the rest of the landing page typography
- `border-t border-black/10` separator at the top (same as other sections)
- Mobile: stack vertically with equal spacing

### Don't
- Don't use any colored gradients or flashy elements — keep it minimal
- Don't add a pricing calculator (too early)
- Don't create a separate page — this lives inside HeroScrollDemo.tsx
- Don't add new dependencies
