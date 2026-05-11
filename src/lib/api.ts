import type {
  AgentLog,
  ApiEnvelope,
  Approval,
  AuditEvent,
  CalendarEvent,
  ExecutiveAlert,
  DemoRun,
  DemoScenario,
  HealthSnapshot,
  IntegrationStatus,
  MacroIndicator,
  MarketData,
  NewsArticle,
  Portfolio,
  RiskSnapshot,
  Signal,
  Workflow,
  WorkflowDetail
} from './types';

function resolveApiBase() {
  if (typeof window === 'undefined') return '';
  const isLocalBrowser = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  return isLocalBrowser ? 'http://127.0.0.1:4000' : '';
}

const API_BASE = resolveApiBase();

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'cio',
      'x-user-id': 'frontend-cio',
      ...(options.headers ?? {})
    }
  });

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    const preview = text.trim().slice(0, 120);
    throw new Error(`Expected JSON from ${path}, received ${contentType || 'unknown content type'}: ${preview}`);
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? `API request failed: ${response.status}`);
  }
  return payload;
}

export const api = {
  health: () => request<HealthSnapshot>('/api/health'),
  marketData: () => request<MarketData[]>('/api/market-data?limit=100'),
  macro: () => request<MacroIndicator[]>('/api/macro?limit=100'),
  news: () => request<NewsArticle[]>('/api/news?limit=100'),
  calendar: () => request<CalendarEvent[]>('/api/economic-calendar?limit=100'),
  portfolio: () => request<Portfolio>('/api/portfolio/GLOBAL-MACRO-01'),
  risk: () => request<RiskSnapshot>('/api/risk/GLOBAL-MACRO-01'),
  signals: () => request<Signal[]>('/api/signals?limit=100'),
  approvals: () => request<Approval[]>('/api/approvals'),
  audit: () => request<AuditEvent[]>('/api/audit?limit=100'),
  workflows: () => request<Workflow[]>('/api/workflows?limit=100'),
  workflow: (id: string) => request<WorkflowDetail>(`/api/workflows/${id}`),
  agentLogs: () => request<AgentLog[]>('/api/agent-logs?limit=100'),
  alerts: () => request<ExecutiveAlert[]>('/api/executive-alerts?limit=100'),
  integrations: () => request<IntegrationStatus>('/api/integrations'),
  reports: () => request<Array<Record<string, unknown>>>('/api/reports'),
  runWorkflow: (workflow: string, question?: string) =>
    request<{ workflow: Workflow; agents: AgentLog[]; approval: Approval | null; alerts: ExecutiveAlert[] }>('/api/workflows/run', {
      method: 'POST',
      body: JSON.stringify({ workflow, portfolioId: 'GLOBAL-MACRO-01', question })
    }),
  ask: (question: string) =>
    request<{ workflow: Workflow; agents: AgentLog[]; approval: Approval | null; alerts: ExecutiveAlert[] }>('/api/ask', {
      method: 'POST',
      body: JSON.stringify({ question, portfolioId: 'GLOBAL-MACRO-01' })
    }),
  decideApproval: (id: string, decision: string, comment: string) =>
    request<{ approval: Approval; workflow: Workflow | null }>(`/api/approvals/${id}`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment })
    }),
  generateReport: () =>
    request<{ report: Record<string, unknown>; approval: Approval }>('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'cio_morning_brief', portfolioId: 'GLOBAL-MACRO-01' })
    }),
  runIngestion: () =>
    request<{ run: Record<string, unknown>; signals: Signal[] }>('/api/ingestion/run', {
      method: 'POST',
      body: JSON.stringify({ sources: ['fred', 'alpha_vantage', 'fmp'] })
    }),
  demoScenarios: () => request<DemoScenario[]>('/api/demo/scenarios'),
  demoRuns: () => request<DemoRun[]>('/api/demo/runs'),
  runDemo: (scenarioId: string) =>
    request<{ scenario: DemoScenario; run: DemoRun; workflow: { workflow: Workflow; agents: AgentLog[]; approval: Approval | null; alerts: ExecutiveAlert[] } }>('/api/demo/run', {
      method: 'POST',
      body: JSON.stringify({ scenarioId })
    })
};
