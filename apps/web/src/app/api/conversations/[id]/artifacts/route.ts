import { NextResponse } from "next/server";

/**
 * Mock artifacts endpoint.
 * GET /api/conversations/[id]/artifacts → returns artifacts for a conversation
 */

const MOCK_ARTIFACTS = [
  {
    id: "artifact-1",
    conversationId: "conv-3",
    title: "Expense Tracker",
    type: "app",
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
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <h1>Expense Tracker</h1>
      <p style={{ fontSize: 28, fontWeight: 700 }}>\${total.toFixed(2)}</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {expenses.map(e => (
          <li key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <span>{e.description} <small style={{ color: "#888" }}>({e.category})</small></span>
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
    status: "ready",
    createdAt: "2026-02-17T09:05:00Z",
  },
  {
    id: "artifact-2",
    conversationId: "conv-2",
    title: "Study Timer",
    type: "script",
    language: "python",
    files: [
      {
        name: "timer.py",
        content: `#!/usr/bin/env python3
\"\"\"Pomodoro study timer with notifications.\"\"\"
import time
import sys

WORK_MINUTES = 25
BREAK_MINUTES = 5

def countdown(minutes: int, label: str):
    total = minutes * 60
    for remaining in range(total, 0, -1):
        mins, secs = divmod(remaining, 60)
        print(f"\\r{label}: {mins:02d}:{secs:02d}", end="", flush=True)
        time.sleep(1)
    print()

def main():
    sessions = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    for i in range(1, sessions + 1):
        print(f"\\nSession {i}/{sessions}")
        countdown(WORK_MINUTES, "Work")
        print("Break time!")
        if i < sessions:
            countdown(BREAK_MINUTES, "Break")
    print("\\nAll sessions complete!")

if __name__ == "__main__":
    main()
`,
      },
    ],
    status: "ready",
    createdAt: "2026-02-16T20:15:30Z",
  },
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 150));

  const artifacts = MOCK_ARTIFACTS.filter((a) => a.conversationId === id);
  return NextResponse.json({ artifacts });
}
