import { NextRequest } from "next/server";

/**
 * Mock SSE chat endpoint.
 * Simulates the real backend contract:
 *   data: {"type": "token", "content": "..."}
 *   data: {"type": "artifact", "artifact": {...}}
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

const BUILD_KEYWORDS = ["build", "create", "make", "generate", "write"];

const MOCK_ARTIFACT_RESPONSE =
  "Here's your Expense Tracker app! I've built it with React — it tracks your expenses by category with a running total. Click **Open** below to view the full source code.";

const MOCK_ARTIFACT = {
  id: `artifact-${Date.now()}`,
  conversationId: "",
  title: "Expense Tracker",
  type: "app" as const,
  language: "react",
  files: [
    {
      name: "App.tsx",
      content: `import { useState } from "react";

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 1, description: "Coffee", amount: 4.50, category: "Food", date: "2026-02-17" },
    { id: 2, description: "Uber", amount: 12.00, category: "Transport", date: "2026-02-17" },
    { id: 3, description: "Groceries", amount: 45.30, category: "Food", date: "2026-02-16" },
  ]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif", maxWidth: 480 }}>
      <h1>Expense Tracker</h1>
      <p style={{ fontSize: 28, fontWeight: 700 }}>\${total.toFixed(2)}</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {expenses.map(e => (
          <li key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <span>{e.description} <small>({e.category})</small></span>
            <span>\${e.amount.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}`,
    },
    {
      name: "index.css",
      content: `body {
  margin: 0;
  background: #fafafa;
  color: #111;
}

h1 {
  margin: 0 0 8px;
}
`,
    },
  ],
  status: "ready" as const,
  createdAt: new Date().toISOString(),
};

function shouldGenerateArtifact(message: string): boolean {
  const lower = message.toLowerCase();
  return BUILD_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function POST(request: NextRequest) {
  const { message, conversationId } = await request.json();

  if (!message) {
    return new Response(
      JSON.stringify({ error: "MISSING_MESSAGE", message: "Message is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const hasArtifact = shouldGenerateArtifact(message);
  const response = hasArtifact
    ? MOCK_ARTIFACT_RESPONSE
    : MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  const tokens = response.split(/(?<=\s)/);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Simulate thinking delay
      await new Promise((r) => setTimeout(r, 600));

      for (const token of tokens) {
        const event = JSON.stringify({ type: "token", content: token });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        await new Promise((r) => setTimeout(r, 30 + Math.random() * 50));
      }

      // Emit artifact event if triggered
      if (hasArtifact) {
        await new Promise((r) => setTimeout(r, 300));
        const artifact = {
          ...MOCK_ARTIFACT,
          id: `artifact-${Date.now()}`,
          conversationId: conversationId || "",
        };
        const artifactEvent = JSON.stringify({ type: "artifact", artifact });
        controller.enqueue(encoder.encode(`data: ${artifactEvent}\n\n`));
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

