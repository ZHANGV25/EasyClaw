# Architecture & Vibe Coding Rules

## 1. Golden Rules (For Future Agents)
1.  **Isolation First:** Every table MUST have a `user_id`. Every query MUST have `WHERE user_id = ?`.
2.  **Stateless-ish:** Assume the container can die at any second. Write state to DB or S3 immediately.
3.  **Logs are Life:** If it's not logged in `usage`, we can't bill for it.
4.  **Fail Gracefully:** If the AI hallucinates, catch the error. Don't crash the container.

## 2. Infrastructure
*   **Monolith MVP:** Single container per user. Cold start fits the "Assistant" vibe.
*   **Scale (Phase 2):** "Smart Switch" Architecture.
    *   **Dispatcher (Tier 1):** Fast LLM (Haiku) handles routing.
    *   **Queue (Tier 1.5):** Postgres `jobs` table.
    *   **Workers (Tier 2):** Container pool.

## 3. Data Flow
1.  **Ingress:** Webhook -> `messages` table.
2.  **Dispatch:** LLM decides -> `jobs` table.
3.  **Execution:** Container claims job -> Mounts S3 -> Runs -> Sleeps.

## 4. Payment Security (The Vault)
*   **Strategy A (MVP):** Human Handoff. Agent builds cart, sends link. Zero liability.
*   **Strategy B (Scale):** Virtual Cards (Stripe Issuing). Agent gets one-time card.

*For full details, read `docs/DATA_SECURITY.md`.*
