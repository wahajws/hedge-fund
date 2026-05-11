import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  GitBranch,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Presentation,
  UserCheck,
  XCircle
} from 'lucide-react';
import { Shell } from '../components/Shell';
import { Badge, Button, DenseTable, ErrorBlock, formatNumber, formatPct, LoadingBlock, MetricTile, PageHeader, Panel, StatusDot } from '../components/Primitives';
import { ContributionChart, LatencyLine, RiskAreaChart } from '../components/Charts';
import { useActions, useCoreData, useOperationsData } from '../lib/queries';
import { useDemoData } from '../lib/queries';
import { useUiStore } from '../lib/store';
import type { AgentLog, Approval, AuditEvent, CalendarEvent, DemoScenario, MacroIndicator, MarketData, PortfolioPosition, Signal, Workflow } from '../lib/types';

function isLoading(...items: Array<{ isLoading: boolean }>) {
  return items.some((item) => item.isLoading);
}

function errorMessage(...items: Array<{ error: unknown }>) {
  const found = items.find((item) => item.error);
  return found?.error instanceof Error ? found.error.message : found?.error ? 'Data request failed' : null;
}

export function App() {
  const page = useUiStore((state) => state.activePage);

  const pages = {
    executive: <ExecutiveDashboard />,
    command: <AICommandCenter />,
    risk: <PortfolioRiskMonitor />,
    workflow: <WorkflowCenter />,
    approvals: <ApprovalQueue />,
    audit: <AuditTrail />,
    data: <DataLake />,
    brief: <CIOMorningBrief />,
    health: <SystemHealth />,
    demo: <ExecutiveDemoMode />
  };

  return <Shell>{pages[page]}</Shell>;
}

