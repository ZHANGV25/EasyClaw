# Code Reviews

## Workflow
1. You and Antigravity build features
2. Share the code with me (paste, screenshot, or push to a repo I can access)
3. I audit for: security, cost leaks, multi-tenancy isolation, error handling, billing logic, container lifecycle
4. Review notes go in `reviews/`

## Review Checklist
- [ ] **Security** — No data leakage between users, auth on every endpoint, secrets in env vars
- [ ] **Multi-tenancy** — Everything scoped to user, no cross-container access
- [ ] **Cost** — API calls metered, container sleep/wake working, no runaway spend
- [ ] **Billing** — Credits deducted correctly, free tier capped, Stripe webhooks handled
- [ ] **Error handling** — Container crashes, API failures, credit exhaustion all graceful
- [ ] **Mobile** — Responsive, works on phone
- [ ] **Free tier abuse** — Rate limits, fraud signals, hard caps enforced
