# Phase 2 Handover: Agent Activity Blocks

## Status
- **Phase 1 (Artifact System)** is **COMPLETE**.
    - Artifacts (apps, scripts) are persistent, have a split-pane UI, and support live preview via Sandpack.
    - All code is pushed to `main`.
- **Phase 2 (Agent Activity Blocks)** is **COMPLETE**.
    - Agent "thoughts" and "tool calls" are visualized in the chat stream.
    - Sidebar navigation is fixed and persistent.

## Goal
Visualize the agent's internal process (thinking, tool calls, terminal output) in the chat stream using collapsible "Activity Blocks".

## Roadmap
1. **Data Model**: Expand `types/activity.ts` to support `thought`, `tool-call`, `terminal`, `file-write` step types.
2. **Mock API**: Update `app/api/chat/route.ts` to stream `activity` events (simulating a multi-step task like "research").
3. **UI Components**:
    - Create `components/ActivityBlock.tsx` (collapsible container).
    - Create sub-components for each step type (e.g., `ToolStep` with inputs/outputs).
    - Update `ChatView.tsx` to render `ActivityBlock` in messages.

## Key Files to Touch
- `apps/web/src/types/activity.ts` (Start here!)
- `apps/web/src/components/ChatMessage.tsx` (or `ChatView.tsx`)
- `apps/web/src/app/api/chat/route.ts`

## Prompt for Next Agent
"We are starting Phase 2: Agent Activity Blocks.
1. Review `types/activity.ts` and `implementation_plan.md`.
2. Expand the `AgentStep` type to support thoughts, tool calls, and terminal usage.
3. Create the `ActivityBlock` component to visualize these steps.
4. Update the mock chat API to stream sample activity data."
