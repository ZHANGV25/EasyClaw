# Architecture & Vibe Coding Rules

## 1. Golden Rules (For Future Agents)
1.  **Isolation First:** Every table MUST have a `user_id`. Every query MUST have `WHERE user_id = ?`.
2.  **Stateless-ish:** Assume the container can die at any second. Write state to DB or S3 immediately.
3.  **Logs are Life:** If it's not logged in `usage`, we can't bill for it.
4.  **Fail Gracefully:** If the AI hallucinates, catch the error. Don't crash the container.

## 2. Infrastructure
*   **Worker Pool Architecture:** Scalable pool of generic workers (NOT one per user).
    *   **Frontend/API:** Creates job rows in `jobs` table (status='PENDING').
    *   **Queue:** Postgres `jobs` table with indexed polling.
    *   **Workers (ECS Fargate):** Pool scales with queue depth (min 1, max 50).
    *   **Each worker polls:** `SELECT * FROM jobs WHERE status='PENDING' LIMIT 1 FOR UPDATE SKIP LOCKED`.
    *   **Worker claims job:** Sets status='RUNNING', worker_id=ECS_TASK_ID, locked_at=NOW().
    *   **Auto-scaling:** Add workers when `pending_jobs > workers * 2`, remove when idle.

## 3. Data Flow
1.  **Ingress:** User message -> API -> INSERT INTO `messages` table.
2.  **Job Creation:** API creates job -> INSERT INTO `jobs` (status='PENDING').
3.  **Job Claim:** Worker polls, claims job atomically (FOR UPDATE SKIP LOCKED).
4.  **Context Load:** Worker fetches user data from SQL, filesystem from S3.
5.  **Execution:** Worker runs task (browser automation, AI agent, etc.).
6.  **Completion:** Worker updates job (status='COMPLETED'), logs usage to `transactions`.
7.  **Loop:** Worker returns to polling for next job.

## 4. Payment Security (The Vault)
*   **Strategy A (MVP):** Human Handoff. Agent builds cart, sends link. Zero liability.
*   **Strategy B (Scale):** Virtual Cards (Stripe Issuing). Agent gets one-time card.

*For full details, read `docs/DATA_SECURITY.md`.*
