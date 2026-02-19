# Prompt: Memory & Preferences Page

## Priority: v2

## Context
We have an EasyClaw web app (Next.js, Tailwind, Clerk auth). The AI assistant learns about users over time — their preferences, insurance info, favorite restaurants, schedule patterns, etc. This is stored in OpenClaw's memory system (MEMORY.md and daily files). Users currently have no visibility into what the agent "knows" about them and no way to correct it.

## What to Build
A page at `/memory` where users can review, edit, and delete what their assistant has learned about them.

### Requirements

**Page: `apps/web/src/app/memory/page.tsx`**
- Wrapped in `<DashboardShell>`
- Add "Memory" to sidebar nav (use a brain or lightbulb icon)

**Layout — two sections:**

**1. Profile Knowledge (structured)**
- A card-based grid showing categorized facts the agent knows:
  - **Personal**: Name, timezone, location
  - **Health**: Insurance provider, doctors, allergies
  - **Travel**: Preferred airlines, seat preferences, frequent destinations
  - **Food**: Dietary restrictions, favorite cuisines, go-to restaurants
  - **Schedule**: Work hours, recurring commitments
  - **Other**: Anything that doesn't fit above
- Each fact shows:
  - The fact ("Prefers window seats")
  - When it was learned ("Learned Oct 15")
  - Source conversation link (optional)
  - Edit button (pencil icon) → inline edit
  - Delete button (X icon) → removes with confirmation
- "Add fact" button in each category to manually add knowledge

**2. Recent Learnings (chronological)**
- Timeline of recently learned facts
- "Your assistant learned: You prefer Blue Cross Blue Shield for dental" — Oct 15
- "Your assistant learned: Your work hours are 9-5 EST" — Oct 12
- Each item can be confirmed (✓) or rejected (✗)
- Rejected items are deleted from agent memory

**Header area:**
- Title: "Memory"
- Subtitle: "What your assistant knows about you"
- Small disclaimer: "Your assistant learns from your conversations to serve you better. You can review, edit, or delete anything here."

**API routes:**
- `GET /api/memory` — returns `{ facts: MemoryFact[], recentLearnings: Learning[] }`
- `PUT /api/memory/[id]` — update a fact
- `DELETE /api/memory/[id]` — delete a fact
- `POST /api/memory` — manually add a fact
- `POST /api/memory/[id]/confirm` — confirm a learning
- `POST /api/memory/[id]/reject` — reject and delete a learning
- All mocked for now

**Types: `apps/web/src/types/memory.ts`**
```typescript
export type MemoryCategory = "personal" | "health" | "travel" | "food" | "schedule" | "other";

export interface MemoryFact {
  id: string;
  category: MemoryCategory;
  fact: string;
  learnedAt: string;
  source?: {
    conversationId: string;
    messagePreview: string;
  };
}

export interface Learning {
  id: string;
  fact: string;
  category: MemoryCategory;
  learnedAt: string;
  status: "pending" | "confirmed" | "rejected";
  conversationId?: string;
}
```

### Styling
- Clean card grid for categories (2 columns desktop, 1 mobile)
- Category headers with subtle icons
- Facts as small pills/tags within each card
- Inline editing: click edit → input replaces text → save/cancel
- Match existing dashboard theme, dark/light support
- Empty category: "No facts yet" in muted text

### Don't
- Don't build real OpenClaw memory integration — mock everything
- Don't create a complex knowledge graph visualization
- Don't add new dependencies
