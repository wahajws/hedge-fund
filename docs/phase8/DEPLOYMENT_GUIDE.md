# Deployment Guide

## Local Production-Like Run

```bash
docker compose -f docker-compose.prod.yml up --build
```

## Required Secrets

Use a vault or orchestrator secret store for:

- `JWT_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `QWEN_API_KEY`
- `FRED_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `FMP_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`

## Kubernetes

Use `ops/k8s/macro-ai-os.yaml` as a starter manifest. In production, replace image tags, mount a secret named `macro-ai-secrets`, and a config map named `macro-ai-config`.

Readiness: `GET /api/ops/readiness`

Liveness: `GET /api/health`
