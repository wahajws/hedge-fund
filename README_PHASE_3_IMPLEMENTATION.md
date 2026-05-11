# Phase 3 Backend Implementation Runbook

The Phase 3 backend has been implemented as a modular Node.js/Express API under `server/`.

The system is Qwen-only for AI orchestration. If `QWEN_API_KEY` is not configured, the backend uses a local mock Qwen gateway that preserves the same source-bound contract and never fabricates market data.

## Run Backend

```powershell
cd C:\Users\wahaj\Documents\hedge-fund-app
npm run dev:api
```

Backend URL:

```text
http://127.0.0.1:4000
```

WebSocket URL:

```text
ws://127.0.0.1:4000/ws
```

## Run Frontend And Backend Together

```powershell
npm run dev:all
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:4000
```

## Smoke Test

With the backend running:

```powershell
npm run smoke:api
```

The smoke test checks:

- API health.
- Deterministic portfolio risk engine.
- Morning macro brief workflow.
- Approval creation.
- Audit trail creation.

## Core Endpoints

```text
GET  /api/health
GET  /api/market-data
GET  /api/macro
GET  /api/news
GET  /api/portfolio
GET  /api/portfolio/:portfolioId
GET  /api/risk
GET  /api/risk/:portfolioId
POST /api/ask
POST /api/workflows/run
GET  /api/workflows
GET  /api/approvals
POST /api/approvals/:id
GET  /api/audit
POST /api/reports/generate
GET  /api/reports
POST /api/ingestion/run
GET  /api/integrations
GET  /api/agent-logs
```

## Example Workflow Run

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:4000/api/workflows/run `
  -Headers @{ "x-user-role" = "cio"; "x-user-id" = "local-cio" } `
  -ContentType "application/json" `
  -Body '{ "workflow": "morning_macro_brief", "portfolioId": "GLOBAL-MACRO-01" }'
```

This creates:

- `ai_workflow`
- six structured agent logs
- deterministic risk snapshot
- draft CIO report
- compliance guardrail result
- approval request
- immutable audit events

## Implemented Backend Modules

```text
server/src/
  app.js
  index.js
  config/env.js
  db/store.js
  db/schema.sql
  integrations/
    fredConnector.js
    alphaVantageConnector.js
    fmpConnector.js
  middleware/
    auth.js
    rateLimit.js
  queues/
    inMemoryQueue.js
  routes/
    api.js
  services/
    agents.js
    approvalService.js
    auditService.js
    ingestionService.js
    macroDataService.js
    marketDataService.js
    newsService.js
    portfolioService.js
    qwenService.js
    reportService.js
    riskEngine.js
    systemHealthService.js
    workflowService.js
  shared/
    events.js
    logger.js
    requestContext.js
  websocket/
    hub.js
```

## Docker

Docker scaffolding is included:

```powershell
docker compose up --build
```

Services:

- `api`
- `postgres`
- `redis`

The current implementation uses an in-memory store for local POC execution and includes `server/src/db/schema.sql` for PostgreSQL migration planning.

