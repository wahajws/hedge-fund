# Macro Fund AI Operating System - Phase 1 and 2 Design Notes

This document captures the strategy work completed before implementation.

The product is a real-data proof of concept for a macro hedge fund AI Operating System using:

- React frontend
- Node.js backend
- Qwen as the LLM
- Real macroeconomic and market data
- Multi-agent workflows
- Human approval layers
- Enterprise audit trail

The system should feel like Bloomberg Terminal + Palantir + enterprise AI orchestration. It is not a startup SaaS dashboard, not a toy chatbot, and not an autonomous trading system.

---

## Phase 1: Product And Technical Strategy

### Core Thesis

The AI Operating System should reduce decision latency, expose portfolio risk, coordinate analyst workflows, preserve institutional memory, and create auditable decision records.

It should not replace the CIO, PM, risk officer, or compliance team. Agents prepare, compare, challenge, summarize, and escalate. Humans decide.

### Real Hedge Fund Operational Problems

- Information overload across macro, markets, central banks, geopolitics, research, and internal risk.
- Fragmented research across PDFs, emails, notes, decks, files, and analyst memory.
- Manual morning brief preparation.
- Delayed reporting and poor institutional knowledge retrieval.
- Disconnected workflows across research, risk, portfolio, compliance, and approvals.
- Decision latency around major macro events.
- Weak compliance visibility into AI-assisted outputs.
- Lack of provenance for why a briefing or recommendation was produced.

### What The AI OS Should Do

The system should operate above simple chat and dashboards.

| Layer | Role |
|---|---|
| Chatbot | Conversational interface over context |
| Analytics dashboard | Shows charts and metrics |
| AI copilot | Helps with specific user tasks |
| Autonomous agent | Executes bounded tool-based work |
| AI Operating System | Coordinates data, agents, workflows, approvals, evidence, and audit |

The AI OS should ingest data, normalize it, run deterministic calculations, use Qwen for synthesis and interpretation, trigger workflows, require human approvals, and store an immutable record of decisions.

### Realistic Enterprise Workflow

```text
Market Data Ingestion
  -> News Intelligence
  -> Macro Regime Analysis
  -> Portfolio Exposure Analysis
  -> Risk Scoring
  -> Human Review
  -> CIO Briefing
  -> Approval Logging
  -> Audit Trail
```

### Real Data Sources

Use real data where it creates credibility:

- FRED for macroeconomic time series.
- Alpha Vantage for market data and selected economic/asset data.
- Trading Economics or similar economic calendar source for releases, forecasts, revisions, and event importance.
- NewsAPI, GDELT, or licensed news feed for financial and geopolitical news discovery.
- Internal portfolio data, initially mocked for the POC.
- Research PDFs for document ingestion and retrieval.
- Email summaries, initially mocked or manually imported.

### Human-In-The-Loop Requirements

Human approval must be part of the authority model, not a decorative button.

Approval is required for:

- CIO briefing publication.
- Trade recommendations.
- Material risk escalations.
- Compliance-sensitive language.
- External or client-facing content.
- Model or policy configuration changes.

Every approval should record:

- Actor.
- Timestamp.
- Object approved.
- Source data snapshot.
- Agent outputs.
- Model and prompt version.
- Human edits.
- Final decision.

### Security And Compliance Requirements

The expected deployment posture is private cloud or VPC.

Required controls:

- RBAC and role-aware UI.
- Encrypted storage and transport.
- Private model deployment or tightly controlled model gateway.
- Prompt and response logging where permitted.
- Immutable audit trail.
- Source lineage for all AI claims.
- Data-loss prevention controls.
- Compliance guardrails before approval.
- Model governance with prompt and model version tracking.

### Core AI Agents

#### Data Ingestion Agent

- Role: Pull, validate, normalize market and macro data.
- Inputs: FRED, Alpha Vantage, economic calendar, internal files.
- Outputs: Clean time series, release snapshots, data-quality flags.
- Deterministic work: API calls, validation, schema normalization.
- LLM work: Explain anomalies and source conflicts.
- Approval: No normal approval, but exceptions need operations review.

#### News Intelligence Agent

- Role: Cluster market-relevant news and summarize events.
- Inputs: News feeds, official releases, email summaries.
- Outputs: Event clusters, source links, relevance score.
- Deterministic work: Deduplication, timestamp ordering, source ranking.
- LLM work: Summarization and event labeling.
- Approval: Analyst approval before inclusion in CIO briefing.

