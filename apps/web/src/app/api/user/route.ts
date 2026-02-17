import { NextResponse } from "next/server";

export async function GET() {
  // Simulate DB fetch delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    id: "user_123",
    name: "Victor",
    email: "victor@example.com",
    timezone: "America/New_York",
    creditsBalance: 4.20,
    container: {
      status: "RUNNING", // RUNNING, SLEEPING, PROVISIONING, STOPPED
      lastActiveAt: new Date().toISOString(),
    },
    assistant: {
      name: "Jarvis",
      interests: "Startup, coding, research",
    },
    createdAt: "2026-02-15T00:00:00Z",
  });
}
