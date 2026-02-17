import { NextRequest, NextResponse } from "next/server";

/**
 * Mock chat history endpoint.
 * Returns paginated past messages. The real backend will query the messages table.
 *
 * Query params:
 *   ?limit=20&before=<message_id>
 */

const MOCK_HISTORY = [
  { id: "hist-1", role: "user", content: "Can you help me find a good coffee shop near CMU?", createdAt: "2026-02-16T10:00:00Z" },
  { id: "hist-2", role: "assistant", content: "Of course! There are several great options near Carnegie Mellon. Here are my top picks:\n\n1. **Commonplace Coffee** — On S Highland Ave, about a 5-minute walk. Great pour-overs and pastries.\n2. **De Fer Coffee** — In the Strip District, a short bus ride. Known for their single-origin roasts.\n3. **Crazy Mocha** — On Murray Ave in Squirrel Hill. Cozy atmosphere, good for studying.\n\nWould you like directions to any of these?", createdAt: "2026-02-16T10:00:12Z" },
  { id: "hist-3", role: "user", content: "What about study spots that are open late?", createdAt: "2026-02-16T14:30:00Z" },
  { id: "hist-4", role: "assistant", content: "Here are some late-night study spots near campus:\n\n1. **Hunt Library** — Open until 2 AM on weekdays during the semester.\n2. **Entropy+** — The student-run café in the UC, often open late.\n3. **La Prima Espresso** — In Wean Hall, convenient between classes. Closes at 5 PM though.\n4. **61C Café** — On Murray Ave, open until 11 PM. Great vibe.\n\nI'd recommend Hunt Library if you need to stay really late. Want me to set a study reminder?", createdAt: "2026-02-16T14:30:20Z" },
  { id: "hist-5", role: "user", content: "Set a reminder to study for my ML exam tomorrow at 7pm", createdAt: "2026-02-16T18:00:00Z" },
  { id: "hist-6", role: "assistant", content: "Done! I've set a reminder for tomorrow (Feb 17) at 7:00 PM EST:\n\n> **Study for ML exam**\n\nI'll send you a notification when it's time. Good luck with your studying!", createdAt: "2026-02-16T18:00:08Z" },
  { id: "hist-7", role: "user", content: "Thanks! Also, can you summarize the key differences between batch normalization and layer normalization?", createdAt: "2026-02-16T20:15:00Z" },
  { id: "hist-8", role: "assistant", content: "Here's a quick comparison:\n\n**Batch Normalization:**\n- Normalizes across the batch dimension\n- Depends on batch size (less stable with small batches)\n- Commonly used in CNNs\n- Uses running statistics during inference\n\n**Layer Normalization:**\n- Normalizes across the feature dimension within each sample\n- Independent of batch size\n- Preferred in transformers and RNNs\n- Same computation during training and inference\n\n**When to use which:**\n- Vision models → Batch Norm\n- Sequence models / Transformers → Layer Norm\n- Small batch sizes → Layer Norm\n\nWant me to go deeper into the math behind either one?", createdAt: "2026-02-16T20:15:18Z" },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const before = searchParams.get("before");

  // Simulate DB delay
  await new Promise((r) => setTimeout(r, 400));

  let messages = [...MOCK_HISTORY];

  // If "before" is specified, return messages before that ID
  if (before) {
    const idx = messages.findIndex((m) => m.id === before);
    if (idx > 0) {
      messages = messages.slice(0, idx);
    } else {
      // No more messages before this one
      messages = [];
    }
  }

  // Take the last `limit` messages (most recent)
  const slice = messages.slice(-limit);
  const hasMore = messages.length > limit;

  return NextResponse.json({
    messages: slice,
    hasMore,
  });
}