#### Macro Regime Agent

- Role: Classify macro environment and explain regime changes.
- Inputs: Inflation, labor, growth, policy, rates, FX, commodities, news.
- Outputs: Regime label, confidence, analogues, uncertainty.
- Deterministic work: Indicator z-scores, trend deltas, surprise calculations.
- LLM work: Narrative synthesis and scenario framing.
- Approval: Analyst or PM review required.

#### Portfolio Risk Agent

- Role: Connect macro events to current exposures.
- Inputs: Positions, factor exposures, VaR, stress scenarios.
- Outputs: Exposure impact, risk deltas, vulnerable positions.
- Deterministic work: Exposure aggregation and risk math.
- LLM work: Explanation of drivers and review questions.
- Approval: PM or risk officer for material findings.

#### Compliance Guardrail Agent

- Role: Detect unsupported claims, restricted language, and policy issues.
- Inputs: Draft briefings, recommendations, prompts, user actions.
- Outputs: Pass/block/escalate decision, redlines, policy notes.
- Deterministic work: Rule checks, restricted lists, required disclosure checks.
- LLM work: Interpret ambiguous wording and suggest compliant alternatives.
- Approval: Compliance officer for escalated items.

#### CIO Briefing Agent

- Role: Assemble executive-grade briefing.
- Inputs: Agent outputs, market data, portfolio risk, research retrieval.
- Outputs: CIO brief, unresolved questions, recommended next steps.
- Deterministic work: Template assembly, citation binding, workflow routing.
- LLM work: Executive synthesis and scenario comparison.
- Approval: Senior analyst, PM, or CIO approval required.

### Proper Use Of Qwen

Qwen should be used for reasoning, synthesis, summarization, routing, and drafting.

Use Qwen for:

- Summaries.
- Macro interpretation.
- Research synthesis.
- Scenario framing.
- Agent orchestration.
- Executive briefing language.
- Compliance wording assistance.

Do not use Qwen for:

- Raw market data retrieval.
- Risk calculations.
- VaR math.
- Economic surprise calculations.
- Portfolio truth.
- Trade execution.
- Final compliance decisions.

Correct pattern:

```text
Deterministic services fetch and calculate facts.
Qwen receives structured, source-linked facts.
Qwen explains and drafts.
Compliance checks the output.
Humans approve.
Audit stores the full chain.
```

### POC Strategy

What should be real:

- FRED data.
- Alpha Vantage data.
- Economic calendar data.
- News data.
- PDF ingestion.
- Qwen inference.
- Audit log.
- Approval workflow.
- Role-aware UI states.

What can be mocked:

- Internal portfolio data.
- Full PMS/OMS integration.
- Full enterprise risk engine.
- Trade execution.
- SSO.
- Licensed Bloomberg/Refinitiv feeds.
- Full email integration.

Strongest demo flow:

```text
CPI release detected
  -> actual vs forecast shown
  -> market reaction shown
  -> macro regime updated
  -> mock portfolio exposure impact shown
  -> risk alert created
  -> internal research retrieved
  -> CIO brief drafted
  -> compliance flag raised
  -> analyst approves
  -> CIO sees final briefing with evidence and audit trail
```

### Phase 1 System Architecture

```text
React Enterprise UI
  -> Node.js API Gateway
    -> Auth / RBAC
    -> Workflow Orchestrator
    -> Agent Orchestration Layer
    -> Audit Event Service
    -> Market Data Service
    -> Macro Data Service
    -> News Service
    -> Portfolio Risk Service
    -> Compliance Service
    -> Qwen Service
    -> PostgreSQL
    -> Vector Database
    -> Encrypted Object Storage
```

---

## Phase 2: Enterprise UX/UI System

### UX Thesis

The frontend should be an institutional command surface: dense, dark, precise, role-aware, auditable, and operationally serious.

The UI should always answer:

- What changed?
- Why does it matter?
- What is exposed?
- Who needs to decide?

### Global App Shell

```text
Top Intelligence Bar
Left Navigation Rail
Main Workspace
Right Context Drawer
Bottom Event / Audit Ticker
```

#### Top Intelligence Bar

- Market session.
- Fund timezone.
- Current macro regime.
- Current risk level.
- Pending approvals.
- Data freshness.
- Agent activity.
- Command palette trigger.

#### Left Navigation Rail

