import { NextResponse } from "next/server";
import { MemoryFact, Learning, MemoryResponse } from "@/types/memory";

// Mock Data
let FACTS: MemoryFact[] = [
  {
    id: "1",
    category: "personal",
    fact: "Lives in New York City",
    learnedAt: "2023-10-15T10:00:00Z",
    source: {
      conversationId: "conv_123",
      messagePreview: "I managed to move to NYC last week.",
    },
  },
  {
    id: "2",
    category: "food",
    fact: "Allergic to peanuts",
    learnedAt: "2023-10-12T14:30:00Z",
  },
  {
    id: "3",
    category: "travel",
    fact: "Prefers aisle seats on long flights",
    learnedAt: "2023-09-28T09:15:00Z",
  },
  {
    id: "4",
    category: "schedule",
    fact: "Work hours are 9-5 EST",
    learnedAt: "2023-10-01T08:00:00Z",
  },
];

let RECENT_LEARNINGS: Learning[] = [
  {
    id: "l1",
    fact: "You prefer Blue Cross Blue Shield for dental",
    category: "health",
    learnedAt: "2023-10-15T11:20:00Z",
    status: "pending",
  },
  {
    id: "l2",
    fact: "Your favorite cuisine is Italian",
    category: "food",
    learnedAt: "2023-10-14T19:45:00Z",
    status: "confirmed",
  },
  {
    id: "l3",
    fact: "You are planning a trip to Japan",
    category: "travel",
    learnedAt: "2023-10-10T16:30:00Z",
    status: "rejected",
  },
];

export async function GET() {
  const response: MemoryResponse = {
    facts: FACTS,
    recentLearnings: RECENT_LEARNINGS.filter((l) => l.status !== "rejected"), // Don't show rejected in main list? Or maybe we do but filtered out. The prompt says "Rejected items are deleted from agent memory", so let's filter them out or show them as history? 
    // Prompt says: "Timeline of recently learned facts ... Each item can be confirmed or rejected ... Rejected items are deleted". 
    // So distinct from "Facts".
  };
  
  // For the purpose of the mock, let's return all pending findings, and maybe confirmed ones too for history.
  // Actually, confirmed ones normally move to facts. But let's keep it simple.
  
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, fact } = body;

    const newFact: MemoryFact = {
      id: Math.random().toString(36).substring(7),
      category,
      fact,
      learnedAt: new Date().toISOString(),
    };

    FACTS.push(newFact);

    return NextResponse.json(newFact);
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
