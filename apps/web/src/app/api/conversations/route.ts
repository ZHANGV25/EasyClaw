import { NextRequest, NextResponse } from "next/server";

/**
 * Mock Conversations API
 *
 * GET  /api/conversations          → list all conversations
 * POST /api/conversations          → create a new conversation
 * PATCH /api/conversations?id=xxx  → rename a conversation
 * DELETE /api/conversations?id=xxx → delete a conversation
 */

// In-memory mock store — resets on server restart
let conversations = [
  {
    id: "conv-1",
    title: "Coffee shops near CMU",
    lastMessage: "Would you like directions to any of these?",
    updatedAt: "2026-02-16T10:00:12Z",
    createdAt: "2026-02-16T10:00:00Z",
  },
  {
    id: "conv-2",
    title: "ML exam study plan",
    lastMessage: "Want me to go deeper into the math behind either one?",
    updatedAt: "2026-02-16T20:15:18Z",
    createdAt: "2026-02-16T14:30:00Z",
  },
  {
    id: "conv-3",
    title: "Startup pitch deck review",
    lastMessage: "Here are my suggestions for slide 4...",
    updatedAt: "2026-02-17T09:00:00Z",
    createdAt: "2026-02-17T08:30:00Z",
  },
];

// Per-conversation mock messages
const MESSAGES_BY_CONV: Record<
  string,
  { id: string; role: string; content: string; createdAt: string }[]
> = {
  "conv-1": [
    { id: "c1-1", role: "user", content: "Can you help me find a good coffee shop near CMU?", createdAt: "2026-02-16T10:00:00Z" },
    { id: "c1-2", role: "assistant", content: "Of course! Here are my top picks:\n\n1. **Commonplace Coffee** — On S Highland Ave, about a 5-minute walk. Great pour-overs.\n2. **De Fer Coffee** — In the Strip District. Known for single-origin roasts.\n3. **Crazy Mocha** — On Murray Ave in Squirrel Hill. Cozy atmosphere.\n\nWould you like directions to any of these?", createdAt: "2026-02-16T10:00:12Z" },
  ],
  "conv-2": [
    { id: "c2-1", role: "user", content: "What about study spots that are open late?", createdAt: "2026-02-16T14:30:00Z" },
    { id: "c2-2", role: "assistant", content: "Here are some late-night study spots:\n\n1. **Hunt Library** — Open until 2 AM on weekdays.\n2. **Entropy+** — Student-run café in the UC.\n3. **61C Café** — On Murray Ave, open until 11 PM.\n\nI'd recommend Hunt Library for really late sessions.", createdAt: "2026-02-16T14:30:20Z" },
    { id: "c2-3", role: "user", content: "Set a reminder to study for my ML exam tomorrow at 7pm", createdAt: "2026-02-16T18:00:00Z" },
    { id: "c2-4", role: "assistant", content: "Done! I've set a reminder for tomorrow at 7:00 PM EST:\n\n> **Study for ML exam**\n\nGood luck!", createdAt: "2026-02-16T18:00:08Z" },
    { id: "c2-5", role: "user", content: "Summarize the key differences between batch normalization and layer normalization?", createdAt: "2026-02-16T20:15:00Z" },
    { id: "c2-6", role: "assistant", content: "**Batch Normalization:**\n- Normalizes across the batch dimension\n- Less stable with small batches\n- Used in CNNs\n\n**Layer Normalization:**\n- Normalizes across features within each sample\n- Independent of batch size\n- Preferred in Transformers/RNNs\n\nWant me to go deeper into the math behind either one?", createdAt: "2026-02-16T20:15:18Z" },
  ],
  "conv-3": [
    { id: "c3-1", role: "user", content: "Can you review my startup pitch deck? I have 10 slides.", createdAt: "2026-02-17T08:30:00Z" },
    { id: "c3-2", role: "assistant", content: "I'd be happy to help! Share the key points from each slide and I'll give you feedback on flow, messaging, and potential investor questions.\n\nLet's start — what's on slide 1?", createdAt: "2026-02-17T08:30:15Z" },
    { id: "c3-3", role: "user", content: "Slide 1 is the title: 'EasyClaw — Your Always-On AI Assistant'. Slide 4 is our market size.", createdAt: "2026-02-17T08:45:00Z" },
    { id: "c3-4", role: "assistant", content: "Great title slide! For slide 4 (market size), here are my suggestions:\n\n1. **Lead with TAM** — Start with total addressable market\n2. **Show the wedge** — What specific segment you're targeting first\n3. **Cite sources** — Use Gartner/McKinsey data for credibility\n\nHere are my suggestions for slide 4...", createdAt: "2026-02-17T09:00:00Z" },
  ],
};

export async function GET() {
  await new Promise((r) => setTimeout(r, 200));

  return NextResponse.json({
    conversations: conversations
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  });
}

export async function POST(request: NextRequest) {
  await new Promise((r) => setTimeout(r, 200));

  const body = await request.json().catch(() => ({}));
  const title = body.title || "New Conversation";

  const newConv = {
    id: `conv-${Date.now()}`,
    title,
    lastMessage: "",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  conversations.push(newConv);
  return NextResponse.json(newConv, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.title) conv.title = body.title;
  conv.updatedAt = new Date().toISOString();

  return NextResponse.json(conv);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  conversations = conversations.filter((c) => c.id !== id);
  return NextResponse.json({ success: true });
}