- Executive Dashboard
- AI Command Center
- Portfolio Risk Monitor
- Multi-Agent Workflow Screen
- Approval Queue
- Audit Trail
- Data Lake / Integrations
- CIO Morning Brief
- System Health Dashboard

#### Right Context Drawer

Used for:

- Evidence.
- Source citations.
- Agent output.
- Approval history.
- Compliance notes.
- Risk explanations.
- Related research.

#### Bottom Event / Audit Ticker

A compact stream of operational events:

- Data received.
- Agent step completed.
- Risk escalated.
- Analyst approved.
- Compliance flagged.

### Navigation Strategy

Navigation should be role-aware.

| Role | Default Landing |
|---|---|
| CIO | Executive Dashboard or CIO Morning Brief |
| PM | Portfolio Risk Monitor |
| Macro Strategist | AI Command Center |
| Risk Officer | Portfolio Risk Monitor or Approval Queue |
| Compliance | Audit Trail or Approval Queue |
| Operations | Data Lake or System Health |

Use a compact vertical rail with icons, labels, active state, and secondary tabs inside each workspace.

### Page Specifications

## Executive Dashboard

Purpose: CIO-level operational and investment overview.

Widgets:

- Global Macro Regime panel.
- Overnight Market Moves.
- Portfolio Risk Summary.
- Top Active Alerts.
- Pending CIO Decisions.
- Economic Calendar.
- Agent Activity Snapshot.
- Data Freshness Strip.

Charts:

- Cross-asset heatmap.
- Risk score trend.
- Regime probability matrix.
- Exposure delta waterfall.

Actions:

- Open CIO Morning Brief.
- Request agent refresh.
- Escalate to risk.
- Approve briefing.
- Search institutional memory.

States:

- Normal.
- Watch.
- Elevated.
- Critical.

## AI Command Center

Purpose: analyst-facing intelligence cockpit.

Widgets:

- Live event feed.
- Agent output queue.
- Macro event clusters.
- Research retrieval panel.
- Source evidence drawer.
- AI task composer.

Charts:

- Event impact timeline.
- Source agreement meter.
- News urgency map.
- Event-to-asset linkage graph.

Interactions:

- Selecting an event updates all panels.
- Click a claim to reveal sources.
- Drag a finding into briefing draft.
- Pin evidence to a decision memo.

AI should appear as contextual work tools, not as a centered toy chatbot.

## Portfolio Risk Monitor

Purpose: PM and risk-officer exposure view.

Widgets:

- Total portfolio risk score.
- Exposure by asset class.
- Factor sensitivity.
- Regime vulnerability.
- Scenario shock results.
- Position-level contributors.
- Risk limit breaches.

Charts:

- Asset class x macro factor heatmap.
- Risk contribution waterfall.
- Stress scenario matrix.
- Drawdown distribution.
- Duration, FX, and commodity exposure bars.

Actions:

- Run scenario.
- Escalate breach.
- Request PM review.
- Add to CIO brief.
- Export risk memo draft.

## Multi-Agent Workflow Screen

Purpose: visibility into AI orchestration.

Workflow:

```text
Data Ingestion -> News Intelligence -> Macro Regime -> Portfolio Risk -> Compliance -> CIO Brief
```

Each node shows:

- Status.
- Runtime.
- Inputs.
- Outputs.
- Confidence.
- Required approval.
- Error state.

States:

- Queued.
- Running.
- Waiting for human.
- Blocked.
- Completed.
- Failed.
- Superseded.

Actions:

- Run workflow.
- Pause workflow.
- Retry failed step.
- Open agent output.
- Compare previous run.
- Send to approval queue.

## Approval Queue

Purpose: human-in-the-loop control center.

Widgets:

- Pending approvals by severity.
- Approval SLA timer.
- Compliance flags.
- Assigned owner.
- Decision impact preview.

Approval detail view:

- Draft content.
- Redlined changes.
- Supporting evidence.
- Agent outputs.
- Compliance checks.
- Prior approvals.
- Decision buttons.

Actions:

- Approve.
- Reject.
- Request revision.
- Escalate.
- Add comment.
- Assign reviewer.

States:

- Pending.
- In review.
- Changes requested.
- Escalated.
- Approved.
- Rejected.
- Expired.

## Audit Trail

Purpose: compliance-grade traceability.

Widgets:

- Immutable event timeline.
- User activity.
- Agent activity.
- Model invocation log.
- Approval history.
- Data source lineage.

Filters:

