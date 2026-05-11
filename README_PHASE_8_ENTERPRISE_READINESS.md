# Phase 8 - Productionization and Enterprise Readiness

## Objective

Phase 8 converts the Macro Fund AI Operating System from a strong institutional POC into an enterprise-ready operating layer. The focus is deployment maturity, operational resilience, identity, observability, governance, and production migration clarity.

The product positioning remains:

Bloomberg Terminal + Palantir Foundry + macro intelligence operations + Qwen-powered workflow orchestration.

This is not an autonomous trading system. It is an AI-assisted, human-supervised operational intelligence platform.

## Deployment Architecture

### Runtime Services

| Service | Responsibility | Production Shape |
|---|---|---|
| `web` | React/Vite institutional frontend | Static Nginx container |
| `api` | Express API, Qwen orchestration, workflow APIs | Horizontally scalable Node service |
| `reverse-proxy` | API/web/websocket routing | Nginx or enterprise API gateway |
| `postgres` | Durable institutional system of record | Managed PostgreSQL in production |
| `redis` | Cache, queue, coordination layer | Managed Redis or Redis Cluster |
| `qwen` | External Alibaba Qwen API | Isolated outbound integration |
| `workers` | Future ingestion/workflow queue workers | Separate deployments when workloads grow |

### Added Deployment Assets

- `Dockerfile.api`: production API image.
- `Dockerfile.web`: frontend static image.
- `nginx.conf`: frontend security headers.
- `ops/nginx-gateway.conf`: reverse proxy for `/api`, `/ws`, and web.
- `docker-compose.prod.yml`: production-like local stack.
- `ops/k8s/macro-ai-os.yaml`: Kubernetes starter manifests.

### Environment Strategy

Development:

- `AUTH_REQUIRED=false`
- local `.env`
- direct ports `5173` and `4000`

Staging:

- `AUTH_REQUIRED=true`
- staging provider keys
- staging Qwen key
- staging PostgreSQL and Redis
- restricted CORS

Production:

- secrets injected by vault or cloud secret manager
- no checked-in `.env`
- managed PostgreSQL
- managed Redis
- private network egress to Qwen endpoint
- API behind enterprise gateway or service mesh

Critical variables:

```text
AUTH_REQUIRED=true
JWT_SECRET=<vault-managed>
INTERNAL_SERVICE_TOKEN=<vault-managed>
FRED_API_KEY=<vault-managed>
ALPHA_VANTAGE_API_KEY=<vault-managed>
FMP_API_KEY=<vault-managed>
QWEN_API_KEY=<vault-managed>
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
DATABASE_URL=<managed-postgres-url>
REDIS_URL=<managed-redis-url>
USE_MOCK_PROVIDERS=false
```

## Enterprise Authentication

The backend now has JWT-ready authentication scaffolding in `server/src/services/authService.js`.

Supported identity paths:

- Local development headers: `x-user-id`, `x-user-role`, `x-user-name`
- Enterprise JWT: `Authorization: Bearer <token>`
- Internal service auth: `x-service-token`

`AUTH_REQUIRED=true` forces JWT or service-token authentication for protected routes.

### Role Matrix

| Role | Primary Users | Permissions |
|---|---|---|
| `cio` | CIO, executive sponsor | read, run, approve, generate |
| `pm` | Portfolio manager | read, run, approve risk, generate reports |
| `risk` | Risk officer | read, run risk workflows, approve risk |
| `compliance` | Compliance officer | read, audit, compliance approval |
| `operations` | Ops analyst | read health/integrations, run ingestion |
| `analyst` | Macro/research analyst | read, run workflows, generate drafts |
| `admin` | Platform administrator | full platform administration |

Production SSO integration should map SAML/OIDC groups into these roles.

## Observability

New operational endpoints:

```text
GET /api/ops/readiness
GET /api/ops/metrics
GET /api/ops/permission-matrix
```

Metrics now cover:

- workflow completion counts and latency
- waiting-for-human workflows
- pending approval bottlenecks
- Qwen invocation count
- agent confidence
- guardrail frequency
- stale market feeds
- failed ingestion items
- source health and circuit breaker state
- latest portfolio risk severity
- executive alert frequency

Recommended production stack:

- structured logs to ELK, Datadog, Splunk, or CloudWatch
- metrics to Prometheus
- traces to OpenTelemetry collector
- alerting to PagerDuty or enterprise incident tooling
- audit trail to immutable storage or WORM archive

## Resilience

Implemented resilience behavior:

- provider circuit breakers
- per-provider health state
- partial ingestion failure handling
- FRED, Alpha Vantage, and FMP feed failures no longer crash full workflows
- Qwen timeout/retry handling
- websocket heartbeat/ping support
- readiness endpoint for orchestration platforms
- audit events for workflow and Qwen invocation lifecycle

