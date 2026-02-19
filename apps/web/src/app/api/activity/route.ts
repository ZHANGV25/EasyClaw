import { NextResponse } from "next/server";
import { Task } from "@/types/activity";

const MOCK_TASKS: Task[] = [
  {
    id: "task-1",
    conversationId: "conv-1",
    summary: "Researched competitor pricing for Q1 report",
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    completedAt: new Date(Date.now() - 1000 * 60 * 55 * 2).toISOString(),
    steps: [
      {
        id: "step-1",
        type: "thought",
        label: "Analyzing request",
        content: "User wants to find pricing for competitors A, B, and C.",
        status: "done",
        durationMs: 500,
      },
      {
        id: "step-2",
        type: "tool-call",
        label: "Searching web",
        args: { query: "competitor A pricing 2024" },
        status: "done",
        durationMs: 1200,
        output: "Found pricing page...",
      },
    ],
  },
  {
    id: "task-2",
    conversationId: "conv-2",
    summary: "Drafted email to potential leads",
    status: "partial",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    steps: [
      {
        id: "step-3",
        type: "thought",
        label: "Drafting email",
        content: " drafting email based on template...",
        status: "done",
        durationMs: 800,
      },
      {
        id: "step-4",
        type: "file-write",
        label: "Writing draft.txt",
        args: { path: "draft.txt" },
        status: "error",
        durationMs: 200,
        output: "Permission denied",
      },
    ],
  },
  {
    id: "task-3",
    conversationId: "conv-3",
    summary: "Scheduled meeting with design team",
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 5000).toISOString(),
    steps: [],
  },
    {
    id: "task-4",
    conversationId: "conv-4",
    summary: "Optimized database queries",
    status: "failed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
    steps: [],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";
  const search = searchParams.get("search") || "";

  let filteredTasks = [...MOCK_TASKS];

  // 1. Filter by time
  const now = new Date();
  if (filter === "today") {
    filteredTasks = filteredTasks.filter((t) => {
      const date = new Date(t.createdAt);
      return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    });
  } else if (filter === "week") {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredTasks = filteredTasks.filter((t) => new Date(t.createdAt) >= oneWeekAgo);
  } else if (filter === "month") {
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filteredTasks = filteredTasks.filter((t) => new Date(t.createdAt) >= oneMonthAgo);
  }

  // 2. Filter by search
  if (search) {
    const lowerSearch = search.toLowerCase();
    filteredTasks = filteredTasks.filter((t) =>
      t.summary.toLowerCase().includes(lowerSearch)
    );
  }
    
    // Sort by createdAt desc
    filteredTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ tasks: filteredTasks, hasMore: false });
}
