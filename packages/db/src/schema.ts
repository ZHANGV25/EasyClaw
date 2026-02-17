import { pgTable, uuid, text, timestamp, integer, real, pgEnum } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────
export const containerStatusEnum = pgEnum("container_status", [
  "PROVISIONING",
  "RUNNING",
  "SLEEPING",
  "WAKING",
  "CRASHED",
  "DELETED",
]);

// ─── Users ───────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  timezone: text("timezone").default("UTC"),
  creditsBalance: real("credits_balance").default(1.0).notNull(), // Free tier: $1.00
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Containers ──────────────────────────────────────────────────────
export const containers = pgTable("containers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: containerStatusEnum("status").default("PROVISIONING").notNull(),
  taskArn: text("task_arn"), // AWS ECS task ARN
  publicIp: text("public_ip"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Usage Logs ──────────────────────────────────────────────────────
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  containerId: uuid("container_id").references(() => containers.id),
  tokensIn: integer("tokens_in").default(0).notNull(),
  tokensOut: integer("tokens_out").default(0).notNull(),
  costUsd: real("cost_usd").default(0).notNull(),
  model: text("model"), // e.g., "claude-3-sonnet"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── API Keys (future use) ──────────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  label: text("label"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
