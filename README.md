# Macro Fund AI Operating System

Institutional macro hedge fund intelligence platform built with React, Node.js, real market/macro data pipelines, Qwen multi-agent orchestration, human approval workflows, and enterprise audit/observability scaffolding.

## Stack

- React + Vite + TypeScript + TailwindCSS
- Node.js + Express
- Qwen-only AI orchestration
- Real data adapters for FRED, Alpha Vantage, and Financial Modeling Prep
- WebSocket workflow/event stream
- PostgreSQL/Redis-ready production architecture

## Local Development

```bash
npm install
cp .env.example .env
npm run dev:all
```

Frontend: `http://127.0.0.1:5173`

API: `http://127.0.0.1:4000`

## Verification

```bash
npm run build
npm run smoke:api
```

## Vercel Frontend Deployment

This repository is Vercel-ready for the React frontend. In Vercel, set:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment variable `VITE_API_BASE_URL` to your deployed API URL
- Environment variable `VITE_WS_URL` to your deployed websocket URL

The Express backend should be deployed as a long-running Node service on infrastructure such as Render, Railway, Fly.io, ECS, Kubernetes, or a container host. The backend is Docker-ready through `Dockerfile.api` and `docker-compose.prod.yml`.

## Documentation

- Phase 1/2 strategy: `README_PHASE_1_2.md`
- Phase 3 backend architecture: `README_PHASE_3_BACKEND_ARCHITECTURE.md`
- Phase 4 real data engine: `README_PHASE_4_REAL_DATA_ENGINE.md`
- Phase 5 Qwen orchestration: `README_PHASE_5_QWEN_MULTI_AGENT.md`
- Phase 6 frontend: `README_PHASE_6_FRONTEND.md`
- Phase 8 enterprise readiness: `README_PHASE_8_ENTERPRISE_READINESS.md`
- Operational docs: `docs/phase8/`

