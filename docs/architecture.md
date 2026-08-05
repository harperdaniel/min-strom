# Architecture Notes

Status: initial foundation

## Core Shape

Minstrøm is organized around provider-independent domain concepts:

- `User`
- `DataConnection`
- `MeterPoint`
- `MeterValue`
- `SyncRun`

The frontend and dashboard must not depend on Elvia response fields. Provider
packages translate external API responses into Minstrøm domain objects at the
edge.

## Onboarding Model

The current prototype flow is:

```text
Choose data source -> follow provider guide -> paste token -> confirm meter point
```

The desired future flow is:

```text
Connect Elhub -> ID-porten/Elhub consent -> select meter point -> callback
```

Both flows should produce the same internal result: an active `DataConnection`
with one or more `MeterPoint` records.

## First Technical Milestones

1. Keep domain and API contracts provider-neutral.
2. Implement a mock provider and CSV import for local development.
3. Run an Elvia data spike with real, anonymized responses before finalizing the
   Elvia provider and dashboard charts.
4. Add encrypted credential storage and scrubbed logs before any real token is
   accepted.
5. Build the dashboard from normalized meter values and summaries only.

