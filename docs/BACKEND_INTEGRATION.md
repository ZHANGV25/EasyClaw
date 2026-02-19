# Backend Integration Plan

This document details the specific API endpoints, data models, and logic required to connect the new frontend features (Activity, Reminders, Browser) to the real backend.

## 1. Activity History (`/activity`)

**Frontend Component:** `apps/web/src/app/activity/page.tsx`
**Current Mock:** `apps/web/src/app/api/activity/route.ts`

### Required API Endpoint
`GET /api/activity`

### Query Parameters
- `filter`: 'all' | 'today' | 'week' | 'month' (optional, default 'all')
- `search`: string (optional)
- `page`: number (optional, for pagination)

### Expected Response
```json
{
  "tasks": [
    {
      "id": "uuid",
      "type": "search" | "booking" | "research" | "reminder",
      "summary": "string",
      "status": "completed" | "failed" | "in-progress",
      "timestamp": "ISO8601",
      "details": {
        "steps": [
          { "status": "completed", "text": "string", "timestamp": "ISO8601" }
        ],
        "result": "string"
      }
    }
  ],
  "hasMore": boolean
}
```

### Backend Logic
- Query the **`jobs` table**.
- Filter by `user_id` (from auth context).
- Map `jobs` columns to `Task` interface:
    - `id` -> `id`
    - `type` -> `type` (or infer from input_payload)
    - `status` -> `status`
    - `created_at` -> `timestamp`
    - `result_payload` -> `details`
- Implement pagination using `LIMIT` and `OFFSET`.

---

## 2. Reminders (`/reminders`)

**Frontend Component:** `apps/web/src/app/reminders/page.tsx`
**Current Mock:** `apps/web/src/app/api/reminders/route.ts`

### Required API Endpoints

#### A. List Reminders
`GET /api/reminders`

**Expected Response:**
```json
{
  "upcoming": [
    {
      "id": "uuid",
      "text": "string",
      "status": "active" | "paused",
      "schedule": {
        "nextFireAt": "ISO8601",
        "humanReadable": "string"
      }
    }
  ],
  "past": [
    {
      "id": "uuid",
      "text": "string",
      "status": "completed" | "expired",
      "lastFiredAt": "ISO8601"
    }
  ]
}
```

**Backend Logic:**
- Query the **`reminders` table** (New table needed, or `jobs` with `type='CRON'`).
- **Recommendation:** Create a specific `reminders` table for better recurring task management.
- Split results into `upcoming` (future `next_fire_at`) and `past` (completed or `next_fire_at` < now).

#### B. Update Reminder
`PATCH /api/reminders` (Body: `{ id, status }`)

**Backend Logic:**
- Update `status` in DB.
- If pausing/resuming, update the cron scheduler or worker job accordingly.

#### C. Delete Reminder
`DELETE /api/reminders?id={uuid}`

**Backend Logic:**
- Delete row from DB.
- Cancel any pending scheduled jobs.

---

## 3. Live Browser View (`/browser`)

**Frontend Component:** `apps/web/src/app/browser/page.tsx`
**Current Mock:** `apps/web/src/app/api/browser/stream/route.ts` & `status/route.ts`

### Required API Endpoints

#### A. Stream
`GET /api/browser/stream` (SSE)

**Backend Logic:**
- **Redis Pub/Sub** is recommended here.
- Worker container publishes screenshots/frames to a Redis channel `browser:stream:{userId}`.
- This API endpoint subscribes to that channel and streams data to the client via SSE.
- **Protocol:** Server-Sent Events (text/event-stream).

#### B. Status
`GET /api/browser/status`

**Expected Response:**
```json
{
  "active": boolean,
  "currentUrl": "string",
  "lastScreenshotAt": "ISO8601"
}
```

**Backend Logic:**
- Check **Redis** for the latest key `browser:status:{userId}` OR check `jobs` table for any `RUNNING` job with `type='BROWSER'`.

---

## 4. Frontend Changes Needed

1.  **Remove Mock Data:**
    - Delete `MOCK_TASKS` in `activity/route.ts`.
    - Delete `MOCK_REMINDERS` in `reminders/route.ts`.
    - Delete `SCENES` in `browser/stream/route.ts`.

2.  **DTO Implementation:**
    - Update API routes to import the real Database Client (e.g., `db` from `@/lib/db`).
    - Replace static returns with `await db.query(...)`.

3.  **Authentication:**
    - Ensure every API route calls `auth()` (from Clerk) to get `userId`.
    - Pass `userId` to every DB query.

4.  **Error Handling:**
    - Add `try/catch` blocks for DB failures.
    - Return proper HTTP 500/400 codes.
