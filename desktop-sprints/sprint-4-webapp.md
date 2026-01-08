# Leo Desktop - Sprint 4: Web App Integration

## Task
Update the Next.js Web App to support the Desktop Login flow. We need a page (`/authorize`) that the Desktop App opens. This page should check if the user is logged in, and if so, redirect them to `leo://auth?token=...`.

## Completion Criteria
- [ ] Create/Update `src/app/authorize/page.tsx` (or similar route).
- [ ] Implement logic to check for `session` or `authToken` cookie.
- [ ] If logged in, show a "Connecting to Leo Desktop..." UI.
- [ ] Implement the redirect to `leo://auth?token=XYZ`.
- [ ] If NOT logged in, redirect to `/login` with a `returnUrl`.
- [ ] Add a "Open Leo" button in case the automatic redirect is blocked by the browser.

## Max Iterations
10
