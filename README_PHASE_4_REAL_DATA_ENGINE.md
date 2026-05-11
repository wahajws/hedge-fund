# Phase 4 Real Data Engine Implementation

Phase 4 implements the real-data foundation for the Macro Fund AI Operating System.

The backend still runs locally without external credentials by using deterministic mock-provider fallbacks. When API keys are configured and `USE_MOCK_PROVIDERS=false`, the connectors call real provider APIs.

Qwen remains the only LLM integration. Qwen is used only for source-bound reasoning, summarization, classification, interpretation, and report generation.

## Implemented Real Data Sources

### FRED

Configured series:

- `DGS10`
- `FEDFUNDS`
- `CPIAUCSL`
- `UNRATE`
- `GDP`
- `VIXCLS`
- `DTWEXBGS`

### Alpha Vantage

Configured assets:

- `USDJPY`
- `EURUSD`
- `SPY`
- `QQQ`
- `GLD`
- `USO`

Also supports Alpha Vantage news sentiment ingestion.

### Financial Modeling Prep

Configured feeds:

- economic calendar
- financial news

## New Backend Capabilities

- Normalized market price schema.
- Normalized macro indicator schema.
- Normalized news article schema.
- Normalized economic calendar schema.
- Deterministic market intelligence signal engine.
- Source health tracking.
- Circuit breaker state.
- Redis-ready cache with memory fallback.
- Ingestion scheduler.
- Startup ingestion pass.
- API pagination and freshness wrappers.
- Real-data Qwen context methods.

## New Endpoints

```text
GET  /api/economic-calendar
GET  /api/signals
POST /api/intelligence/explain-signals
POST /api/ingestion/run
GET  /api/integrations
```

Existing endpoints now return fresher normalized data where applicable:

```text
GET /api/market-data
GET /api/macro
GET /api/news
GET /api/risk
POST /api/reports/generate
```

## Ingestion Schedule

```text
market-prices:   every 5 minutes
macro-indicators: every 60 minutes
calendar-news:   every 10 minutes
```

Disable scheduler:

```text
DISABLE_INGESTION_SCHEDULER=true
```

## Cache Strategy

```text
market:snapshot  TTL 60s
macro:latest     TTL 300s
news:latest      TTL 120s
calendar:latest  TTL 300s
```

Redis is used when `REDIS_URL` is configured. Otherwise the backend uses memory cache.

## Deterministic Signals

The market intelligence engine detects:

- yield spikes
- CPI surprises
- equity selloffs
- oil proxy shocks
- FX volatility
- VIX/risk-off conditions
- dollar proxy shocks

No Qwen-generated numbers are used. Qwen only explains generated signals.

## Useful Commands

Run backend:

```powershell
npm run dev:api
```

Run ingestion manually:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:4000/api/ingestion/run `
  -Headers @{ "x-user-role" = "cio"; "x-user-id" = "local-cio" } `
  -ContentType "application/json" `
  -Body '{ "sources": ["fred", "alpha_vantage", "fmp"] }'
```

View deterministic signals:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/signals
```

Run API smoke test:

```powershell
npm run smoke:api
```