function ExecutiveDemoMode() {
  const core = useCoreData();
  const ops = useOperationsData();
  const demo = useDemoData();
  const actions = useActions();
  const setPresentationMode = useUiStore((state) => state.setPresentationMode);
  const presentationMode = useUiStore((state) => state.presentationMode);
  const scenarios = demo.scenarios.data?.data ?? [];
  const runs = demo.runs.data?.data ?? [];
  const latestRun = actions.runDemo.data?.data.run ?? runs[0];
  const latestWorkflow = actions.runDemo.data?.data.workflow;
  const alerts = core.alerts.data?.data ?? [];
  const approvals = core.approvals.data?.data ?? [];
  const signals = core.signals.data?.data ?? [];
  const risk = core.risk.data?.data;

  return (
    <div className="grid gap-3">
      <PageHeader
        title="Executive Demo Mode"
        subtitle="Guided hedge fund storytelling: market shock, AI orchestration, portfolio impact, approval governance, audit trail, and CIO-ready reporting."
        actions={
          <>
            <Button onClick={() => setPresentationMode(!presentationMode)} tone="ghost"><Presentation size={14} /> {presentationMode ? 'Exit Fullscreen Mode' : 'Presentation Mode'}</Button>
            <Button onClick={() => actions.generateReport.mutate()}><FileText size={14} /> Generate CIO Brief</Button>
          </>
        }
      />

      <div className="grid gap-3 2xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Scenario Launcher" icon={<Presentation size={15} />}>
          <div className="grid gap-3 md:grid-cols-2">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                running={actions.runDemo.isPending}
                onRun={() => actions.runDemo.mutate(scenario.id)}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Executive Narrative" icon={<Bot size={15} />}>
          <div className="grid gap-3">
            {(latestRun?.timeline ?? [
              { step: 1, narrative: 'Select a scenario to begin the executive walkthrough.', createdAt: new Date().toISOString() },
              { step: 2, narrative: 'The system will inject deterministic market events and launch Qwen workflows.', createdAt: new Date().toISOString() },
              { step: 3, narrative: 'Human approval and audit lineage remain visible throughout.', createdAt: new Date().toISOString() }
            ]).map((item) => (
              <div key={`${item.step}-${item.narrative}`} className="flex gap-3 border border-terminal-line bg-terminal-muted p-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center border border-cyan-300/50 font-mono text-xs text-cyan-200">{item.step}</div>
                <div>
                  <div className="text-sm font-bold text-slate-100">{item.narrative}</div>
                  <div className="mt-1 font-mono text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Demo Command Surface" icon={<Activity size={15} />} className="2xl:col-span-2">
          <div className="grid gap-3 xl:grid-cols-5">
            <MetricTile label="Scenario" value={latestRun?.title ?? 'Standby'} risk="watch" meta={latestRun?.status ?? 'ready'} />
            <MetricTile label="Risk Pressure" value={`${risk?.pressureScore ?? '-'}/100`} risk={risk?.severity ?? 'watch'} meta={risk?.severity?.toUpperCase()} />
            <MetricTile label="Signals" value={signals.length} risk={signals.some((s) => s.severity === 'high' || s.severity === 'critical') ? 'high' : 'elevated'} meta="deterministic" />
            <MetricTile label="Alerts" value={alerts.length} risk={alerts[0]?.riskLevel ?? 'watch'} meta="executive queue" />
            <MetricTile label="Approvals" value={approvals.length} risk="critical" meta="human gate" />
          </div>
        </Panel>

        <Panel title="Live Workflow Simulation" icon={<GitBranch size={15} />}>
          <WorkflowStageList logs={latestWorkflow?.agents ?? (ops.agentLogs.data?.data.slice(-7) ?? [])} />
        </Panel>

        <Panel title="Executive Alert Center" icon={<AlertTriangle size={15} />}>
          <DenseTable
            columns={['Severity', 'Alert', 'Positions', 'Approval']}
            rows={alerts.slice(0, 8)}
            renderRow={(row) => [
              <Badge value={row.riskLevel} tone={row.riskLevel} />,
              row.title,
              row.affectedPositions?.join(', ') || '-',
              row.approvalRequired ? <Badge value="required" tone="high" /> : <Badge value="none" tone="normal" />
            ]}
          />
        </Panel>

        <Panel title="CIO Morning Brief Preview" icon={<FileText size={15} />} className="2xl:col-span-2">
          <div className="grid gap-4 bg-terminal-base p-5 md:grid-cols-[1fr_280px]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">Boardroom-ready macro operations brief</div>
              <h2 className="mt-2 text-2xl font-black text-slate-100">{latestRun?.title ?? 'Macro Intelligence Control Layer'}</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
                The platform demonstrates the complete operating path: deterministic data ingestion, market shock detection, Qwen reasoning, portfolio impact analysis, executive escalation, approval interruption, audit lineage, and CIO-ready reporting.
              </p>
              <div className="mt-4 grid gap-2">
                {signals.slice(0, 4).map((signal) => (
                  <div key={signal.id} className="border-l-2 border-cyan-300 pl-3 text-sm text-slate-300">
                    <b className="text-slate-100">{signal.title}</b>
                    <div className="text-xs text-slate-500">{signal.description}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2 border border-terminal-line bg-terminal-panel p-3">
              <Badge value="AI-assisted, human-supervised" tone="watch" />
              <Badge value="No autonomous trading" tone="normal" />
              <Badge value="Audit lineage captured" tone="elevated" />
              <Badge value="Qwen source-bound reasoning" tone="watch" />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, onRun, running }: { scenario: DemoScenario; onRun: () => void; running: boolean }) {
  return (
    <div className="border border-terminal-line bg-terminal-base p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-100">{scenario.title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">{scenario.subtitle}</p>
        </div>
        <Badge value="demo" tone="watch" />
      </div>
      <div className="mt-4 grid gap-1 text-xs text-slate-500">
        {scenario.narrative.slice(0, 3).map((item) => <div key={item}>- {item}</div>)}
      </div>
      <div className="mt-4">
        <Button onClick={onRun} disabled={running}><Activity size={14} /> Run Scenario</Button>
      </div>
    </div>
  );
}

function WorkflowStageList({ logs }: { logs: AgentLog[] }) {
  const stages = ['Data Intelligence Agent', 'News Intelligence Agent', 'Macro Regime Agent', 'Portfolio Risk Intelligence Agent', 'Compliance Guardrail Agent', 'CIO Briefing Agent', 'Executive Alert Agent', 'Workflow Coordination Agent'];
  return (
    <div className="grid gap-2">
      {stages.map((stage) => {
        const log = logs.find((item) => item.agent === stage);
        return (
          <div key={stage} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 border border-terminal-line bg-terminal-muted p-2">
            <StatusDot status={log ? 'completed' : 'pending'} />
            <div>
              <div className="text-xs font-black text-slate-200">{stage}</div>
              <div className="text-[11px] text-slate-500">{log?.outputJson.summary?.slice(0, 110) ?? 'Awaiting scenario workflow execution'}</div>
            </div>
            <Badge value={log?.outputJson.riskLevel ?? 'pending'} tone={log?.outputJson.riskLevel ?? 'pending'} />
          </div>
        );
      })}
    </div>
  );
}

function ExecutiveDashboard() {
  const core = useCoreData();
  const actions = useActions();
  const loading = isLoading(core.market, core.macro, core.risk, core.signals);
  const error = errorMessage(core.market, core.macro, core.risk, core.signals);
  const risk = core.risk.data?.data;
  const market = core.market.data?.data ?? [];
  const macro = core.macro.data?.data ?? [];
  const signals = core.signals.data?.data ?? [];
  const alerts = core.alerts.data?.data ?? [];
  const calendar = core.calendar.data?.data ?? [];

  return (
    <div className="grid gap-3">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Macro intelligence mission control: live market data, Qwen workflows, portfolio pressure, approvals, and executive alerts."
        actions={
          <>
            <Button onClick={() => actions.runIngestion.mutate()} disabled={actions.runIngestion.isPending}><RefreshCw size={14} /> Refresh Data</Button>
            <Button onClick={() => actions.runWorkflow.mutate({ workflow: 'morning_macro_intelligence' })} disabled={actions.runWorkflow.isPending}><Bot size={14} /> Run Morning Intelligence</Button>
          </>
        }
      />
      {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} /> : (
        <>
          <div className="grid gap-3 xl:grid-cols-4">
            <MetricTile label="Portfolio Pressure" value={`${risk?.pressureScore ?? '-'}/100`} risk={risk?.severity ?? 'watch'} meta={risk?.severity?.toUpperCase()} />
            <MetricTile label="Market Signals" value={signals.length} risk={signals.some((s) => s.severity === 'critical') ? 'critical' : 'elevated'} meta="deterministic alerts" />
            <MetricTile label="Open Approvals" value={core.approvals.data?.data.length ?? 0} risk="high" meta="human approval layer" />
            <MetricTile label="Executive Alerts" value={alerts.length} risk={alerts[0]?.riskLevel ?? 'watch'} meta="workflow escalations" />
          </div>
          <div className="grid gap-3 2xl:grid-cols-[1.1fr_1fr]">
            <Panel title="Cross-Asset Market Movers" icon={<BarChart3 size={15} />}>
              <MarketGrid rows={market} />
            </Panel>
            <Panel title="Risk Trajectory" icon={<Activity size={15} />}>
              {risk ? <RiskAreaChart score={risk.pressureScore} /> : <LoadingBlock />}
            </Panel>
            <Panel title="Top Macro Risks" icon={<AlertTriangle size={15} />}>
              <DenseTable<Signal>
                columns={['Severity', 'Signal', 'Symbol', 'Generated']}
                rows={signals.slice(0, 6)}
                renderRow={(row) => [<Badge value={row.severity} tone={row.severity} />, row.title, row.symbol ?? '-', new Date(row.generatedAt).toLocaleTimeString()]}
              />
            </Panel>
            <Panel title="Economic Calendar" icon={<FileText size={15} />}>
              <DenseTable<CalendarEvent>
                columns={['Event', 'Actual', 'Consensus', 'Surprise', 'Importance']}
                rows={calendar.slice(0, 6)}
                renderRow={(row) => [row.event, formatNumber(row.actual), formatNumber(row.consensus), formatPct(row.surprisePercent), <Badge value={row.importance} tone={row.importance === 'high' ? 'high' : 'watch'} />]}
              />
            </Panel>
            <Panel title="Live Macro Indicators" icon={<Gauge size={15} />} className="2xl:col-span-2">
              <DenseTable<MacroIndicator>
                columns={['Series', 'Name', 'Value', 'Change', 'Freshness']}
                rows={macro.slice(0, 9)}
                renderRow={(row) => [row.seriesId, row.name, `${formatNumber(row.value)} ${row.units}`, formatNumber(row.change), <Badge value={row.freshnessStatus} tone="normal" />]}
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function AICommandCenter() {
  const core = useCoreData();
  const actions = useActions();
  const commandText = useUiStore((state) => state.commandText);
  const setCommandText = useUiStore((state) => state.setCommandText);
  const latestAgents = actions.ask.data?.data.agents ?? [];

  return (
    <div className="grid gap-3">
      <PageHeader
        title="AI Command Center"
        subtitle="Executive intelligence orchestration, not chat: Qwen workflows with evidence, confidence, approval gates, and source lineage."
        actions={<Button onClick={() => actions.ask.mutate(commandText)} disabled={actions.ask.isPending}><Search size={14} /> Execute Ask Workflow</Button>}
      />
      <div className="grid gap-3 2xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Executive Command Input" icon={<Bot size={15} />}>
          <textarea
            value={commandText}
            onChange={(event) => setCommandText(event.target.value)}
            className="min-h-32 w-full border border-terminal-line bg-terminal-base p-3 text-sm text-slate-100 outline-none focus:border-cyan-300"
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {['What changed overnight?', "Explain today's macro risk", 'Which exposure needs attention?', 'Generate CIO brief'].map((prompt) => (
              <button key={prompt} onClick={() => setCommandText(prompt)} className="border border-terminal-line bg-terminal-muted px-3 py-2 text-left text-xs text-slate-300 hover:border-cyan-300">
                {prompt}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Structured Qwen Response" icon={<ShieldCheck size={15} />}>
          {actions.ask.isPending ? <LoadingBlock label="Running Qwen multi-agent workflow" /> : latestAgents.length ? <AgentResponse logs={latestAgents} /> : (
            <div className="text-sm text-slate-400">Run an executive ask workflow to generate source-bound intelligence.</div>
          )}
        </Panel>
        <Panel title="Supporting Evidence: Signals" icon={<AlertTriangle size={15} />}>
          <DenseTable<Signal>
            columns={['Risk', 'Signal', 'Source Count']}
            rows={core.signals.data?.data ?? []}
            renderRow={(row) => [<Badge value={row.severity} tone={row.severity} />, row.title, row.sourceIds.length]}
          />
        </Panel>
        <Panel title="Workflow Activity" icon={<GitBranch size={15} />}>
          <DenseTable<Workflow>
            columns={['Workflow', 'Status', 'State', 'Started']}
            rows={core.workflows.data?.data ?? []}
            renderRow={(row) => [row.type, <Badge value={row.status} tone={row.status.includes('human') ? 'elevated' : 'watch'} />, row.state, new Date(row.startedAt).toLocaleTimeString()]}
          />
        </Panel>
      </div>
    </div>
  );
}

function PortfolioRiskMonitor() {
  const core = useCoreData();
  const risk = core.risk.data?.data;
  const portfolio = core.portfolio.data?.data;
  return (
    <div className="grid gap-3">
      <PageHeader title="Portfolio Risk Monitor" subtitle="Deterministic portfolio impact with Qwen explanations layered through approved workflows." />
      {!risk || !portfolio ? <LoadingBlock /> : (
        <>
          <div className="grid gap-3 xl:grid-cols-4">
            <MetricTile label="Risk Severity" value={risk.severity.toUpperCase()} risk={risk.severity} meta={`Score ${risk.pressureScore}`} />
            <MetricTile label="Largest Concentration" value={risk.concentration.largestSymbol} risk="high" meta={`${Math.round(risk.concentration.largestShare * 100)}% contribution share`} />
            <MetricTile label="Gross Notional" value={`$${formatNumber(portfolio.totalNotional / 1_000_000, 1)}m`} risk="watch" meta={portfolio.portfolioId} />
            <MetricTile label="Breaches" value={risk.breachFlags.length} risk={risk.breachFlags.length ? 'critical' : 'normal'} meta="deterministic rules" />
          </div>
          <div className="grid gap-3 2xl:grid-cols-[1fr_1fr]">
            <Panel title="Position Risk Contribution" icon={<BarChart3 size={15} />}>
              <ContributionChart risk={risk} />
            </Panel>
            <Panel title="Scenario Stress Matrix" icon={<Gauge size={15} />}>
              <DenseTable<[string, number]>
                columns={['Scenario', 'Pressure', 'Severity']}
                rows={Object.entries(risk.scenarioJson)}
                renderRow={(row) => [row[0], row[1], <Badge value={row[1] > 85 ? 'critical' : row[1] > 70 ? 'high' : 'elevated'} tone={row[1] > 85 ? 'critical' : row[1] > 70 ? 'high' : 'elevated'} />]}
              />
            </Panel>
            <Panel title="Portfolio Exposures" icon={<Database size={15} />} className="2xl:col-span-2">
              <DenseTable<PortfolioPosition>
                columns={['Symbol', 'Direction', 'Asset Class', 'Notional', 'Currency']}
                rows={portfolio.positions}
                renderRow={(row) => [row.symbol, <Badge value={row.direction} tone={row.direction === 'long' ? 'normal' : 'elevated'} />, row.assetClass, `$${formatNumber(row.notional)}`, row.currency]}
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function WorkflowCenter() {
  const core = useCoreData();
  const ops = useOperationsData();
  const actions = useActions();
  return (
    <div className="grid gap-3">
      <PageHeader
        title="Multi-Agent Workflow Center"
        subtitle="Real-time visibility into Qwen agent execution, approval interruptions, retry events, and orchestration trace."
        actions={
          <>
            <Button onClick={() => actions.runWorkflow.mutate({ workflow: 'risk_escalation' })}><AlertTriangle size={14} /> Run Risk Escalation</Button>
            <Button onClick={() => actions.runWorkflow.mutate({ workflow: 'morning_macro_intelligence' })}><Bot size={14} /> Run Morning Workflow</Button>
          </>
        }
      />
      <div className="grid gap-3 2xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Active Workflows" icon={<GitBranch size={15} />}>
          <DenseTable<Workflow>
            columns={['Type', 'Status', 'State', 'Approval']}
            rows={core.workflows.data?.data ?? []}
            renderRow={(row) => [row.type, <Badge value={row.status} tone={row.status.includes('human') ? 'elevated' : 'normal'} />, row.state, row.approvalId ?? '-']}
          />
        </Panel>
        <Panel title="Agent Execution Logs" icon={<Bot size={15} />}>
          <DenseTable<AgentLog>
            columns={['Agent', 'Risk', 'Confidence', 'Prompt', 'Approval']}
            rows={ops.agentLogs.data?.data.slice().reverse().slice(0, 20) ?? []}
            renderRow={(row) => [row.agent, <Badge value={row.outputJson.riskLevel ?? 'watch'} tone={row.outputJson.riskLevel ?? 'watch'} />, `${Math.round((row.confidence ?? 0) * 100)}%`, row.promptVersion ?? '-', row.approvalRequired ? <Badge value="required" tone="high" /> : <Badge value="none" tone="normal" />]}
          />
        </Panel>
      </div>
    </div>
  );
}

function ApprovalQueue() {
  const core = useCoreData();
  const actions = useActions();
  const approvals = core.approvals.data?.data ?? [];
  return (
    <div className="grid gap-3">
      <PageHeader title="Approval Queue" subtitle="Compliance-ready human-in-the-loop control surface for AI recommendations and executive escalations." />
      <Panel title="Pending Approval Workbench" icon={<UserCheck size={15} />}>
        <DenseTable<Approval>
          columns={['Risk', 'Title', 'Status', 'Role', 'Actions']}
          rows={approvals}
          renderRow={(row) => [
            <Badge value={row.riskLevel} tone={row.riskLevel} />,
            row.title,
            row.status,
            row.requiredRole,
            <div className="flex gap-2">
              <Button onClick={() => actions.decideApproval.mutate({ id: row.id, decision: 'approved', comment: 'Approved from Phase 6 UI' })}><CheckCircle2 size={13} /> Approve</Button>
              <Button tone="ghost" onClick={() => actions.decideApproval.mutate({ id: row.id, decision: 'changes_requested', comment: 'Request review from Phase 6 UI' })}>Review</Button>
              <Button tone="danger" onClick={() => actions.decideApproval.mutate({ id: row.id, decision: 'escalated', comment: 'Escalated from Phase 6 UI' })}><XCircle size={13} /> Escalate</Button>
            </div>
          ]}
        />
      </Panel>
    </div>
  );
}

function AuditTrail() {
  const ops = useOperationsData();
  return (
    <div className="grid gap-3">
      <PageHeader title="Audit Trail" subtitle="Institutional traceability across Qwen prompts, agents, workflows, approvals, alerts, and source lineage." />
      <Panel title="Immutable Event Log" icon={<Archive size={15} />}>
        <DenseTable<AuditEvent>
          columns={['Time', 'Actor', 'Event', 'Object', 'Hash']}
          rows={ops.audit.data?.data ?? []}
          renderRow={(row) => [new Date(row.createdAt).toLocaleTimeString(), row.actorId, row.eventType, `${row.objectType}:${row.objectId.slice(0, 8)}`, row.payloadHash.slice(0, 12)]}
        />
      </Panel>
    </div>
  );
}

function DataLake() {
  const ops = useOperationsData();
  const actions = useActions();
  const data = ops.integrations.data?.data;
  return (
    <div className="grid gap-3">
      <PageHeader title="Data Lake / Integrations" subtitle="Provider health, circuit breakers, ingestion freshness, and Bloomberg-ready source abstraction." actions={<Button onClick={() => actions.runIngestion.mutate()}><RefreshCw size={14} /> Run Ingestion</Button>} />
      {!data ? <LoadingBlock /> : (
        <div className="grid gap-3 2xl:grid-cols-[1fr_1fr]">
          <Panel title="Provider Status" icon={<Database size={15} />}>
            <DenseTable
              columns={['Provider', 'Status', 'Mode', 'Records']}
              rows={data.providers}
              renderRow={(row) => [row.provider, <Badge value={row.status} tone={row.status === 'healthy' ? 'normal' : 'elevated'} />, row.mode, row.records]}
            />
          </Panel>
          <Panel title="Circuit Breakers" icon={<ShieldCheck size={15} />}>
            <DenseTable
              columns={['Provider', 'Status', 'Latency', 'Circuit']}
              rows={data.health}
              renderRow={(row) => [row.provider, <Badge value={row.status} tone={row.status === 'healthy' ? 'normal' : 'critical'} />, `${row.latencyMs}ms`, row.circuit.state]}
            />
          </Panel>
        </div>
      )}
    </div>
  );
}

function CIOMorningBrief() {
  const core = useCoreData();
  const ops = useOperationsData();
  const actions = useActions();
  const risk = core.risk.data?.data;
  const latestReport = ops.reports.data?.data.slice(-1)[0];
  return (
    <div className="grid gap-3">
      <PageHeader title="CIO Morning Brief" subtitle="Boardroom-ready intelligence artifact with source-bound Qwen synthesis, risk escalation, and approval status." actions={<Button onClick={() => actions.generateReport.mutate()}><FileText size={14} /> Generate Report</Button>} />
      <div className="grid gap-3 2xl:grid-cols-[280px_1fr]">
        <Panel title="Brief Status" icon={<FileText size={15} />}>
          <div className="grid gap-2 text-sm text-slate-300">
            <Badge value={risk?.severity ?? 'watch'} tone={risk?.severity ?? 'watch'} />
            <div>Portfolio pressure: <span className="font-mono text-slate-100">{risk?.pressureScore ?? '-'}</span></div>
            <div>Reports stored: <span className="font-mono text-slate-100">{ops.reports.data?.data.length ?? 0}</span></div>
            <div>Approvals open: <span className="font-mono text-slate-100">{core.approvals.data?.data.length ?? 0}</span></div>
          </div>
        </Panel>
        <Panel title="Executive Brief Draft" icon={<Bot size={15} />}>
          <article className="min-h-80 bg-terminal-base p-5 text-sm leading-7 text-slate-300 print:bg-white print:text-black">
            <h2 className="mb-3 text-xl font-black text-slate-100 print:text-black">Macro Morning Brief</h2>
            <p>{String((latestReport?.contentJson as { executiveSummary?: string } | undefined)?.executiveSummary ?? 'Generate a report to create the CIO morning brief from live normalized backend data.')}</p>
            <div className="mt-5 grid gap-2">
              {(core.signals.data?.data ?? []).slice(0, 5).map((signal) => (
                <div key={signal.id} className="border-l-2 border-cyan-300 pl-3">
                  <b>{signal.title}</b>
                  <div className="text-xs text-slate-500">{signal.description}</div>
                </div>
              ))}
            </div>
          </article>
        </Panel>
      </div>
    </div>
  );
}

function SystemHealth() {
  const core = useCoreData();
  const health = core.health.data?.data;
  return (
    <div className="grid gap-3">
      <PageHeader title="System Health Dashboard" subtitle="Operational monitoring for data feeds, Qwen gateway, queues, workflows, stale data, and source health." />
      {!health ? <LoadingBlock /> : (
        <>
          <div className="grid gap-3 xl:grid-cols-4">
            <MetricTile label="Services" value={health.services.length} risk="normal" meta="registered components" />
            <MetricTile label="Cache" value={health.cache.mode} risk="watch" meta="Redis-ready" />
            <MetricTile label="Workflows" value={health.counts.workflows ?? 0} risk="elevated" meta="execution records" />
            <MetricTile label="Qwen Gateway" value={health.services.find((s) => s.service === 'qwen-gateway')?.status ?? '-'} risk="watch" meta="Qwen only" />
          </div>
          <div className="grid gap-3 2xl:grid-cols-[1fr_1fr]">
            <Panel title="Service Health" icon={<Server size={15} />}>
              <DenseTable
                columns={['Service', 'Status', 'Latency']}
                rows={health.services}
                renderRow={(row) => [row.service, <Badge value={row.status} tone={row.status === 'healthy' ? 'normal' : 'elevated'} />, `${row.latencyMs}ms`]}
              />
            </Panel>
            <Panel title="Latency Profile" icon={<Activity size={15} />}>
              <LatencyLine data={health.services} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function MarketGrid({ rows }: { rows: MarketData[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {rows.map((row) => (
        <div key={row.id} className="border border-terminal-line bg-terminal-muted p-3">
          <div className="flex items-center justify-between">
            <span className="font-black text-slate-200">{row.symbol}</span>
            <Badge value={formatPct(row.changePercent)} tone={(row.changePercent ?? 0) < 0 ? 'critical' : 'normal'} />
          </div>
          <div className="mt-2 font-mono text-xl font-black">{formatNumber(row.value)}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{row.provider} / {row.assetClass}</div>
        </div>
      ))}
    </div>
  );
}

function AgentResponse({ logs }: { logs: AgentLog[] }) {
  const final = logs[logs.length - 1];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Badge value={final.outputJson.riskLevel ?? 'watch'} tone={final.outputJson.riskLevel ?? 'watch'} />
        <Badge value={`${Math.round((final.outputJson.confidence ?? final.confidence ?? 0) * 100)}% confidence`} tone="watch" />
        {final.outputJson.approvalRequired ? <Badge value="approval required" tone="high" /> : <Badge value="no approval gate" tone="normal" />}
      </div>
      <p className="text-sm leading-6 text-slate-300">{final.outputJson.summary}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">Key Signals</div>
          <ul className="grid gap-1 text-xs text-slate-300">
            {(final.outputJson.keySignals ?? []).map((item) => <li key={item} className="border-l-2 border-cyan-300 pl-2">{item}</li>)}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">Affected Positions</div>
          <div className="flex flex-wrap gap-2">{(final.outputJson.affectedPositions ?? []).map((item) => <Badge key={item} value={item} tone="elevated" />)}</div>
        </div>
      </div>
    </div>
  );
}
