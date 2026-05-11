export type RiskLevel = 'normal' | 'watch' | 'elevated' | 'high' | 'critical';

export type ApiEnvelope<T> = {
  requestId: string;
  data: T;
  pageInfo?: {
    limit: number;
    cursor: string | null;
    nextCursor: string | null;
    total: number;
  };
  freshness?: {
    asOf?: string;
    status?: string;
  };
};

export type MarketData = {
  id: string;
  provider: string;
  symbol: string;
  canonicalSymbol?: string;
  assetClass: string;
  timestamp: string;
  value: number;
  previousValue?: number | null;
  change?: number | null;
  changePercent?: number | null;
  unit: string;
  freshnessStatus: string;
};

export type MacroIndicator = {
  id: string;
  provider: string;
  seriesId: string;
  name: string;
  date: string;
  value: number;
  previousValue?: number | null;
  change?: number | null;
  units: string;
  freshnessStatus: string;
};

export type NewsArticle = {
  id: string;
  provider: string;
  title: string;
  publishedAt: string;
  source: string;
  summary?: string | null;
  clusterId: string;
  category: string;
  symbols: string[];
  relevanceScore: number;
};

export type CalendarEvent = {
  id: string;
  provider: string;
  event: string;
  country: string;
  date: string;
  actual: number | null;
  previous: number | null;
  consensus: number | null;
  surprise: number | null;
  surprisePercent: number | null;
  importance: string;
  category: string;
};

export type Signal = {
  id: string;
  type: string;
  severity: RiskLevel;
  title: string;
  description: string;
  symbol: string | null;
  sourceIds: string[];
  data: Record<string, unknown>;
  generatedAt: string;
};

export type PortfolioPosition = {
  id: string;
  portfolioId: string;
  symbol: string;
  direction: 'long' | 'short';
  assetClass: string;
  notional: number;
  currency: string;
};

export type Portfolio = {
  portfolioId: string;
  asOf: string;
  totalNotional: number;
  positions: PortfolioPosition[];
};

export type RiskSnapshot = {
  id: string;
  portfolioId: string;
  asOf: string;
  pressureScore: number;
  severity: RiskLevel;
  factorJson: Record<string, number>;
  scenarioJson: Record<string, number>;
  breachFlags: Array<{ code: string; severity: RiskLevel; symbol?: string }>;
  concentration: { largestSymbol: string; largestShare: number; penalty: number };
  positionContributions: Array<{
    symbol: string;
    direction: string;
    notional: number;
    pressureContribution: number;
    primarySensitivity: string;
  }>;
};

export type Approval = {
  id: string;
  objectType: string;
  objectId: string;
  title: string;
  status: string;
  riskLevel: RiskLevel;
  requiredRole: string;
  decision?: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type AgentLog = {
  id: string;
  workflowId: string;
  agent: string;
  outputJson: {
    summary?: string;
    keySignals?: string[];
    affectedPositions?: string[];
    riskLevel?: RiskLevel;
    confidence?: number;
    sourcesUsed?: string[];
    recommendations?: string[];
    approvalRequired?: boolean;
    escalationReason?: string | null;
  };
  confidence: number;
  promptVersion?: string;
  modelVersion?: string;
  approvalRequired?: boolean;
  escalationRequired?: boolean;
  status?: string;
  createdAt: string;
};

export type Workflow = {
  id: string;
  type: string;
  status: string;
  state: string;
  startedBy: string;
  startedAt: string;
  completedAt?: string | null;
  currentStep?: string | null;
  approvalId?: string | null;
  contextJson?: Record<string, unknown>;
};

export type WorkflowDetail = {
  workflow: Workflow;
  logs: AgentLog[];
  orchestration: Array<{ id: string; agentName?: string; eventType: string; status: string; createdAt: string }>;
  memory: Array<{ id: string; key: string; createdAt: string }>;
  approvals: Approval[];
  alerts: ExecutiveAlert[];
};

export type ExecutiveAlert = {
  id: string;
  workflowId: string;
  title: string;
  riskLevel: RiskLevel;
  keySignals: string[];
  affectedPositions: string[];
  escalationReason?: string | null;
  approvalRequired: boolean;
  approvalId?: string | null;
  status: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string;
  objectType: string;
  objectId: string;
  payloadHash: string;
  createdAt: string;
};

export type HealthSnapshot = {
  asOf: string;
  services: Array<{ service: string; status: string; latencyMs: number }>;
  queues: Record<string, number>;
  counts: Record<string, number>;
  cache: { mode: string };
  sourceHealth: Array<{ provider: string; status: string; latencyMs: number; circuit: { state: string } }>;
};

export type IntegrationStatus = {
  asOf: string;
  providers: Array<{ provider: string; status: string; mode: string; records: number }>;
  health: HealthSnapshot['sourceHealth'];
  recentRuns: Array<{ id: string; status: string; completedAt: string; results: Array<Record<string, unknown>> }>;
};

export type DemoScenario = {
  id: string;
  title: string;
  subtitle: string;
  narrative: string[];
};

export type DemoRun = {
  id: string;
  scenarioId: string;
  title: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  workflowId?: string;
  approvalId?: string | null;
  alertIds?: string[];
  timeline: Array<{ step: number; narrative: string; createdAt: string }>;
};
