import { NextResponse } from "next/server";
import { Reminder } from "@/types/reminders";

const MOCK_REMINDERS: Reminder[] = [
  {
    id: "rem-1",
    text: "Review Q1 performance with team",
    schedule: {
      kind: "at",
      nextFireAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
      humanReadable: "Tomorrow at 9:00 AM",
      recurrence: "one-time",
    },
    status: "active",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    conversationId: "conv-1",
  },
  {
    id: "rem-2",
    text: "Pay monthly server invoice",
    schedule: {
      kind: "every",
      nextFireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // In 3 days
      humanReadable: "Every month on the 22nd",
      recurrence: "monthly",
    },
    status: "active",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    id: "rem-3",
    text: "Take vitamins",
    schedule: {
      kind: "at",
      nextFireAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(), // In 12 hours
      humanReadable: "Daily at 8:00 AM",
      recurrence: "daily",
    },
    status: "paused",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "rem-4",
    text: "Call Mom",
    schedule: {
      kind: "at",
      nextFireAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago (should be past)
      humanReadable: "Sunday at 2:00 PM",
      recurrence: "weekly",
    },
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    lastFiredAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "rem-5",
    text: "Check flight prices to Tokyo",
    schedule: {
      kind: "at",
      nextFireAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
      humanReadable: "One-time",
      recurrence: "one-time",
    },
    status: "expired",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    lastFiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
];

export async function GET() {
  const upcoming = MOCK_REMINDERS.filter(
    (r) => r.status === "active" || r.status === "paused"
  ).sort((a, b) => new Date(a.schedule.nextFireAt).getTime() - new Date(b.schedule.nextFireAt).getTime());

  const past = MOCK_REMINDERS.filter(
    (r) => r.status === "completed" || r.status === "expired"
  ).sort((a, b) => {
    // Sort by lastFiredAt desc, or createdAt desc if never fired
    const timeA = a.lastFiredAt ? new Date(a.lastFiredAt).getTime() : new Date(a.createdAt).getTime();
    const timeB = b.lastFiredAt ? new Date(b.lastFiredAt).getTime() : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  return NextResponse.json({ upcoming, past });
}

// Mock update (pause/resume)
export async function PATCH(request: Request) {
    // checking if id is valid is omitted for mock
    return NextResponse.json({ success: true });
}

// Mock delete
export async function DELETE(request: Request) {
    return NextResponse.json({ success: true });
}
