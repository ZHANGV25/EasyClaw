import { NextRequest } from "next/server";
import { AgentStep } from "@/types/activity";

/**
 * Mock SSE chat endpoint.
 * Simulates the real backend contract:
 *   data: {"type": "token", "content": "..."}
 *   data: {"type": "activity", "step": {...}}
 *   data: {"type": "artifact", "artifact": {...}}
 *   data: {"type": "done", "usage": {...}}
 */

const MOCK_RESPONSES = [
  "I'd be happy to help you with that! Let me look into it.",
  "Here's what I found — there are a few approaches we could take. First, let me outline the key considerations.",
  "That's a great question. Based on what I know about you, here's my recommendation.",
  "Sure thing! I've set a reminder for that. I'll follow up when the time comes.",
  "I just did some research on that topic. Here's a summary of the most relevant information I found.",
];

const BUILD_KEYWORDS = ["build", "create", "make", "generate", "write"];
const RESEARCH_KEYWORDS = ["research", "plan", "check", "verify", "analyze"];

const MOCK_ARTIFACT_RESPONSE =
  "Here's your Expense Tracker app! I've built it with React — it tracks your expenses by category with a running total. Click **Open** below to view the full source code.";

const MOCK_RESEARCH_RESPONSE =
  "I've analyzed the current market trends and found some interesting patterns. The data suggests a shift towards AI-driven tools in this sector.";

const MOCK_ARTIFACT = {
  id: `artifact-${Date.now()}`,
  conversationId: "",
  title: "Expense Tracker",
  type: "app" as const,
  language: "react",
  files: [
    {
      name: "App.tsx",
      content: `import { useState } from "react";\n\nexport default function App() {\n  return <div>Hello World</div>;\n}`,
    },
  ],
  status: "ready" as const,
  createdAt: new Date().toISOString(),
};

function shouldGenerateArtifact(message: string): boolean {
  const lower = message.toLowerCase();
  return BUILD_KEYWORDS.some((kw) => lower.includes(kw));
}

function shouldGenerateActivity(message: string): boolean {
  const lower = message.toLowerCase();
  return RESEARCH_KEYWORDS.some((kw) => lower.includes(kw));
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
  const hasActivity = shouldGenerateActivity(message);
  
  let responseText = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  if (hasArtifact) responseText = MOCK_ARTIFACT_RESPONSE;
  if (hasActivity) responseText = MOCK_RESEARCH_RESPONSE;

  const tokens = responseText.split(/(?<=\s)/);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to enqueue data
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // 1. Simulate Activity if triggered
      if (hasActivity) {
         // Step 1: Initial Thought
         const thoughtStep: AgentStep = {
            id: "step-1",
            type: "thought",
            label: "Planning research strategy",
            status: "running",
            content: "I need to look up recent trends in the requested sector."
         };
         send({ type: "activity", step: thoughtStep });
         await sleep(800);
         
         thoughtStep.status = "done";
         thoughtStep.durationMs = 800;
         send({ type: "activity", step: thoughtStep });

         // Step 2: Tool Call (Start)
         const toolStep: AgentStep = {
            id: "step-2",
            type: "tool-call",
            label: "Searching web for 'AI trends 2026'",
            status: "running",
            args: { query: "AI trends 2026", limit: 5 }
         };
         send({ type: "activity", step: toolStep });
         await sleep(1500);

         // Step 3: Tool Call (Done)
         toolStep.status = "done";
         toolStep.durationMs = 1500;
         toolStep.output = "Found 5 relevant articles. Key themes: Autonomous Agents, Biotech AI, Sustainable Computing.";
         send({ type: "activity", step: toolStep });
         await sleep(500);

         // Step 4: Analysis Thought
         const analyzeStep: AgentStep = {
             id: "step-3",
             type: "thought",
             label: "Synthesizing findings",
             status: "running",
             content: "The search results highlight a strong move towards agentic workflows. I should emphasize this."
         };
         send({ type: "activity", step: analyzeStep });
         await sleep(1000);
         
         analyzeStep.status = "done";
         analyzeStep.durationMs = 1000;
         send({ type: "activity", step: analyzeStep });
      } else {
        // Just a small delay if no activity
        await sleep(600);
      }

      // 2. Stream Text Response
      for (const token of tokens) {
        send({ type: "token", content: token });
        await sleep(30 + Math.random() * 50);
      }

      // 3. Emit Artifact if triggered
      if (hasArtifact) {
        await sleep(300);
        const artifact = {
          ...MOCK_ARTIFACT,
          id: `artifact-${Date.now()}`,
          conversationId: conversationId || "",
          // Use a simple template for now, keeping existing mock content logic if preferred
        };
        send({ type: "artifact", artifact });
      }

      // 4. Done Event
      send({
        type: "done",
        usage: {
          tokensIn: message.length,
          tokensOut: responseText.length,
          costUsd: parseFloat((0.001 + Math.random() * 0.005).toFixed(4)),
        },
      });
      
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

