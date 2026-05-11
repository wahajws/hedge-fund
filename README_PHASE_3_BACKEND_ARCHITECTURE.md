# Macro Fund AI Operating System - Phase 3 Backend Architecture

This document captures Phase 3: backend architecture and AI orchestration design.

This phase is backend-only. It does not define frontend design and does not include implementation code.

Important system constraint:

- Alibaba Qwen is the only allowed LLM.
- No other LLM provider should be used or recommended.
- Qwen is used for reasoning, summarization, classification, interpretation, orchestration, and report generation.
- Qwen is not used for market data generation, raw calculations, pricing, risk math, or compliance enforcement.

The backend should feel like a Palantir + Bloomberg + enterprise AI orchestration layer for a macro hedge fund.

---

## 1. Backend System Architecture

### Core Architecture Pattern

```text
Express API Gateway
  -> Auth / RBAC / Rate Limit Middleware
  -> Domain Services
    -> Market Data Service
    -> Macro Data Service
    -> News Service
    -> Portfolio Service
    -> Risk Engine
    -> Workflow Orchestrator
    -> Qwen Orchestration Service
    -> Compliance Service
    -> Approval Service
    -> Audit Service
    -> Report Service
  -> PostgreSQL
  -> Redis
  -> WebSocket Gateway
  -> External Data Connectors
```

Start as a modular Node.js/Express backend with strict service boundaries. Each module should be microservice-ready later by isolating schemas, repositories, queues, service interfaces, and audit events.

### Service Boundaries

| Service | Responsibility |
|---|---|
| API Gateway | HTTP routing, auth, RBAC, request validation, rate limits |
| Data Ingestion | Pulls external data, retries, normalizes, stores source snapshots |
| Market Data | FX, ETF proxies, commodities, rates proxies, market moves |
| Macro Data | FRED indicators, economic releases, calendar events |
| News Intelligence | News ingestion, deduplication, clustering, source metadata |
| Portfolio Service | Positions, exposures, portfolio snapshots |
| Risk Engine | Deterministic exposure impact, severity, concentration risk |
| Workflow Orchestrator | Runs multi-agent workflows and approval gates |
| Qwen Service | Central Qwen gateway, prompt templates, structured outputs |
| Compliance Service | Deterministic policy checks and Qwen wording review |
| Approval Service | Review queues, signoff, escalation, overrides |
| Audit Service | Append-only event trail for every material action |
| Report Service | Generates CIO briefings and institutional reports |

---

## 2. Event-Driven Workflow Architecture

Redis-backed queues should power async backend work.

```text
scheduler:data-ingest
  -> queue:market-data
  -> queue:macro-data
  -> queue:news-data
  -> queue:workflow
  -> queue:qwen
  -> queue:approval
  -> queue:report
  -> queue:audit
```

Important event types:

```text
market_data.updated
macro_indicator.updated
economic_event.released
news_cluster.created
portfolio_snapshot.created
risk_snapshot.created
agent_run.started
agent_run.completed
approval.requested
approval.completed
report.generated
compliance.flagged
audit.recorded
```

Redis usage:

- Job queues.
- Short-lived market data cache.
- Idempotency keys.
- Rate-limit counters.
- Workflow locks.
- WebSocket pub/sub.
- Agent run state cache.

PostgreSQL remains the system of record.

---

## 3. Complete Data Flow

```text
External APIs
  -> Connector adapters
  -> Raw source snapshot storage
  -> Normalization pipeline
  -> PostgreSQL canonical tables
  -> Redis freshness cache
  -> Deterministic risk engine
  -> Qwen interpretation layer
  -> Compliance checks
  -> Human approval workflow
  -> Audit trail
  -> WebSocket / dashboard / report delivery
```

### Deterministic Operations

- API fetching.
- Schema validation.
- Unit normalization.
- Timestamp conversion.
- Deduplication.
- Price and macro value storage.
- Surprise calculations.
- Portfolio impact calculations.
- Risk severity classification.
- Approval state transitions.
- Audit writes.

### Qwen Operations

- Summarization.
- Event interpretation.
- Macro regime narrative.
- Risk explanation.
- News classification.
- CIO report drafting.
- Workflow reasoning.
- Compliance language review.

### Hallucination Controls

Qwen must never fabricate financial data.

Controls:

- Qwen receives only source-bound facts.
- Qwen output schema forbids unsupported numeric claims.
- Every numeric field must reference a database value or source ID.
- Report generation validates that all numbers exist in canonical tables.
- Unsupported claims are rejected by the compliance service.
- Qwen confidence is advisory, never authoritative.

