import { NextRequest } from "next/server";

/**
 * Mock SSE chat endpoint.
 * Simulates the real backend contract from WORK_SPLIT.md:
 *   data: {"type": "token", "content": "..."}
 *   data: {"type": "done", "usage": {...}}
 *
 * Replace with a proxy to the real API once the backend is ready.
 */

const MOCK_RESPONSES = [
  "I'd be happy to help you with that! Let me look into it.",
  "Here's what I found — there are a few approaches we could take. First, let me outline the key considerations.",
  "That's a great question. Based on what I know about you, here's my recommendation.",
  "Sure thing! I've set a reminder for that. I'll follow up when the time comes.",
  "I just did some research on that topic. Here's a summary of the most relevant information I found.",
];

export async function POST(request: NextRequest) {
  const { message } = await request.json();

  if (!message) {
    return new Response(
      JSON.stringify({ error: "MISSING_MESSAGE", message: "Message is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pick a mock response
  const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  const tokens = response.split(/(?<=\s)/); // split on whitespace boundaries

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Simulate thinking delay
      await new Promise((r) => setTimeout(r, 600));

      for (const token of tokens) {
        const event = JSON.stringify({ type: "token", content: token });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        // Random delay between 30-80ms per token for realistic feel
        await new Promise((r) => setTimeout(r, 30 + Math.random() * 50));
      }

      // Send done event
      const doneEvent = JSON.stringify({
        type: "done",
        usage: {
          tokensIn: message.length,
          tokensOut: response.length,
          costUsd: parseFloat((0.001 + Math.random() * 0.005).toFixed(4)),
        },
      });
      controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
