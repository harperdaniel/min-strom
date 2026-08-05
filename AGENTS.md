# Minstrøm Project Rules

This repo builds Minstrøm, an independent service for private electricity customers
to understand their own consumption without depending on a power supplier app.

## Product Direction

- Treat the manual Elvia token flow as a temporary prototype path, not the core
  product model.
- Build all onboarding around connecting a data source. Do not build domain or UI
  assumptions around a pasted token field.
- Keep the dashboard independent of provider-specific response formats.
- Preserve a clean transition path to Elhub + ID-porten consent.
- Use clear Norwegian copy for non-technical users. Be honest about prototype
  limitations and user effort.

## Architecture

- TypeScript throughout.
- React + Vite for web.
- Node.js + Express for API.
- pnpm workspaces for the monorepo.
- Shared Zod contracts for API boundaries.
- External provider responses must be normalized at the provider boundary.
- Internal flows should end in `DataConnection`, `MeterPoint`, and `MeterValue`.

## Security And Privacy

- Treat meter values as sensitive personal data.
- Never log, return, store in browser storage, or place tokens in URLs.
- Store provider credentials encrypted, with key-version metadata.
- Add ownership checks to all user-scoped resources.
- Keep account deletion, data deletion, and provider disconnection as first-class
  product requirements.

## Working Style

- Prefer small, focused changes over broad rewrites.
- Do not invent Elvia or Elhub API details. Verify docs or test responses before
  locking behavior.
- Keep demo/mock data visibly separate from real provider data.
- Before production-impacting changes, inspect, plan, patch, test, and review the
  diff.