---

## 4. Real Data Integration Architecture

### FRED

Use for:

- Treasury yields.
- Inflation.
- Unemployment.
- GDP.
- Fed funds.
- Breakevens.
- Recession indicators.
- Macro history.

Store:

- Provider.
- Series ID.
- Observation date.
- Realtime period.
- Value.
- Units.
- Source timestamp.

### Alpha Vantage

Use for:

- FX rates.
- ETF proxies.
- Commodities.
- Selected market news.
- Market time series.

Notes:

- Treat freshness carefully because entitlement and delay depend on endpoint and plan.
- Store provider metadata and response timestamps.
- Do not silently treat delayed data as realtime.

### Financial Modeling Prep

Use for:

- Economic calendar.
- Financial news.
- Macro events.
- Event timestamps.

Normalize calendar events into canonical records:

- Country.
- Release time.
- Actual.
- Previous.
- Consensus.
- Importance.
- Source.

### Future Bloomberg / Reuters Readiness

All connectors should implement a common provider interface:

```text
IDataConnector.fetch()
IDataConnector.normalize()
IDataConnector.validate()
IDataConnector.freshness()
IDataConnector.sourceMetadata()
```

This allows Bloomberg, Reuters, FactSet, or internal vendor feeds to replace POC APIs without changing downstream services.

### Ingestion Controls

- Scheduling: cron-style jobs by source class.
- Market data: every 1-5 minutes where permitted.
- Macro calendar: every 5-15 minutes around releases.
- FRED: daily/hourly depending on indicator.
- Retry: exponential backoff with jitter.
- Rate limits: Redis token buckets per provider, key, and endpoint.
- Caching: Redis for latest values; PostgreSQL for canonical history.
- Fallback: stale-but-valid data flagged as delayed; no silent substitution.
- Freshness: source states are fresh, delayed, degraded, failed.
- Quarantine: bad schema, impossible value, duplicate conflict, or missing timestamp.

---

## 5. Qwen AI Orchestration Framework

All Qwen usage goes through one internal service.

```text
QwenService.generateStructured()
QwenService.summarize()
QwenService.classify()
QwenService.reason()
QwenService.generateReport()
```

### Qwen Gateway Responsibilities

- Prompt versioning.
- Model version recording.
- Context construction.
- Source injection.
- Output schema validation.
- Token budgeting.
- Retry on malformed output.
- Audit logging.
- Redaction before model call.
- Preventing direct model access from domain services.

### Agent Communication Strategy

Agents should not freely message each other. They exchange structured artifacts through workflow state.

```text
AgentOutput {
  agentName,
  workflowId,
  inputRefs,
  outputJson,
  confidence,
  sourceIds,
  approvalRequired,
  riskLevel,
  createdAt
}
```

### Memory Handling

- Short-term memory: current workflow context in Redis.
- Long-term memory: approved reports, research documents, agent outputs, and audit events in PostgreSQL or a future vector store.
- Qwen receives retrieved context only after RBAC and source filtering.

---

## 6. Agent Designs

### Data Ingestion Agent

- Responsibilities: fetch, validate, normalize, and flag source issues.
- Inputs: FRED, Alpha Vantage, Financial Modeling Prep, internal files.
- Outputs: canonical rows, freshness score, data-quality flags.
- Deterministic logic: API calls, schema validation, unit normalization, deduplication.
- Qwen tasks: explain source anomalies and conflicts.
- Approval requirements: operations review on failure or quarantine.
- Audit requirements: every pull, schema error, source snapshot, and quarantine event.

### News Intelligence Agent

- Responsibilities: ingest, deduplicate, cluster, and classify news.
- Inputs: news APIs, financial news, official release text.
- Outputs: news clusters, summaries, relevance score, source list.
- Deterministic logic: deduplication, timestamp ordering, source ranking.
- Qwen tasks: summarization, event labeling, market relevance classification.
- Approval requirements: analyst approval before use in CIO briefing.
- Audit requirements: source articles, summary prompt, output, edits.

### Macro Regime Agent

- Responsibilities: classify macro environment and explain regime changes.
- Inputs: inflation, labor, growth, policy, rates, FX, commodities, news clusters.
- Outputs: regime label, confidence, scenario notes, source IDs.
- Deterministic logic: indicator z-scores, trend deltas, surprise metrics.
- Qwen tasks: regime interpretation, scenario framing, uncertainty explanation.
- Approval requirements: analyst or PM review.
- Audit requirements: input indicators, prompt version, model version, output.

### Portfolio Risk Agent