- User.
- Agent.
- Portfolio.
- Briefing.
- Date.
- Severity.
- Compliance flag.
- Model invocation.

Interactions:

- Click event to open provenance.
- Compare briefing versions.
- Replay workflow execution.
- Export audit package.

Audit should be a forensic interface, not a raw log dump.

## Data Lake / Integrations

Purpose: data source monitoring and ingestion visibility.

Widgets:

- Data source status grid.
- Feed freshness.
- Last successful pull.
- Schema validation.
- Error rate.
- API quota usage.
- Source trust level.

Sources:

- FRED.
- Alpha Vantage.
- Economic calendar.
- News provider.
- Internal portfolio data.
- Research PDFs.
- Email summaries.

Actions:

- Test connection.
- Trigger sync.
- View raw sample.
- View normalized schema.
- Quarantine source.
- Acknowledge data issue.

States:

- Healthy.
- Delayed.
- Degraded.
- Failed.
- Quarantined.
- Pending credentials.

## CIO Morning Brief

Purpose: executive-grade briefing artifact.

Layout:

```text
Left: briefing outline
Center: final narrative
Right: evidence and approval drawer
```

Sections:

- Executive summary.
- Overnight market moves.
- Macro regime update.
- Key events today.
- Portfolio risk implications.
- Required decisions.
- Open questions.
- Appendix evidence.

Actions:

- Generate draft.
- Refresh data.
- Add evidence.
- Request analyst review.
- Send to CIO.
- Approve final.
- Export PDF.

States:

- Draft.
- Analyst review.
- Compliance review.
- CIO review.
- Approved.
- Published.
- Archived.

## System Health Dashboard

Purpose: platform reliability and governance.

Widgets:

- API uptime.
- Agent runtime health.
- Qwen service latency.
- Queue depth.
- Failed jobs.
- Database health.
- Vector search health.
- Audit service status.

Charts:

- Latency trends.
- Job success rate.
- Model invocation volume.
- Token usage.
- Error rate by service.

Actions:

- Retry workflow.
- Disable agent.
- Open incident.
- View logs.
- Notify operations.

### Design System

#### Typography

- Page title: 18-22px, semibold.
- Section header: 13-15px, compact semibold.
- Body: 12-14px.
- Tables: 11-13px.
- Timestamps: 11px monospace.
- Metrics: 18-28px with tabular numbers.
- Market data: monospace or tabular numeric.

Recommended fonts:

- Interface: Inter, IBM Plex Sans, or Geist.
- Numeric/data: IBM Plex Mono or JetBrains Mono.

#### Spacing

```text
4px  micro spacing
8px  standard gap
12px panel padding
16px section spacing
24px major workspace gap
```

Use 4px to 6px border radius. Avoid large rounded consumer cards.

#### Color Strategy

Use a dark institutional palette.

Key semantic tokens:

- `bg-base`
- `bg-panel`
- `bg-panel-muted`
- `border-subtle`
- `text-primary`
- `text-secondary`
- `text-muted`
- `accent-cyan`
- `accent-amber`
- `accent-red`
- `accent-green`
- `accent-violet`

Color should communicate operational state, not decoration.

#### Risk Color System

| Level | Meaning |
|---|---|
| Normal | Within expected bounds |
| Watch | Monitoring required |
| Elevated | Material change or near threshold |
| High | Requires owner review |
| Critical | Requires approval or escalation |
| Blocked | Missing data or approval |

Risk colors should appear in badges, table row accents, heatmap cells, alert bands, workflow nodes, and timeline markers.

#### Badge System

Badge categories:

- `REGIME`
- `RISK`
- `DATA`
- `AGENT`
- `APPROVAL`
- `COMPLIANCE`
- `SOURCE`
- `CONFIDENCE`

Examples:

- `REGIME: DISINFLATION`
- `RISK: ELEVATED`
- `DATA: FRESH`
- `AGENT: RUNNING`
- `APPROVAL: CIO REQUIRED`
- `COMPLIANCE: FLAGGED`
- `SOURCE: VERIFIED`

#### Status Indicators

- Solid green: healthy.
- Pulsing cyan: active processing.
- Amber: delayed or warning.
- Red: failed or critical.
- Gray: inactive.
- Dashed outline: pending human action.

Animations should be subtle and functional only.

### Information Density Rules

Use:

- Split panes.
- Collapsible context drawers.
- Sticky headers.
- Compact tables.
- Inline filters.
- Keyboard command palette.
- Drill-down on demand.
- Linked highlighting across charts and tables.

