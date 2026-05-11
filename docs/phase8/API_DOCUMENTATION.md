# API Documentation

Core endpoints:

- `GET /api/health`
- `GET /api/ops/readiness`
- `GET /api/ops/metrics`
- `GET /api/market-data`
- `GET /api/macro`
- `GET /api/news`
- `GET /api/economic-calendar`
- `GET /api/portfolio`
- `GET /api/risk`
- `GET /api/signals`
- `POST /api/ask`
- `POST /api/workflows/run`
- `GET /api/workflows`
- `GET /api/approvals`
- `POST /api/approvals/:id`
- `GET /api/audit`
- `POST /api/reports/generate`
- `GET /api/demo/scenarios`
- `POST /api/demo/run`

Authentication:

- Local development may use `x-user-role`.
- Enterprise mode uses `Authorization: Bearer <jwt>`.
- Service calls may use `x-service-token`.
