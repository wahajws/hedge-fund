# Phase 6 Frontend Implementation

Phase 6 implements the enterprise frontend experience for the Macro Fund AI Operating System.

The UI is built as an institutional command surface, not a SaaS dashboard or chatbot.

## Stack

- React
- Vite
- TypeScript
- TailwindCSS
- Zustand
- TanStack Query
- Framer Motion
- Recharts
- WebSocket integration

## Key Files

```text
src/main.tsx
src/app/App.tsx
src/phase6.css
src/components/
  Shell.tsx
  Primitives.tsx
  Charts.tsx
src/lib/
  api.ts
  queries.ts
  store.ts
  types.ts
  useLiveEvents.ts
```

## Pages Implemented

- Executive Dashboard
- AI Command Center
- Portfolio Risk Monitor
- Multi-Agent Workflow Center
- Approval Queue
- Audit Trail
- Data Lake / Integrations
- CIO Morning Brief
- System Health Dashboard

## Real Backend Integration

The frontend consumes real backend endpoints:

```text
GET  /api/health
GET  /api/market-data
GET  /api/macro
GET  /api/news
GET  /api/economic-calendar
GET  /api/portfolio/GLOBAL-MACRO-01
GET  /api/risk/GLOBAL-MACRO-01
GET  /api/signals
GET  /api/workflows
POST /api/workflows/run
POST /api/ask
GET  /api/approvals
POST /api/approvals/:id
GET  /api/audit
GET  /api/integrations
GET  /api/reports
POST /api/reports/generate
GET  /api/executive-alerts
```

## WebSocket

The shell connects to:

```text
ws://127.0.0.1:4000/ws
```

It displays live workflow, alert, audit, and system events in the right context rail and bottom ticker.

## Run

Backend:

```powershell
npm run dev:api
```

Frontend:

```powershell
npm run dev -- --port 5173
```

Both:

```powershell
npm run dev:all
```

## Verification

```powershell
npm run build
```

The build currently emits Vite warnings about `"use client"` directives in TanStack Query and Framer Motion packages. These are warnings only; the build succeeds.

## Notes

- The frontend is API-driven, not frontend-mocked.
- Qwen workflows are triggered through backend orchestration APIs.
- Approval actions mutate backend approval state.
- CIO brief generation calls the backend report generator.
- Market data, macro data, signals, risk, alerts, audit, and integrations are loaded through React Query.

