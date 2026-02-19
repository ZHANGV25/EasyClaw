# Prompt: Landing Page Footer

## Priority: v2

## Context
We have an EasyClaw landing page in `apps/web/src/components/landing/HeroScrollDemo.tsx`. Currently there's a minimal sticky footer ("EasyClaw | © 2026") that lives inside the scroll hero. After the CTA section, the page just ends. We need a proper site footer after the CTA.

## What to Build
A proper footer section at the very bottom of `HeroScrollDemo.tsx`, after the CTA section and outside the white `bg-white` container. This footer sits in a dark section.

### Requirements

**Layout: 4 columns on desktop, 2 on tablet, stacked on mobile**

**Column 1 — Brand**
- "EasyClaw" in serif font (matching header)
- One-liner: "The AI that acts."
- Copyright: "© 2026 EasyClaw. All rights reserved."

**Column 2 — Product**
- Header: "Product"
- Links: Features, Pricing, FAQ, Changelog
- Features/Pricing/FAQ should smooth-scroll to those sections on the landing page
- Changelog: link to `/changelog` (placeholder, can be # for now)

**Column 3 — Legal**
- Header: "Legal"
- Links: Privacy Policy, Terms of Service, Cookie Policy
- All link to `/privacy`, `/terms`, `/cookies` (placeholder pages, can be # for now)

**Column 4 — Connect**
- Header: "Connect"
- Links: Twitter/X, Discord, Email (vhzhang2020@gmail.com — use mailto:)
- Social links open in new tab

**Bottom bar (below columns):**
- Thin top border
- Left: "Built in Pittsburgh 🏗️"
- Right: "Status" link (placeholder)

### Styling
- Background: `#050505` (dark, matching the hero scroll dark theme)
- Text: white, with muted opacity for secondary text
- Links: `text-white/50 hover:text-white transition-colors`
- Headers: `text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 mb-4` (matching section label style)
- Padding: `py-20 px-6`
- Max width: `max-w-[1000px] mx-auto` (matching other sections)
- Clean separation from the white CTA section above

### Don't
- Don't create placeholder legal pages (just use `#` hrefs)
- Don't add social media icons/SVGs — just text links
- Don't add a newsletter signup form
- Don't add new dependencies
- Don't remove the existing sticky footer (it's part of the scroll hero)
