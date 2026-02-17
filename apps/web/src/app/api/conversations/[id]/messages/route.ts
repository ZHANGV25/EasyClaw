import { NextRequest, NextResponse } from "next/server";

/**
 * Messages for a specific conversation.
 *
 * GET /api/conversations/[id]/messages?limit=20&before=<msg_id>
 *
 * The real backend will query the messages table filtered by conversation_id.
 */

// Same mock data as the conversations route — in a real app these share a DB
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const before = searchParams.get("before");

  await new Promise((r) => setTimeout(r, 300));

  const allMessages = MESSAGES_BY_CONV[id] || [];
  let messages = [...allMessages];

  if (before) {
    const idx = messages.findIndex((m) => m.id === before);
    if (idx > 0) {
      messages = messages.slice(0, idx);
    } else {
      messages = [];
    }
  }

  const slice = messages.slice(-limit);
  const hasMore = messages.length > limit;

  return NextResponse.json({ messages: slice, hasMore });
}