Recommended next hardening:

- move queues from in-memory to Redis-backed durable queues
- add dead-letter queues with replay UI
- persist all data to PostgreSQL instead of memory store
- add retry policies by source type and error class
- add provider-specific rate-limit state
- add workflow recovery from last successful agent step

## Security Hardening

Current readiness:

- Helmet headers
- CORS controls
- rate limiting
- JWT-ready auth
- service-token path
- RBAC permission checks
- audit hashing
- no model-generated market values
- source-bound Qwen outputs

Production requirements:

- vault-managed secrets
- mTLS or service mesh for internal service calls
- encrypted PostgreSQL volumes
- TLS-only websocket channels
- field-level encryption for sensitive portfolio data
- immutable audit retention
- separate staging and production Qwen/API keys
- private egress allowlist to financial data providers

## Multi-Tenancy

The schema has been extended for tenant/team readiness:

- `tenants`
- `teams`
- `users.tenant_id`
- `users.team_id`
- `portfolio_positions.tenant_id`
- `portfolio_positions.team_id`
- `ai_workflows.tenant_id`
- `ai_workflows.team_id`
- `approvals.tenant_id`
- `approvals.team_id`

Production tenant isolation should enforce:

- tenant-scoped query filters at repository layer
- tenant-scoped cache keys
- portfolio-level authorization checks
- team-specific approval routing
- separate audit lineage by tenant

## Performance

Current performance posture:

- paginated APIs exist on primary list endpoints
- React Query caching and refetch intervals
- websocket streaming for operational events
- Redis-ready cache service
- provider ingestion scheduling

Production optimization plan:

- Redis cache namespaces: `tenant:{id}:market`, `tenant:{id}:risk`, `tenant:{id}:workflow`
- separate ingestion workers from API process
- stream long workflow updates over websocket rather than blocking HTTP
- frontend lazy-load heavy pages
- chunk vendor bundles
- precompute executive metrics
- persist latest dashboard snapshots

## Executive Operational Metrics

Executive KPIs should include:

- workflow completion time
- workflows waiting for human approval
- approval aging
- Qwen guardrail frequency
- stale source count
- source failure count
- risk severity trend
- executive alert count
- portfolio pressure trend
- generated reports and approval status

These are now exposed through `/api/ops/metrics`.

## API Additions

```text
POST /api/auth/token
GET  /api/ops/readiness
GET  /api/ops/metrics
GET  /api/ops/permission-matrix
```

Example token request:

```json
{
  "sub": "cio-001",
  "role": "cio",
  "name": "Chief Investment Officer",
  "tenantId": "macro-fund",
  "teamId": "global-macro"
}
```

## Operational Handbook

Daily startup checks:

1. Confirm `/api/ops/readiness` is not degraded.
2. Confirm FRED and Alpha Vantage are healthy.
3. Review FMP entitlement state if calendar/news feeds show `402`.
4. Confirm Qwen gateway is healthy.
5. Run morning workflow.
6. Review pending approvals.
7. Generate CIO Morning Brief.

Incident response:

1. Identify source or workflow failure in `/api/ops/metrics`.
2. Check provider circuit breaker status.
3. Confirm whether stale data appears in risk or brief outputs.
4. Trigger ingestion retry only after provider status recovers.
5. Escalate high-risk AI recommendations to CIO/compliance.
6. Preserve audit trail and workflow IDs in incident record.

## POC To Production Roadmap

### POC State

- in-memory operational store
- real API keys supported
- Qwen live integration
- real data ingestion with graceful partial failures
- enterprise-looking frontend
- RBAC scaffolding
- deployment-ready Docker/Kubernetes templates

### Production Requirements

1. Replace in-memory store with PostgreSQL repositories.
2. Replace in-memory queues with Redis-backed durable queues.
3. Add migrations and schema versioning.
4. Integrate SSO through OIDC/SAML.
5. Add OpenTelemetry traces.
6. Add immutable audit storage.
7. Add secrets manager.
8. Add CI/CD gates.
9. Add disaster recovery plan.
10. Add source-provider SLAs and fallback feeds.

### Bloomberg/Reuters Roadmap

- create provider adapter interface for terminal/enterprise feeds
- map Bloomberg tickers to canonical symbols
- store provider lineage per value
- add entitlement-aware data access
- add field-level source trust scoring
- add side-by-side source reconciliation

## Final Enterprise Positioning

The system now demonstrates:

- real macro and market ingestion
- source-bound Qwen reasoning
- human-supervised workflow orchestration
- approval gates
- audit visibility
- operational metrics
- deployment-ready service layout
- enterprise identity scaffolding
- institutional failure handling

It is now credible as a hedge-fund internal platform POC with a clear path to production deployment.