- Responsibilities: connect macro events to current exposures.
- Inputs: portfolio positions, market moves, macro factors, risk snapshot.
- Outputs: exposure impact, risk deltas, vulnerable positions, explanation.
- Deterministic logic: exposure aggregation, impact scoring, severity classification.
- Qwen tasks: explain risk drivers and implications.
- Approval requirements: PM or risk officer for material findings.
- Audit requirements: positions, calculations, explanation, approval status.

### Compliance Guardrail Agent

- Responsibilities: detect unsupported claims, restricted language, and policy issues.
- Inputs: draft briefings, AI recommendations, generated report sections.
- Outputs: pass, block, or escalate decision; findings; redlines.
- Deterministic logic: required field checks, restricted terms, policy rule checks.
- Qwen tasks: ambiguous wording review and compliant language suggestions.
- Approval requirements: compliance officer for escalated items.
- Audit requirements: policy rule, finding, remediation, reviewer.

### CIO Briefing Agent

- Responsibilities: assemble executive-grade briefing.
- Inputs: approved agent outputs, market data, risk snapshots, research evidence.
- Outputs: CIO brief draft, source citations, required decisions.
- Deterministic logic: template assembly, citation binding, approval routing.
- Qwen tasks: executive synthesis, narrative drafting, scenario comparison.
- Approval requirements: senior analyst, PM, or CIO approval.
- Audit requirements: report version, sources, prompts, model version, approvers.

### Confidence Scoring

Confidence should be composite.

```text
confidence =
  source_freshness_weight
  + source_agreement_weight
  + data_completeness_weight
  + deterministic_signal_strength
  + qwen_interpretation_confidence
  - compliance_or_data_quality_penalties
```

---

## 7. Deterministic Portfolio Risk Engine

Mock portfolio positions:

- Long USDJPY.
- Short US10Y futures.
- Long GLD.
- Long oil.
- Short SPY.
- Long QQQ.

### Exposure Mapping

| Position | Primary Macro Sensitivities |
|---|---|
| Long USDJPY | USD strength, US-Japan rate differential, risk sentiment |
| Short US10Y futures | Higher yields positive, lower yields negative |
| Long GLD | Real yields, USD, inflation/geopolitical stress |
| Long oil | Growth, geopolitics, supply shock, USD |
| Short SPY | Equity beta negative, risk-off positive |
| Long QQQ | Growth/tech beta positive, real yields negative |

### Engine Outputs

- `portfolio_pressure_score`
- `risk_severity`
- `position_contribution`
- `factor_concentration`
- `macro_sensitivity`
- `scenario_impact`
- `breach_flags`

### Example Severity Scale

| Score | Severity |
|---|---|
| 0-25 | Normal |
| 26-50 | Watch |
| 51-70 | Elevated |
| 71-85 | High |
| 86-100 | Critical |

Qwen only explains the impact. It does not calculate it.

Example Qwen explanation:

```text
Higher US yields help the short US10Y futures position but pressure QQQ and GLD through real-rate sensitivity.
```

---

## 8. Human Approval System

Every AI recommendation must include:

- Recommendation.
- Reasoning.
- Confidence.
- Data sources used.
- Risk level.
- Approval requirement.
- Generating agent.
- Qwen model version.
- Prompt version.
- Audit ID.

### Approval Flow

```text
Recommendation created
  -> Compliance pre-check
  -> Approval request created
  -> Reviewer assigned by RBAC/policy
  -> Human approve / reject / request changes / escalate
  -> Audit event stored
  -> Report or workflow state updated
```

### Escalation Rules

Escalate when:

- Risk severity is high or critical.
- Compliance flag exists.
- Source data is stale or conflicting.
- Qwen confidence is low.
- Recommendation affects trade or risk posture.
- Required approver SLA expires.

Humans can always override Qwen, but override requires:

- Reason.
- Approver identity.
- Timestamp.
- Audit entry.

---

## 9. PostgreSQL Schema Design

### `users`

Columns:

- `id`
- `email`
- `name`
- `status`
- `created_at`
- `updated_at`

Indexes:

- unique `email`
- `status`

Retention:

- Active users retained while active.
- Archived users retained for audit references.

### `roles_permissions`

Columns:

- `id`
- `role`
- `permission`
- `scope`
- `created_at`

Indexes:

- `role`
- `permission`

Retention:

- Permanent governance record.

### `market_data`

Columns:

- `id`
- `provider`
- `symbol`
- `asset_class`
- `timestamp`
- `value`
- `currency`
- `unit`
- `freshness_status`
- `raw_source_id`
- `created_at`

