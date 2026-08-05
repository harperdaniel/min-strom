# Minstrøm

Minstrøm is an independent, multi-user prototype for seeing and understanding
your own electricity consumption, regardless of power supplier.

The first supported data path is a user-created Elvia MeterValue API token. That
manual flow is intentionally temporary: the app is structured around generic
data-source connections so Elhub + ID-porten consent can replace it later.

## Current Scope

- Landing page explaining the product without hiding prototype friction.
- Account and connection flow architecture for data providers.
- Normalized domain model for data connections, meter points, meter values, and
  sync runs.
- Web, API, worker, provider, database, and shared contract packages.

## Local Development

```sh
pnpm install
pnpm dev
```

Useful commands:

```sh
pnpm build
pnpm typecheck
pnpm test
```

## Repository Layout

```text
apps/
  web/      React/Vite frontend
  api/      Express API
  worker/   Scheduled sync worker
packages/
  domain/        Provider-independent domain types and rules
  api-contract/  Shared Zod API schemas
  providers/     Elvia now, Elhub later
  database/      PostgreSQL schema and repositories
  config/        Shared TypeScript config
docs/
  project-brief.md
  architecture.md
  dataspike.md
infra/
  docker-compose.yml
```

## Product Principle

When in doubt, ask whether a choice makes it easier for a normal electricity
customer to understand and control their own consumption without becoming more
dependent on a power supplier or on Minstrøm itself.

