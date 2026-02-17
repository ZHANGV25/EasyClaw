# Data Management & Security Plan

This document outlines the source of truth for all data in EasyClaw. It is designed to be "agent-readable" so future agents know exactly where things go.

## User Review Required
> [!IMPORTANT]
> **Payment Security**: We will NOT store credit card numbers. We will use a "Vault" pattern (Stripe PCI Proxy or Encryption) for sensitive user data.
> **Vibe Coding**: The rule is "Ship fast, but don't leak data." Multi-tenancy isolation is the one rule we never break.

## 1. The Database (PostgreSQL)

This is the metadata layer. It tracks *who* owns *what* and *what* is happening.

### Schema Overview

| Table | Purpose | Critical Columns |
| :--- | :--- | :--- |
| **`users`** | Identity & billing status. | `id` (UUID), `clerk_id`, `email`, `credits_balance` |
| **`containers`** | Infrastructure state. | `id`, `user_id`, `task_arn` (AWS ID), `status` (RUNNING/STOPPED), `last_heartbeat` |
| **`jobs`** | The "To-Do" list for agents. | `id`, `user_id`, `type` (RESEARCH, REMINDER), `payload` (JSON), `status` (PENDING, PROCESSING, FAILED), `scheduled_for` |
| **`usage`** | Cost tracking. | `id`, `user_id`, `tokens_in`, `tokens_out`, `cost_usd`, `model` |
| **`user_secrets`**| **[NEW]** Sensitive data vault. | `id`, `user_id`, `key` (e.g. "STRIPE_CARD"), `value_encrypted` (AES-256) |

### Agent Rules for Database
1.  **Always use transactions** when deducting credits. `BEGIN -> UPDATE balance -> INSERT usage -> COMMIT`.
2.  **Never delete** usage logs. They are financial records.
3.  **Job Queue Pattern:** When claiming a job, use `FOR UPDATE SKIP LOCKED` to prevent race conditions.

## 2. File Storage (S3)

This is the "Brain" of the agent.

*   **Bucket Structure:** `s3://easyclaw-user-data/{user_id}/`
*   **Key Files:**
    *   `SOUL.md`: Personality & instructions.
    *   `USER.md`: Facts about the user ("Likes spicy food").
    *   `MEMORY.md`: Long-term memory index.
    *   `daily/{date}.md`: Daily logs.

### Agent Rules for S3
1.  **Read-Only SOUL:** Agents should rarely edit their own `SOUL.md`.
2.  **Append-Only Logs:** Never overwrite history logs.

## 3. Payments & Secrets (The Hard Part)

**Scenario:** User says *"Buy me a ticket to Tokyo with my Visa."*

### Strategy A: The "Human Handoff" (MVP - Safest)
The agent does 95% of the work (adds to cart, fills address) but stops at the payment field.
1.  **Agent Action:** `handoff_payment(url="https://airline.com/checkout")`.
2.  **User Experience:** Gets a notification: "Please complete payment here: [Link]".
3.  **Security Goal:** We never touch the card. Zero liability.

### Strategy B: Virtual Cards (Scale - Stripe Issuing)
The agent generates a one-time-use virtual card for the transaction.
1.  **Provider:** Stripe Issuing or Privacy.com API.
2.  **Flow:**
    *   Agent requests virtual card for `$500` (flight cost + buffer).
    *   System generates card details (PAN, CVV, Exp).
    *   Agent enters these details into the checkout form.
3.  **Security Goal:** If the card leaks, it's limited to $500 and one merchant.
4.  **Database Impact:** Need a `virtual_cards` table to track usage and limits.

**Rule:** For now, default to **Strategy A**. Only move to B when we have legal/compliance resources.

## 4. Vibe Coding Rules (For Agents)

When adding new features, follow these axioms:

1.  **Isolation First:** Every table MUST have a `user_id`. Every query MUST have `WHERE user_id = ?`. No exceptions.
2.  **Stateless-ish:** Assume the container can die at any second. Write state to DB or S3 immediately.
3.  **Logs are Life:** If it's not logged in `usage`, we can't bill for it. If we can't bill, we die.
4.  **Fail Gracefully:** If the AI hallucinates or the tool fails, catch the error and tell the user "I tried, but X happened." Don't crash the container.