Indexes:

- `(symbol, timestamp)`
- `provider`
- `asset_class`

Retention:

- Full POC retention.
- Enterprise target: 7+ years or firm policy.

### `macro_indicators`

Columns:

- `id`
- `provider`
- `series_id`
- `name`
- `date`
- `value`
- `units`
- `realtime_start`
- `realtime_end`
- `raw_source_id`
- `created_at`

Indexes:

- `(series_id, date)`
- `provider`

Retention:

- Full history.

### `portfolio_positions`

Columns:

- `id`
- `portfolio_id`
- `symbol`
- `direction`
- `quantity`
- `asset_class`
- `notional`
- `currency`
- `as_of`
- `created_at`

Indexes:

- `(portfolio_id, as_of)`
- `symbol`

Retention:

- Versioned snapshots.

### `portfolio_risk_snapshots`

Columns:

- `id`
- `portfolio_id`
- `as_of`
- `pressure_score`
- `severity`
- `factor_json`
- `scenario_json`
- `breach_flags_json`
- `created_at`

Indexes:

- `(portfolio_id, as_of)`
- `severity`

Retention:

- 7+ years or firm policy.

### `news_articles`

Columns:

- `id`
- `provider`
- `title`
- `url`
- `published_at`
- `source`
- `summary`
- `cluster_id`
- `raw_source_id`
- `created_at`

Indexes:

- `published_at`
- `cluster_id`
- `source`

Retention:

- Policy-based.

### `ai_workflows`

Columns:

- `id`
- `type`
- `status`
- `started_by`
- `started_at`
- `completed_at`
- `context_json`
- `created_at`

Indexes:

- `status`
- `type`
- `started_at`

Retention:

- 7+ years or firm policy.

### `ai_agent_logs`

Columns:

- `id`
- `workflow_id`
- `agent`
- `input_refs`
- `output_json`
- `confidence`
- `model_version`
- `prompt_version`
- `created_at`

Indexes:

- `workflow_id`
- `agent`

Retention:

- 7+ years or firm policy.

### `approvals`

Columns:

- `id`
- `object_type`
- `object_id`
- `status`
- `required_role`
- `assigned_to`
- `decision`
- `decision_reason`
- `created_at`
- `decided_at`

Indexes:

- `status`
- `assigned_to`
- `object_id`

Retention:

- 7+ years or firm policy.

### `audit_trail`

Columns:

- `id`
- `event_type`
- `actor_type`
- `actor_id`
- `object_type`
- `object_id`
- `payload_hash`
- `payload_json`
- `created_at`

Indexes:

- `created_at`
- `actor_id`
- `object_id`
- `event_type`

Retention:

- Immutable.
- 7+ years or firm policy.

### `generated_reports`

Columns:

- `id`
- `type`
- `status`
- `version`
- `content_json`
- `source_ids`
- `approval_id`
- `created_by`
- `created_at`
- `published_at`

Indexes:

- `type`
- `status`
- `created_at`

Retention:

- Versioned.
- 7+ years or firm policy.

### `system_health_logs`

Columns:

- `id`
- `service`
- `status`
- `latency_ms`
- `error`
- `created_at`

Indexes:

- `service`
- `created_at`
- `status`

Retention:

- 90 days hot.
- Archive after.

---

## 10. API Architecture

### Core Endpoints

```text
GET  /api/health
GET  /api/market-data?symbol=&from=&to=&page=
GET  /api/macro?seriesId=&from=&to=
GET  /api/news?clusterId=&from=&severity=
GET  /api/portfolio/:portfolioId
GET  /api/risk/:portfolioId
POST /api/ask
POST /api/workflows/run
GET  /api/workflows?status=&type=
GET  /api/approvals?status=&assignedTo=
POST /api/approvals/:id
GET  /api/audit?objectId=&actor=&from=&to=
POST /api/reports/generate
```

### API Principles

- All responses include `requestId`.
- Paginated endpoints use `limit`, `cursor`, and `nextCursor`.
- Data endpoints include `source`, `asOf`, and `freshness`.
- AI endpoints include `workflowId`, `modelVersion`, `promptVersion`, and `sourceIds`.
- Approval mutations require `decision`, `comment`, and `idempotencyKey`.

### Authentication And RBAC

- JWT or session token.
- Role and permission claims.
- Object-level checks for portfolio, report, and approval access.
- Service-to-service auth through signed internal tokens or mTLS in enterprise mode.

### WebSocket Channels

```text
market.snapshot
macro.events
workflow.status
agent.logs
risk.alerts
approval.updates
audit.ticker
system.health
```

