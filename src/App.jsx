import React, { Fragment, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Zap
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const navItems = [
  { id: 'executive', label: 'Executive Dashboard', icon: LayoutDashboard },
  { id: 'command', label: 'AI Command Center', icon: Bot },
  { id: 'risk', label: 'Portfolio Risk Monitor', icon: Gauge },
  { id: 'workflow', label: 'Multi-Agent Workflow', icon: GitBranch },
  { id: 'approvals', label: 'Approval Queue', icon: UserCheck },
  { id: 'audit', label: 'Audit Trail', icon: Archive },
  { id: 'data', label: 'Data Lake / Integrations', icon: Database },
  { id: 'brief', label: 'CIO Morning Brief', icon: FileText },
  { id: 'health', label: 'System Health', icon: Server }
];

const marketMoves = [
  { asset: 'USDJPY', move: '+0.84%', tone: 'up', value: 162.18 },
  { asset: 'US10Y', move: '+7.4bp', tone: 'up', value: 4.71 },
  { asset: 'GLD', move: '-1.12%', tone: 'down', value: 191.4 },
  { asset: 'WTI', move: '+2.36%', tone: 'up', value: 88.2 },
  { asset: 'SPY', move: '-0.68%', tone: 'down', value: 514.7 },
  { asset: 'QQQ', move: '-1.24%', tone: 'down', value: 442.3 }
];

const riskTrend = [
  { t: '04:00', risk: 42 },
  { t: '06:00', risk: 47 },
  { t: '08:00', risk: 58 },
  { t: '10:00', risk: 64 },
  { t: '12:00', risk: 71 },
  { t: '14:00', risk: 68 }
];

const exposureRows = [
  { factor: 'USD Strength', usdjpy: 92, us10y: 12, gld: -48, oil: -18, spy: 8, qqq: -22 },
  { factor: 'Higher Real Yields', usdjpy: 38, us10y: 88, gld: -82, oil: -16, spy: 34, qqq: -78 },
  { factor: 'Growth Shock', usdjpy: -32, us10y: -44, gld: 34, oil: -72, spy: 64, qqq: -70 },
  { factor: 'Geopolitical Stress', usdjpy: -8, us10y: -14, gld: 78, oil: 86, spy: 52, qqq: -44 },
  { factor: 'Risk-On Liquidity', usdjpy: 20, us10y: -18, gld: -22, oil: 48, spy: -64, qqq: 86 }
];

const approvals = [
  { id: 'APR-1048', type: 'CIO Brief', title: 'CPI surprise regime update', risk: 'High', owner: 'CIO', age: '18m', status: 'Pending' },
  { id: 'APR-1047', type: 'Risk Escalation', title: 'QQQ real-yield sensitivity breach', risk: 'Critical', owner: 'Risk', age: '31m', status: 'In Review' },
  { id: 'APR-1045', type: 'Compliance', title: 'Unsupported oil shock claim', risk: 'Elevated', owner: 'Compliance', age: '44m', status: 'Changes Requested' },
  { id: 'APR-1042', type: 'News Summary', title: 'BOJ intervention cluster', risk: 'Watch', owner: 'Analyst', age: '1h', status: 'Pending' }
];

const auditEvents = [
  { time: '14:08:44', actor: 'Macro Regime Agent', action: 'classified regime', object: 'Higher Real Yield Pressure', sev: 'Elevated' },
  { time: '14:07:12', actor: 'Portfolio Risk Agent', action: 'created risk snapshot', object: 'GLOBAL-MACRO-01', sev: 'High' },
  { time: '14:06:51', actor: 'Compliance Agent', action: 'flagged claim', object: 'Draft Brief v3', sev: 'Elevated' },
  { time: '14:05:28', actor: 'Analyst A. Rao', action: 'attached evidence', object: 'FRED:DGS10', sev: 'Normal' },
  { time: '14:04:09', actor: 'Data Ingestion Agent', action: 'normalized release', object: 'US CPI YoY', sev: 'Normal' },
  { time: '14:02:35', actor: 'News Agent', action: 'clustered articles', object: 'Fed path repricing', sev: 'Watch' }
];

const dataSources = [
  { name: 'FRED', type: 'Macro Time Series', status: 'Healthy', freshness: '2m', records: '18,442', latency: '184ms' },
  { name: 'Alpha Vantage', type: 'FX / ETF / Commodities', status: 'Delayed', freshness: '14m', records: '4,091', latency: '611ms' },
  { name: 'Financial Modeling Prep', type: 'Calendar / News', status: 'Healthy', freshness: '1m', records: '9,805', latency: '245ms' },
  { name: 'Portfolio Mock Feed', type: 'Positions', status: 'Healthy', freshness: '5m', records: '6', latency: '22ms' },
  { name: 'Research PDFs', type: 'Institutional Memory', status: 'Degraded', freshness: '2h', records: '127', latency: '1.4s' },
  { name: 'Email Summaries', type: 'Internal Notes', status: 'Quarantined', freshness: '1d', records: '0', latency: '-' }
];

const workflowNodes = [
  { name: 'Data Ingestion', status: 'Completed', confidence: 96, time: '00:18' },
  { name: 'News Intelligence', status: 'Completed', confidence: 88, time: '00:41' },
  { name: 'Macro Regime', status: 'Completed', confidence: 82, time: '01:08' },
  { name: 'Portfolio Risk', status: 'Running', confidence: 74, time: '01:31' },
  { name: 'Compliance', status: 'Waiting', confidence: 0, time: '-' },
  { name: 'CIO Briefing', status: 'Blocked', confidence: 0, time: '-' }
];

const eventFeed = [
  { t: '14:08', title: 'US CPI Core MoM above consensus', tag: 'MACRO', risk: 'High' },
  { t: '14:06', title: 'US10Y breaks upper scenario band', tag: 'RATES', risk: 'Elevated' },
  { t: '14:01', title: 'Fed path repricing news cluster formed', tag: 'NEWS', risk: 'Watch' },
  { t: '13:56', title: 'GLD drawdown crosses watch threshold', tag: 'PORTFOLIO', risk: 'Elevated' },
  { t: '13:43', title: 'BOJ intervention chatter rising', tag: 'FX', risk: 'Watch' }
];

const healthRows = [
  { service: 'API Gateway', status: 'Healthy', latency: 42, load: 36 },
  { service: 'Qwen Gateway', status: 'Healthy', latency: 812, load: 61 },
  { service: 'Workflow Worker', status: 'Healthy', latency: 96, load: 47 },
  { service: 'Ingestion Worker', status: 'Degraded', latency: 1410, load: 72 },
  { service: 'PostgreSQL', status: 'Healthy', latency: 18, load: 34 },
  { service: 'Redis', status: 'Healthy', latency: 7, load: 29 }
];

function AppShell({ activePage, setActivePage, children }) {
  return (
    <div className="app-shell">
      <TopIntelligenceBar />
      <aside className="nav-rail">
        <div className="brand-block">
          <div className="brand-mark">MF</div>
          <div>
            <div className="brand-title">Macro OS</div>
            <div className="brand-subtitle">Institutional AI</div>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                key={item.id}
                onClick={() => setActivePage(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="workspace">{children}</main>
      <RightContextDrawer />
      <EventAuditTicker />
    </div>
  );
}

function TopIntelligenceBar() {
  return (
    <header className="top-bar">
      <div className="market-clock">
        <Radio size={15} className="pulse" />
        <span>Asia Live</span>
        <span className="muted">SGT 14:12</span>
      </div>
      <div className="top-metrics">
        <StatusBadge label="REGIME: HIGHER REAL YIELDS" tone="amber" />
        <StatusBadge label="RISK: HIGH" tone="orange" />
        <StatusBadge label="DATA: MIXED FRESHNESS" tone="cyan" />
        <StatusBadge label="APPROVALS: 4 OPEN" tone="red" />
      </div>
      <button className="command-button">
        <Search size={15} />
        Command / Ask Qwen
        <kbd>⌘K</kbd>
      </button>
    </header>
  );
}

function RightContextDrawer() {
  return (
    <aside className="context-drawer">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Selected Context</span>
          <h3>US CPI Surprise Chain</h3>
        </div>
        <ShieldCheck size={16} />
      </div>
      <div className="context-section">
        <span className="section-label">Evidence</span>
        <EvidenceItem source="FRED:DGS10" label="10Y yield +7.4bp since release" />
        <EvidenceItem source="FMP:ECON-7712" label="Core CPI MoM actual above consensus" />
        <EvidenceItem source="AV:QQQ" label="QQQ pressure aligns with real-rate sensitivity" />
      </div>
      <div className="context-section">
        <span className="section-label">Qwen Interpretation</span>
        <p className="dense-copy">
          The regime shift is driven by rates repricing rather than broad risk liquidation. Portfolio pressure is concentrated in long QQQ and long GLD, partially offset by short US10Y futures.
        </p>
      </div>
      <div className="context-section">
        <span className="section-label">Approval Gate</span>
        <div className="approval-card">
          <AlertTriangle size={15} />
          CIO approval required before briefing publication.
        </div>
      </div>
    </aside>
  );
}

function EventAuditTicker() {
  return (
    <footer className="ticker">
      {auditEvents.slice(0, 5).map((event) => (
        <span key={`${event.time}-${event.action}`}>
          <b>{event.time}</b> {event.actor}: {event.action}
        </span>
      ))}
    </footer>
  );
}

export function App() {
  const [activePage, setActivePage] = useState('executive');
  const page = useMemo(() => {
    const pages = {
      executive: <ExecutiveDashboard />,
      command: <AICommandCenter />,
      risk: <PortfolioRiskMonitor />,
      workflow: <WorkflowScreen />,
      approvals: <ApprovalQueue />,
      audit: <AuditTrail />,
      data: <DataLake />,
      brief: <CIOMorningBrief />,
      health: <SystemHealth />
    };
    return pages[activePage] ?? pages.executive;
  }, [activePage]);

  return (
    <AppShell activePage={activePage} setActivePage={setActivePage}>
      {page}
    </AppShell>
  );
}

function ExecutiveDashboard() {
  return (
    <Page title="Executive Dashboard" subtitle="CIO operating picture across macro, risk, workflows, and approvals.">
      <div className="metric-grid four">
        <MetricTile label="Portfolio Pressure" value="71" unit="/100" tone="orange" delta="+13 since CPI" />
        <MetricTile label="Macro Regime" value="HY Real Yields" tone="amber" delta="82% confidence" />
        <MetricTile label="Open Approvals" value="4" tone="red" delta="1 critical" />
        <MetricTile label="Data Freshness" value="83%" tone="cyan" delta="1 source quarantined" />
      </div>
      <div className="dashboard-grid executive-grid">
        <Panel title="Cross-Asset Market Moves" icon={BarChart3}>
          <div className="market-grid">
            {marketMoves.map((item) => (
              <div className={`market-cell ${item.tone}`} key={item.asset}>
                <span>{item.asset}</span>
                <b>{item.move}</b>
                <small>{item.value}</small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Risk Score Trend" icon={Activity}>
          <ChartBox>
            <ResponsiveContainer>
              <AreaChart data={riskTrend}>
                <defs>
                  <linearGradient id="riskFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f3342" vertical={false} />
                <XAxis dataKey="t" stroke="#789" fontSize={11} />
                <YAxis stroke="#789" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="risk" stroke="#f97316" fill="url(#riskFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>
        <Panel title="Pending CIO Decisions" icon={UserCheck}>
          <DenseTable
            columns={['ID', 'Type', 'Risk', 'Age']}
            rows={approvals.slice(0, 3).map((a) => [a.id, a.type, <RiskBadge value={a.risk} />, a.age])}
          />
        </Panel>
        <Panel title="Today’s Macro Calendar" icon={Clock3}>
          <Timeline
            items={[
              ['08:30 ET', 'US CPI', 'Released', 'High'],
              ['10:00 ET', 'Fed Chair testimony', 'Upcoming', 'Elevated'],
              ['13:00 ET', '10Y auction', 'Upcoming', 'Watch'],
              ['18:50 JST', 'Japan GDP prelim', 'Scheduled', 'Watch']
            ]}
          />
        </Panel>
      </div>
    </Page>
  );
}

function AICommandCenter() {
  return (
    <Page title="AI Command Center" subtitle="Analyst cockpit for event intelligence, source-bound Qwen reasoning, and briefing assembly.">
      <div className="command-layout">
        <Panel title="Live Macro Event Feed" icon={Radio}>
          <EventFeed />
        </Panel>
        <Panel title="Qwen Task Composer" icon={MessageSquareText}>
          <div className="composer">
            <div className="composer-context">
              <StatusBadge label="CONTEXT: CPI EVENT CHAIN" tone="cyan" />
              <StatusBadge label="SOURCES: 7 VERIFIED" tone="green" />
              <StatusBadge label="MODE: INTERPRETATION ONLY" tone="amber" />
            </div>
            <textarea readOnly value={'Explain portfolio impact of the CPI surprise using only attached market, macro, and portfolio facts.'} />
            <div className="button-row">
              <button className="primary-action"><Zap size={14} /> Run Qwen Analysis</button>
              <button className="ghost-action"><FileText size={14} /> Add to Brief</button>
            </div>
          </div>
        </Panel>
        <Panel title="News Intelligence Clusters" icon={Activity}>
          <DenseTable
            columns={['Cluster', 'Sources', 'Relevance', 'Status']}
            rows={[
              ['Fed path repricing', '18', <ConfidenceMeter value={91} />, <StatusBadge label="Reviewed" tone="green" />],
              ['BOJ intervention chatter', '9', <ConfidenceMeter value={67} />, <StatusBadge label="Watch" tone="cyan" />],
              ['Oil supply shock risk', '14', <ConfidenceMeter value={74} />, <StatusBadge label="Needs Source" tone="amber" />],
              ['Equity duration pressure', '11', <ConfidenceMeter value={83} />, <StatusBadge label="Approved" tone="green" />]
            ]}
          />
        </Panel>
        <Panel title="Event Impact Timeline" icon={TrendingUp}>
          <Timeline
            items={[
              ['14:00', 'CPI release parsed', 'Data Ingestion', 'Normal'],
              ['14:01', 'US10Y +7.4bp', 'Market Data', 'Elevated'],
              ['14:03', 'QQQ breach detected', 'Risk Engine', 'High'],
              ['14:06', 'CIO brief section drafted', 'Qwen', 'Watch']
            ]}
          />
        </Panel>
      </div>
    </Page>
  );
}

function PortfolioRiskMonitor() {
  return (
    <Page title="Portfolio Risk Monitor" subtitle="Deterministic exposure impact with Qwen explanations layered on top.">
      <div className="metric-grid four">
        <MetricTile label="Risk Severity" value="High" tone="orange" delta="CIO review required" />
        <MetricTile label="Largest Contributor" value="QQQ" tone="red" delta="-1.24% move" />
        <MetricTile label="Offset" value="US10Y Short" tone="green" delta="+22 pressure relief" />
        <MetricTile label="Concentration" value="Real Yields" tone="amber" delta="42% factor share" />
      </div>
      <div className="dashboard-grid risk-grid">
        <Panel title="Macro Factor Exposure Heatmap" icon={SlidersHorizontal}>
          <RiskHeatmap />
        </Panel>
        <Panel title="Position Risk Contribution" icon={BarChart3}>
          <ChartBox>
            <ResponsiveContainer>
              <BarChart data={[
                { name: 'USDJPY', v: 14 },
                { name: 'US10Y', v: -22 },
                { name: 'GLD', v: 27 },
                { name: 'Oil', v: 18 },
                { name: 'SPY', v: -12 },
                { name: 'QQQ', v: 46 }
              ]}>
                <CartesianGrid stroke="#1f3342" vertical={false} />
                <XAxis dataKey="name" stroke="#789" fontSize={11} />
                <YAxis stroke="#789" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="v">
                  {[14, -22, 27, 18, -12, 46].map((v, i) => <Cell key={i} fill={v > 25 ? '#ef4444' : v > 0 ? '#f97316' : '#22c55e'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>
        <Panel title="Scenario Matrix" icon={Gauge}>
          <DenseTable
            columns={['Scenario', 'Pressure', 'Severity', 'Action']}
            rows={[
              ['Hot CPI + hawkish Fed', '+31', <RiskBadge value="Critical" />, 'Escalate'],
              ['Oil supply shock', '+18', <RiskBadge value="High" />, 'Review'],
              ['Risk-on liquidity', '-9', <RiskBadge value="Watch" />, 'Monitor'],
              ['Growth scare', '+24', <RiskBadge value="High" />, 'Review']
            ]}
          />
        </Panel>
      </div>
    </Page>
  );
}

function WorkflowScreen() {
  return (
    <Page title="Multi-Agent Workflow Screen" subtitle="Operational visibility into source-bound agent execution and approval gates.">
      <Panel title="Morning Macro Brief Workflow" icon={GitBranch}>
        <div className="workflow-graph">
          {workflowNodes.map((node, index) => (
            <div className="workflow-step-wrap" key={node.name}>
              <div className={`workflow-node ${node.status.toLowerCase()}`}>
                <div className="node-top">
                  <Bot size={16} />
                  <StatusDot status={node.status} />
                </div>
                <b>{node.name}</b>
                <span>{node.status}</span>
                <small>{node.confidence ? `${node.confidence}% confidence` : 'approval gated'}</small>
                <small>{node.time}</small>
              </div>
              {index < workflowNodes.length - 1 && <ChevronRight className="workflow-arrow" size={20} />}
            </div>
          ))}
        </div>
      </Panel>
      <div className="dashboard-grid two">
        <Panel title="Agent Run Timeline" icon={Clock3}>
          <Timeline
            items={[
              ['00:00', 'Workflow started by Analyst A. Rao', 'System', 'Normal'],
              ['00:18', 'Data ingestion completed', 'Agent', 'Normal'],
              ['00:59', 'News clusters summarized', 'Qwen', 'Watch'],
              ['01:08', 'Regime classified as higher real yields', 'Qwen', 'Elevated'],
              ['01:31', 'Risk engine running exposure impact', 'Risk', 'High']
            ]}
          />
        </Panel>
        <Panel title="Tool Call Log" icon={Database}>
          <DenseTable
            columns={['Tool', 'Input', 'Status', 'Latency']}
            rows={[
              ['fred.series', 'DGS10', <StatusBadge label="OK" tone="green" />, '184ms'],
              ['fmp.calendar', 'US CPI', <StatusBadge label="OK" tone="green" />, '245ms'],
              ['risk.calculate', 'GLOBAL-MACRO-01', <StatusBadge label="RUNNING" tone="cyan" />, '1.2s'],
              ['qwen.reason', 'regime_summary', <StatusBadge label="OK" tone="green" />, '812ms']
            ]}
          />
        </Panel>
      </div>
    </Page>
  );
}

function ApprovalQueue() {
  return (
    <Page title="Approval Queue" subtitle="Human authority layer for AI recommendations, risk escalations, and CIO brief publication.">
      <div className="approval-layout">
        <Panel title="Pending Approvals" icon={UserCheck}>
          <DenseTable
            columns={['ID', 'Type', 'Title', 'Risk', 'Owner', 'Age', 'Status']}
            rows={approvals.map((a) => [a.id, a.type, a.title, <RiskBadge value={a.risk} />, a.owner, a.age, a.status])}
          />
        </Panel>
        <Panel title="Approval Detail: APR-1048" icon={LockKeyhole}>
          <div className="approval-detail">
            <div className="detail-strip">
              <StatusBadge label="CIO REQUIRED" tone="red" />
              <StatusBadge label="QWEN: SOURCE-BOUND" tone="cyan" />
              <StatusBadge label="COMPLIANCE: PASS WITH NOTE" tone="amber" />
            </div>
            <h3>CPI surprise regime update</h3>
            <p className="dense-copy">
              Recommendation: publish the morning brief with a high-risk flag and explicit uncertainty around second-order equity effects. The brief may not include unsourced claims about policy path probability.
            </p>
            <div className="button-row">
              <button className="primary-action"><CheckCircle2 size={14} /> Approve</button>
              <button className="ghost-action"><RefreshCw size={14} /> Request Revision</button>
              <button className="danger-action"><AlertTriangle size={14} /> Escalate</button>
            </div>
          </div>
        </Panel>
      </div>
    </Page>
  );
}

function AuditTrail() {
  return (
    <Page title="Audit Trail" subtitle="Forensic record of users, agents, data, prompts, approvals, and generated artifacts.">
      <Panel title="Immutable Event Timeline" icon={Archive}>
        <DenseTable
          columns={['Time', 'Actor', 'Action', 'Object', 'Severity']}
          rows={auditEvents.map((e) => [e.time, e.actor, e.action, e.object, <RiskBadge value={e.sev} />])}
        />
      </Panel>
      <div className="dashboard-grid two">
        <Panel title="Model Invocation Log" icon={Bot}>
          <DenseTable
            columns={['Run', 'Model', 'Prompt', 'Sources', 'Status']}
            rows={[
              ['QWN-9081', 'Qwen', 'macro_regime_v4', '12', <StatusBadge label="Validated" tone="green" />],
              ['QWN-9079', 'Qwen', 'risk_explain_v2', '9', <StatusBadge label="Validated" tone="green" />],
              ['QWN-9072', 'Qwen', 'compliance_redline_v1', '4', <StatusBadge label="Flagged" tone="amber" />]
            ]}
          />
        </Panel>
        <Panel title="Provenance Snapshot" icon={ShieldCheck}>
          <div className="provenance">
            <div>Report: CIO Morning Brief v3</div>
            <div>Sources: FRED, FMP, Alpha Vantage, Portfolio Mock Feed</div>
            <div>Approver: Pending CIO</div>
            <div>Payload hash: 7c9a...31f2</div>
          </div>
        </Panel>
      </div>
    </Page>
  );
}

function DataLake() {
  return (
    <Page title="Data Lake / Integrations" subtitle="Source health, freshness, schema validation, and ingestion controls.">
      <div className="source-grid">
        {dataSources.map((source) => (
          <div className={`source-card ${source.status.toLowerCase()}`} key={source.name}>
            <div className="source-card-head">
              <Database size={16} />
              <StatusDot status={source.status} />
            </div>
            <h3>{source.name}</h3>
            <span>{source.type}</span>
            <div className="source-stats">
              <b>{source.freshness}</b>
              <small>freshness</small>
              <b>{source.records}</b>
              <small>records</small>
              <b>{source.latency}</b>
              <small>latency</small>
            </div>
          </div>
        ))}
      </div>
      <Panel title="Ingestion Control Table" icon={RefreshCw}>
        <DenseTable
          columns={['Source', 'Status', 'Freshness', 'Records', 'Latency', 'Action']}
          rows={dataSources.map((s) => [s.name, <StatusBadge label={s.status} tone={toneForStatus(s.status)} />, s.freshness, s.records, s.latency, 'Inspect'])}
        />
      </Panel>
    </Page>
  );
}

function CIOMorningBrief() {
  return (
    <Page title="CIO Morning Brief" subtitle="Executive briefing artifact with source citations, approvals, and version history.">
      <div className="brief-layout">
        <Panel title="Brief Outline" icon={FileText}>
          <Timeline
            items={[
              ['1', 'Executive summary', 'Drafted', 'Elevated'],
              ['2', 'Overnight market moves', 'Validated', 'Normal'],
              ['3', 'Macro regime update', 'Review', 'High'],
              ['4', 'Portfolio implications', 'Review', 'High'],
              ['5', 'Required decisions', 'Pending', 'Critical']
            ]}
          />
        </Panel>
        <Panel title="Draft Brief v3" icon={MessageSquareText}>
          <article className="brief-doc">
            <h2>Higher Real Yield Pressure After CPI Surprise</h2>
            <p>
              The system classifies the current regime as higher real yield pressure with elevated portfolio sensitivity. The largest pressure points are long QQQ and long GLD, partially offset by the short US10Y futures sleeve.
            </p>
            <p>
              Recommended CIO action: review duration-sensitive equity exposure and approve publication of the risk escalation note after compliance removes unsupported policy-probability language.
            </p>
          </article>
        </Panel>
      </div>
    </Page>
  );
}

function SystemHealth() {
  return (
    <Page title="System Health Dashboard" subtitle="Operational reliability for APIs, queues, workers, Qwen gateway, and data services.">
      <div className="metric-grid four">
        <MetricTile label="API Uptime" value="99.98%" tone="green" delta="30d rolling" />
        <MetricTile label="Qwen Latency" value="812ms" tone="cyan" delta="p50 structured calls" />
        <MetricTile label="Queue Depth" value="18" tone="amber" delta="4 priority jobs" />
        <MetricTile label="Failed Jobs" value="2" tone="orange" delta="ingestion retries" />
      </div>
      <Panel title="Service Health" icon={Server}>
        <DenseTable
          columns={['Service', 'Status', 'Latency', 'Load']}
          rows={healthRows.map((h) => [h.service, <StatusBadge label={h.status} tone={toneForStatus(h.status)} />, `${h.latency}ms`, <ConfidenceMeter value={h.load} />])}
        />
      </Panel>
      <Panel title="Latency Trend" icon={Activity}>
        <ChartBox>
          <ResponsiveContainer>
            <LineChart data={riskTrend}>
              <CartesianGrid stroke="#1f3342" vertical={false} />
              <XAxis dataKey="t" stroke="#789" fontSize={11} />
              <YAxis stroke="#789" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line dataKey="risk" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      </Panel>
    </Page>
  );
}

function Page({ title, subtitle, children }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Macro Fund AI Operating System</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="page-actions">
          <button className="ghost-action"><RefreshCw size={14} /> Refresh</button>
          <button className="primary-action"><FileText size={14} /> Generate Brief</button>
        </div>
      </div>
      {children}
    </section>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{Icon && <Icon size={15} />} {title}</h2>
        <button className="icon-button"><ChevronRight size={15} /></button>
      </div>
      {children}
    </section>
  );
}

function MetricTile({ label, value, unit, tone, delta }) {
  return (
    <div className={`metric-tile ${tone}`}>
      <span>{label}</span>
      <div><b>{value}</b>{unit && <small>{unit}</small>}</div>
      <em>{delta}</em>
    </div>
  );
}

function DenseTable({ columns, rows }) {
  return (
    <div className="dense-table-wrap">
      <table className="dense-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ label, tone = 'cyan' }) {
  return <span className={`status-badge ${tone}`}>{label}</span>;
}

function RiskBadge({ value }) {
  return <span className={`risk-badge ${riskClass(value)}`}>{value}</span>;
}

function StatusDot({ status }) {
  return <span className={`status-dot ${toneForStatus(status)}`} title={status} />;
}

function ConfidenceMeter({ value }) {
  return (
    <div className="confidence-meter">
      <span style={{ width: `${value}%` }} />
      <b>{value}%</b>
    </div>
  );
}

function ChartBox({ children }) {
  return <div className="chart-box">{children}</div>;
}

function Timeline({ items }) {
  return (
    <div className="timeline">
      {items.map(([time, title, meta, sev]) => (
        <div className="timeline-item" key={`${time}-${title}`}>
          <span className={`timeline-dot ${riskClass(sev)}`} />
          <time>{time}</time>
          <b>{title}</b>
          <small>{meta}</small>
        </div>
      ))}
    </div>
  );
}

function EvidenceItem({ source, label }) {
  return (
    <div className="evidence-item">
      <span>{source}</span>
      <p>{label}</p>
    </div>
  );
}

function EventFeed() {
  return (
    <div className="event-feed">
      {eventFeed.map((event) => (
        <button className="event-row" key={`${event.t}-${event.title}`}>
          <time>{event.t}</time>
          <span>{event.title}</span>
          <StatusBadge label={event.tag} tone="cyan" />
          <RiskBadge value={event.risk} />
        </button>
      ))}
    </div>
  );
}

function RiskHeatmap() {
  const keys = ['usdjpy', 'us10y', 'gld', 'oil', 'spy', 'qqq'];
  return (
    <div className="heatmap">
      <div className="heatmap-header" />
      {keys.map((key) => <div className="heatmap-header" key={key}>{key.toUpperCase()}</div>)}
      {exposureRows.map((row) => (
        <Fragment key={row.factor}>
          <div className="heatmap-factor" key={`${row.factor}-label`}>{row.factor}</div>
          {keys.map((key) => {
            const value = row[key];
            return <div className="heatmap-cell" data-level={heatLevel(value)} key={`${row.factor}-${key}`}>{value}</div>;
          })}
        </Fragment>
      ))}
    </div>
  );
}

function toneForStatus(status) {
  const s = String(status).toLowerCase();
  if (s.includes('healthy') || s.includes('completed') || s.includes('ok') || s.includes('approved') || s.includes('validated')) return 'green';
  if (s.includes('running') || s.includes('watch')) return 'cyan';
  if (s.includes('delayed') || s.includes('waiting') || s.includes('degraded') || s.includes('review')) return 'amber';
  if (s.includes('failed') || s.includes('blocked') || s.includes('critical') || s.includes('quarantined')) return 'red';
  return 'slate';
}

function riskClass(value) {
  const v = String(value).toLowerCase();
  if (v.includes('critical')) return 'critical';
  if (v.includes('high')) return 'high';
  if (v.includes('elevated')) return 'elevated';
  if (v.includes('watch')) return 'watch';
  if (v.includes('normal')) return 'normal';
  return 'watch';
}

function heatLevel(value) {
  const abs = Math.abs(value);
  if (abs > 75) return value > 0 ? 'pos3' : 'neg3';
  if (abs > 45) return value > 0 ? 'pos2' : 'neg2';
  if (abs > 20) return value > 0 ? 'pos1' : 'neg1';
  return 'flat';
}

const tooltipStyle = {
  background: '#07131d',
  border: '1px solid #244050',
  color: '#d8e7ee',
  borderRadius: 4,
  fontSize: 12
};
