# Prompt: FAQ Section on Landing Page

## Priority: MVP

## Context
We have an EasyClaw landing page in `apps/web/src/components/landing/HeroScrollDemo.tsx`. Single-page scroll: hero → value props → use cases → how it works → pricing → CTA. We need an FAQ section between pricing and the final CTA.

## What to Build
An FAQ accordion section added inside `HeroScrollDemo.tsx`, after pricing and before the CTA.

### Requirements

**Section header:**
- Small label: "FAQ" (same style as other section labels: `text-[10px] font-mono tracking-[0.3em] uppercase opacity-40`)
- Headline: "Questions? Answered."

**FAQ items (accordion style):**

1. **"What can EasyClaw actually do?"**
   "Anything you'd ask a personal assistant — book appointments, find flights, set reminders, cancel subscriptions, track packages, research options, and more. If it can be done online, EasyClaw can handle it."

2. **"How is this different from ChatGPT?"**
   "ChatGPT gives you answers. EasyClaw takes action. Instead of telling you which dentists are available, we book the appointment. Instead of listing flight options, we reserve the seat."

3. **"Is my data safe?"**
   "Yes. Your conversations are encrypted, your personal details are stored securely, and we never sell your data. You can delete your account and all data at any time."

4. **"What's a credit?"**
   "One credit covers one simple task — like setting a reminder or answering a question. Bigger tasks (booking a flight, multi-step research) use more credits. You always see the estimated cost before confirming."

5. **"Do I need to install anything?"**
   "No. EasyClaw works through Telegram — just text it like you'd text a friend. You can also use the web dashboard to manage your account and see activity."

6. **"What if I run out of credits?"**
   "You'll get a heads-up when you're running low. Top up anytime from the dashboard — credits never expire. Your assistant pauses non-urgent tasks until you add more."

7. **"Can I use it outside the US?"**
   "Yes. EasyClaw works anywhere Telegram does. Some location-specific tasks (like booking a local restaurant) work best in supported regions, which we're expanding."

### Accordion component
- Build inline (no separate component file needed, keep it in HeroScrollDemo)
- Click question to expand/collapse answer
- Only one open at a time
- Smooth height animation (use React state + CSS transition or framer-motion AnimatePresence)
- Plus/minus icon or chevron that rotates on toggle
- Questions in `font-medium`, answers in `text-black/60`

### Layout
- Single column, max-width ~700px, centered
- Each item separated by `border-b border-black/10`
- Top separator: `border-t border-black/10` (same as other sections)
- Padding: `py-32` (same as other sections)

### Styling
- White background (continues from pricing)
- Minimal — no cards, no boxes, just clean text accordion
- Question text: `text-lg` black
- Answer text: `text-base text-black/60 leading-relaxed`
- Mobile: same layout, just narrower

### Don't
- Don't create a separate component file — keep FAQ state and JSX inline in HeroScrollDemo
- Don't use a third-party accordion library
- Don't add new dependencies
