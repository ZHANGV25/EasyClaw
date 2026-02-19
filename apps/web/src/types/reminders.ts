export interface Reminder {
  id: string;
  text: string;
  schedule: {
    kind: "at" | "every" | "cron";
    nextFireAt: string; // ISO timestamp
    humanReadable: string; // "Every Sunday at 2 PM"
    recurrence: "one-time" | "daily" | "weekly" | "monthly" | "custom";
  };
  status: "active" | "paused" | "completed" | "expired";
  createdAt: string;
  lastFiredAt?: string;
  conversationId?: string; // link back to chat where it was created
}
