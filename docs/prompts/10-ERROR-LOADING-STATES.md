# Prompt: Consistent Error & Loading State Patterns

## Priority: v2

## Context
We have an EasyClaw web app (Next.js, Tailwind, Clerk auth). Some pages have error handling and loading states, but they're inconsistent. We need a unified pattern.

## What to Build

### 1. Error Boundary Component: `apps/web/src/components/ErrorBoundary.tsx`
A React error boundary that catches render errors and shows a friendly fallback.

- Headline: "Something went wrong"
- Subtitle: "We're looking into it. Try refreshing the page."
- "Refresh" button that reloads the page
- "Go home" link back to `/`
- Report error to console (don't add external error tracking)

### 2. API Error Component: `apps/web/src/components/ApiError.tsx`
A reusable inline error component for failed API calls.

```typescript
interface ApiErrorProps {
  message?: string; // Custom message, default: "Failed to load data"
  onRetry?: () => void; // Retry callback
}
```

- Shows: error icon + message + "Try again" button (if onRetry provided)
- Small, inline — not full-page
- Replaces the content area (not a modal or overlay)

### 3. Page Loading Component: `apps/web/src/components/PageLoading.tsx`
Full-page loading state for route transitions.

- Centered spinner or three-dot pulse animation
- "Loading..." text below (subtle)
- Used in `loading.tsx` files for each route

### 4. Add `loading.tsx` files
Create `loading.tsx` for each route that needs it:
- `apps/web/src/app/dashboard/loading.tsx`
- `apps/web/src/app/chat/loading.tsx`
- `apps/web/src/app/settings/loading.tsx`
- `apps/web/src/app/activity/loading.tsx` (if exists)
- `apps/web/src/app/reminders/loading.tsx` (if exists)

Each just renders `<PageLoading />`.

### 5. Update existing pages
Go through each page and ensure:
- Loading state → shows skeleton or `<PageLoading />`
- Error state → shows `<ApiError onRetry={refetch} />`
- No page ever shows a blank white screen during load
- No page silently swallows errors

Pages to check: `dashboard/page.tsx`, `settings/page.tsx`, `telegram/page.tsx`, `chat/page.tsx`

### Styling
- Use CSS variables for theme compatibility
- Spinner: simple CSS (border spinner or dot pulse), no SVG animation library
- Error states: centered, max-width 400px
- Error icon: red circle with exclamation, using SVG inline
- Match existing dashboard aesthetic

### Don't
- Don't add Sentry or any error tracking service
- Don't add new dependencies
- Don't modify any business logic — just wrap existing error handling in consistent components
