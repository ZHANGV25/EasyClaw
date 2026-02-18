# Antigravity Prompt — Generate Screen Assets

Copy-paste everything below the line into Antigravity.

---

## Task

Create temporary asset pages that render pixel-perfect iPhone chat screen designs. These will be screenshotted and used as assets for the landing page scroll animation. Each page renders a single screen state at iPhone 15 Pro resolution (393x852).

**Do this in the existing EasyClaw repo.** Create a temporary route group at `apps/web/src/app/(assets)/` so these pages don't interfere with the real app. Start the dev server when done.

### Font

Use **SF Pro Display** and **SF Pro Text** (Apple's system fonts). Load via:
```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;
```

### Global Screen Style

Every screen page shares this:
- **Background:** `#000000`
- **Width:** 393px, **Height:** 852px (iPhone 15 Pro logical resolution)
- **Centered on page** with a gray border so I can see the bounds
- **No scrolling** inside the screen — everything fits in the viewport
- **Status bar** at top: time "9:41" left, battery/wifi/signal icons right (use SF symbols or simple SVGs)
- **Chat header:** "EasyClaw" with a green dot "Online" indicator and a small purple "EC" logo square
- **Message bubbles:** Rounded corners (20px), max-width 75%
  - **Assistant bubbles:** Dark gray (`#1C1C1E`) background, white text, left-aligned
  - **User bubbles:** Purple/indigo (`#6C5CE7`) background, white text, right-aligned
- **Input bar** at bottom: Dark gray rounded input with "Ask anything..." placeholder and a purple send button
- **Text size:** 15px for messages, 13px for timestamps, 11px for status bar

### Pages to Create

#### Page 1: `/assets/screen-empty`
The starting state. Just the chat header, an empty message area, and the input bar. The screen the user sees before any conversation. Maybe a subtle centered ghost text: "Your assistant is ready."

#### Page 2: `/assets/screen-morning`
Morning briefing. Three assistant message bubbles, appearing as one conversation:

Bubble 1:
> Good morning, Victor ☀️

Bubble 2:
> Here's your day:
> • Dentist appointment at 2:00 PM
> • Rain expected after 4 PM — bring an umbrella
> • Your Comcast bill went up $15 since last month

Bubble 3:
> Want me to call Comcast and negotiate it down?

Timestamp below the last bubble: "7:02 AM"

#### Page 3: `/assets/screen-research`
Research result. Show a short user message and a detailed assistant response:

User bubble:
> Find me a good dentist that takes Aetna near downtown

Assistant bubble:
> I found 3 options for you:
>
> **1. Dr. Sarah Chen** ⭐ 4.9
> 0.3 mi · Accepting new patients · Next available: Tue Feb 18
>
> **2. Downtown Dental Group** ⭐ 4.7
> 0.5 mi · Same-day appointments · Next available: Today
>
> **3. Dr. Marcus Webb** ⭐ 4.8
> 1.1 mi · Specializes in cosmetic · Next available: Thu Feb 20
>
> All accept Aetna PPO. Want me to book one?

Timestamp: "10:15 AM"

#### Page 4: `/assets/screen-task`
Tedious task completed. Show the task request and completion:

User bubble:
> Fight my Comcast bill. I'm paying $89 but was quoted $65.

Assistant bubble (with a ✅ emoji):
> Done. Here's what happened:
>
> ✅ Called Comcast retention department
> ✅ Referenced your original $65/mo quote
> ✅ New rate: **$62/mo** (locked for 12 months)
> ✅ Confirmation #PCK-48291
>
> You'll save **$324/year**. The new rate starts next billing cycle.

Timestamp: "2:47 PM"

#### Page 5: `/assets/screen-cta`
The final state. Clean screen with just one assistant message and the input field active/focused:

Assistant bubble:
> What do you need help with?

The input bar should look active — maybe a blinking cursor inside it. This is the "your turn" moment.

Timestamp: "Now"

#### Page 6: `/assets/layers`
NOT a phone screen. This is a standalone page that renders the 4 deconstruct layer cards. Render them in a 2x2 grid so I can screenshot each one individually.

Each card:
- **Size:** 300px × 180px
- **Background:** Dark glass effect (`rgba(28,28,30,0.9)`) with a subtle border (`rgba(255,255,255,0.1)`)
- **Rounded corners:** 20px
- **Backdrop blur:** 20px
- **Layout:** Icon (large, 40px) at top, bold title below, one-line description below that
- **Text:** White

Card 1 — Memory:
- Icon: 🧠
- Title: "Knows You"
- Description: "Remembers your preferences, history, and routines"

Card 2 — Privacy:
- Icon: 🔒
- Title: "Private & Isolated"
- Description: "Your own container. Your data never leaves"

Card 3 — AI:
- Icon: ⚡
- Title: "Best AI Models"
- Description: "Claude, GPT-4, Gemini — picks the best for each task"

Card 4 — Always On:
- Icon: 🔄
- Title: "Always On"
- Description: "Runs 24/7. Checks, reminds, follows up"

### After Creating

1. Run `pnpm dev` and confirm all pages load
2. List the URLs for each page
3. These are temporary — they'll be deleted after I screenshot them

### Important
- These are NOT part of the product. They're asset generation pages. Use the `(assets)` route group so they don't get a layout from the main app.
- Make them look **beautiful**. These screenshots become the hero content of the landing page.
- Pay extreme attention to spacing, typography, and alignment. This is Apple-level polish.
