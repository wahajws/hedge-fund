# Phase 5 Qwen Multi-Agent Implementation

Phase 5 implements the core Qwen-powered intelligence orchestration layer for the Macro Fund AI Operating System.

Qwen is the only LLM integration. The backend does not use or recommend any other model provider.

## Implemented Components

```text
server/src/orchestration/
  agentRegistry.js
  contextManager.js
  orchestrationLogger.js
  promptManager.js
  responseValidator.js
  workflowEngine.js

server/src/agents/
  intelligenceAgents.js

server/src/services/
  executiveAlertService.js
  qwenService.js
```

## Registered Agents

- Data Intelligence Agent
- News Intelligence Agent
- Macro Regime Agent
- Portfolio Risk Intelligence Agent
- Compliance Guardrail Agent
- CIO Briefing Agent
- Executive Alert Agent
- Workflow Coordination Agent

Each agent has:

- deterministic context inputs
- Qwen prompt template
- structured output validation
- confidence scoring
- approval rules
- escalation rules
- retry handling
- audit logging
- workflow event logging

## Prompt Templates

Implemented in `promptManager.js`:

- `macro_regime_analysis_v2`
- `portfolio_impact_explanation_v2`
- `risk_escalation_v2`
- `morning_cio_brief_v2`
- `news_summarization_v2`
- `executive_alerts_v2`
- `market_shock_explanation_v2`
- `compliance_explanation_v2`
- `workflow_coordination_v2`
- `executive_ask_v2`

All prompts instruct Qwen to use only supplied deterministic facts and source IDs.

## Structured Output Schema

Every Qwen agent response is validated into:

```json
{
  "summary": "...",
  "keySignals": [],
  "affectedPositions": [],
  "riskLevel": "normal | watch | elevated | high | critical",
  "confidence": 0.0,
  "sourcesUsed": [],
  "recommendations": [],
  "approvalRequired": false,
  "escalationReason": null,
  "assumptions": [],
  "guardrails": []
}
```

Unverified source IDs are removed. Missing sources are auto-attached from deterministic context with a guardrail.

## Workflows

### Morning Macro Intelligence

```text
Data Intelligence Agent
  -> News Intelligence Agent
  -> Macro Regime Agent
  -> Portfolio Risk Intelligence Agent
  -> Compliance Guardrail Agent
  -> CIO Briefing Agent
  -> Workflow Coordination Agent
  -> Approval interruption if required
```

### Risk Escalation

```text
Data Intelligence Agent
  -> Macro Regime Agent
  -> Portfolio Risk Intelligence Agent
  -> Executive Alert Agent
  -> Compliance Guardrail Agent
  -> Workflow Coordination Agent
```

### Executive Ask

```text
Data Intelligence Agent
  -> Macro Regime Agent
  -> Portfolio Risk Intelligence Agent
  -> Workflow Coordination Agent
```

## APIs

```text
POST /api/ask
POST /api/workflows/run
GET  /api/workflows/:id
POST /api/workflows/:id/replay
GET  /api/workflows
POST /api/approvals/:id
GET  /api/agent-logs
GET  /api/agents
GET  /api/executive-alerts
```

## Example Workflow Run

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:4000/api/workflows/run `
  -Headers @{ "x-user-role" = "cio"; "x-user-id" = "local-cio" } `
  -ContentType "application/json" `
  -Body '{ "workflow": "morning_macro_intelligence", "portfolioId": "GLOBAL-MACRO-01" }'
```

## Example Executive Ask

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:4000/api/ask `
  -Headers @{ "x-user-role" = "cio"; "x-user-id" = "local-cio" } `
  -ContentType "application/json" `
  -Body '{ "question": "What changed overnight and what exposure needs attention?", "portfolioId": "GLOBAL-MACRO-01" }'
```

## Qwen Controls

Environment variables:

```text
QWEN_API_KEY
QWEN_MODEL
QWEN_BASE_URL
QWEN_TIMEOUT
QWEN_MAX_RETRIES
QWEN_CONCURRENCY
```

If `QWEN_API_KEY` is not configured, the local mock Qwen gateway returns schema-valid source-bound outputs for development.

## Auditability

The orchestration layer records:

- workflow execution
- agent start/completion/failure
- prompt version
- Qwen model version
- sources used
- confidence score
- approval interruption
- executive alerts
- workflow memory
- replay lineage

