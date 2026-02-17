// ─── Constants ───────────────────────────────────────────────────────
export const APP_NAME = "EasyClaw";
export const FREE_TIER_CREDITS = 1.0; // $1.00 starting balance
export const CONTAINER_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_MESSAGE_LENGTH = 10_000;

// ─── Container Statuses ──────────────────────────────────────────────
export const CONTAINER_STATUSES = [
  "PROVISIONING",
  "RUNNING",
  "SLEEPING",
  "WAKING",
  "CRASHED",
  "DELETED",
] as const;

export type ContainerStatus = (typeof CONTAINER_STATUSES)[number];

// ─── Types ───────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  tokensUsed?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  creditsBalance: number;
}