---

## 11. Security And Compliance Architecture

Required controls:

- RBAC by user, role, portfolio, and workflow.
- Secrets stored in a vault or encrypted environment store.
- Provider keys never exposed to frontend.
- Qwen calls routed only through the internal Qwen Service.
- Sensitive portfolio context redacted or minimized before Qwen calls.
- Model governance with model version, prompt version, use case, and owner.
- Append-only audit trail with payload hashes.
- Data lineage from report claim to source row.
- API gateway rate limiting and request logging.
- Private deployment in VPC or hybrid cloud.
- Dockerized services with network segmentation.
- Internal service authentication.
- Approval gates for all recommendations.
- Compliance checks before report publication.

Sensitive hedge fund data stays protected because:

- The frontend never calls external data providers directly.
- The frontend never calls Qwen directly.
- All Qwen context is RBAC-filtered and source-bound.
- All AI activity is logged with source IDs and prompt versions.
- All material recommendations require human approval.

---

## 12. Backend Folder Structure

```text
apps/api/
  src/
    server.ts
    config/
    middleware/
      auth/
      rbac/
      rateLimit/
      validation/
    modules/
      health/
      market-data/
      macro-data/
      news/
      portfolio/
      risk/
      workflows/
      agents/
      qwen/
      approvals/
      compliance/
      audit/
      reports/
      system-health/
    queues/
      producers/
      workers/
      schedules/
    websocket/
    db/
      migrations/
      repositories/
      seeds/
    shared/
      schemas/
      errors/
      logger/
      events/
      security/
    integrations/
      fred/
      alpha-vantage/
      financial-modeling-prep/
      bloomberg-adapter/
      reuters-adapter/
```

---

## 13. Docker Architecture

Initial Docker services:

```text
api
worker-ingestion
worker-workflows
worker-qwen
worker-reports
postgres
redis
```

Enterprise evolution:

- Split Qwen worker into isolated subnet.
- Add observability stack.
- Add object storage.
- Add secrets manager.
- Add service mesh or internal gateway.
- Add immutable archive storage.

---

## 14. Environment Variable Structure

```text
NODE_ENV
PORT
DATABASE_URL
REDIS_URL
JWT_SECRET
ENCRYPTION_KEY
FRED_API_KEY
ALPHA_VANTAGE_API_KEY
FMP_API_KEY
QWEN_API_KEY
QWEN_MODEL
QWEN_BASE_URL
AUDIT_HASH_SECRET
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
WEBSOCKET_ALLOWED_ORIGINS
```

Rules:

- No secrets in source control.
- Provide `.env.example`.
- Use environment-specific secrets.
- Prefer secret manager integration in enterprise deployment.

---

## 15. MVP Vs Enterprise Roadmap

### MVP

- Express modular backend.
- PostgreSQL schema.
- Redis queues.
- FRED connector.
- Alpha Vantage connector.
- Financial Modeling Prep connector.
- Mock portfolio positions.
- Deterministic risk engine.
- Qwen orchestration service.
- Six core agents.
- Approval queue.
- Audit trail.
- WebSocket workflow updates.
- CIO report generation.

### Enterprise

- SSO.
- mTLS or service mesh.
- Immutable archive storage.
- Bloomberg and Reuters adapters.
- Full policy engine.
- Advanced risk models.
- Separate workflow workers.
- Multi-portfolio tenancy.
- Disaster recovery.
- Full observability.
- Model evaluation harness.
- Retention and legal hold system.

---

## 16. Recommended Build Order

1. PostgreSQL schema and repositories.
2. Audit service first, because every serious action depends on it.
3. Auth and RBAC middleware.
4. Data connector interfaces.
5. FRED, Alpha Vantage, and Financial Modeling Prep ingestion workers.
6. Market, macro, and news normalization.
7. Mock portfolio service.
8. Deterministic risk engine.
9. Qwen service wrapper with prompt and version logging.
10. Agent orchestration framework.
11. Approval service.
12. Report generation service.
13. WebSocket streaming.
14. System health and freshness monitoring.
15. Docker composition and worker separation.

---

## 17. Phase 3 North Star

The backend should behave like an institutional operating layer:

```text
deterministic facts
  -> governed Qwen interpretation
  -> human authority
  -> compliance controls
  -> immutable auditability
```

No generated market data. No unapproved AI recommendations. No unaudited decision path.

The result should support a hedge fund workflow where a macro event becomes an interpreted regime change, a deterministic portfolio risk impact, an approval request, a CIO-ready report, and a permanent institutional record.