Avoid:

- Hero sections.
- Marketing copy.
- Decorative cards.
- Chat-first layout.
- Large blank margins.
- Consumer onboarding patterns.

### Macro Event Surfacing Flow

```text
Calendar event detected
  -> actual / forecast / previous displayed
  -> market reaction panel updated
  -> related news clusters attached
  -> macro regime score recalculated
  -> portfolio exposure impact shown
  -> risk or approval alert triggered
  -> CIO brief candidate generated
```

### React Component Architecture

```text
AppShell
  TopIntelligenceBar
  LeftNavRail
  WorkspaceRouter
  RightContextDrawer
  EventAuditTicker

pages/
  ExecutiveDashboard
  AICommandCenter
  PortfolioRiskMonitor
  AgentWorkflowScreen
  ApprovalQueue
  AuditTrail
  DataLakeIntegrations
  CIOMorningBrief
  SystemHealthDashboard

features/
  macro/
  markets/
  portfolio/
  risk/
  agents/
  approvals/
  audit/
  dataSources/
  briefings/
  compliance/
  commandPalette/
```

### Tailwind Design System

Semantic tokens should be configured for:

```text
colors:
  app.bg
  app.panel
  app.panelMuted
  app.border
  app.text
  app.textMuted

risk:
  normal
  watch
  elevated
  high
  critical

status:
  healthy
  running
  warning
  failed
  pending

agent:
  idle
  running
  blocked
  completed
```

### Layout Strategy

```text
Top bar: 44-52px
Left rail: 220px expanded / 64px collapsed
Right drawer: 360-460px
Bottom ticker: 28-36px
Main workspace: fluid
```

This is desktop-first institutional workstation software. Mobile is not the primary target.

### State Management Strategy

Use:

- TanStack Query for server state.
- Zustand for UI state.
- Finite-state-machine-style workflow state for agents, approvals, and briefings.

Important frontend state:

- `selectedMacroEvent`
- `selectedPortfolioSnapshot`
- `activeAgentRun`
- `activeBriefingVersion`
- `approvalQueueFilters`
- `rightDrawerContext`
- `globalRiskLevel`
- `dataFreshnessStatus`

### Reusable Enterprise Components

Core:

- `AppShell`
- `TopIntelligenceBar`
- `NavigationRail`
- `CommandPalette`
- `ContextDrawer`
- `EventTicker`

Data:

- `DenseTable`
- `MetricTile`
- `MetricStrip`
- `DataFreshnessBadge`
- `StatusDot`
- `RiskBadge`
- `SourceBadge`
- `ConfidenceMeter`

Risk:

- `RiskHeatmap`
- `ScenarioMatrix`
- `ExposureWaterfall`
- `FactorSensitivityTable`
- `RiskTrendChart`
- `BreachBanner`

Agents:

- `AgentWorkflowGraph`
- `AgentNode`
- `AgentRunTimeline`
- `ToolCallLog`
- `AgentOutputPanel`

Approvals:

- `ApprovalQueueTable`
- `ApprovalDetailPanel`
- `ApprovalActionBar`
- `DecisionImpactPreview`
- `RedlineDiffViewer`

Audit:

- `AuditTimeline`
- `ProvenanceGraph`
- `ModelInvocationLog`
- `VersionHistoryPanel`

Briefings:

- `BriefingEditor`
- `BriefingOutline`
- `EvidenceCitationPanel`
- `BriefingStatusHeader`
- `ExportControls`

Data:

- `IntegrationStatusGrid`
- `SourceHealthTable`
- `SchemaPreview`
- `SyncHistoryTimeline`

### Frontend Development Stages

1. Design system foundation.
2. Navigation and workspace layout.
3. Executive Dashboard.
4. AI Command Center.
5. Portfolio Risk Monitor.
6. Multi-Agent Workflow Screen.
7. Approval Queue.
8. Audit Trail.
9. Data Lake / Integrations.
10. CIO Morning Brief.
11. System Health Dashboard.
12. Demo polish with cohesive mock data and a high-impact CPI scenario.

---

## Product North Star

The winning POC should show a macro event becoming:

```text
real data -> interpreted event -> regime update -> portfolio risk impact -> approval workflow -> CIO briefing -> auditable institutional record
```

That is the difference between an AI chatbot and an enterprise AI Operating System for a hedge fund.
