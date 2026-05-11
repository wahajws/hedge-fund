create table if not exists users (
  id uuid primary key,
  tenant_id text not null default 'macro-fund',
  team_id text not null default 'global-macro',
  email text unique not null,
  name text not null,
  role text not null default 'analyst',
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenants (
  id text primary key,
  name text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id text primary key,
  tenant_id text not null references tenants(id),
  name text not null,
  workflow_scope text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_tenant_team on users(tenant_id, team_id);

create table if not exists roles_permissions (
  id uuid primary key,
  role text not null,
  permission text not null,
  scope text,
  created_at timestamptz not null default now()
);

create index if not exists idx_roles_permissions_role on roles_permissions(role);
create index if not exists idx_roles_permissions_permission on roles_permissions(permission);

create table if not exists market_data (
  id uuid primary key,
  provider text not null,
  symbol text not null,
  asset_class text not null,
  timestamp timestamptz not null,
  value numeric not null,
  currency text,
  unit text,
  freshness_status text not null,
  raw_source_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_market_data_symbol_timestamp on market_data(symbol, timestamp desc);
create index if not exists idx_market_data_provider on market_data(provider);

create table if not exists macro_indicators (
  id uuid primary key,
  provider text not null,
  series_id text not null,
  name text not null,
  date date not null,
  value numeric not null,
  units text,
  realtime_start date,
  realtime_end date,
  raw_source_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_macro_indicators_series_date on macro_indicators(series_id, date desc);

create table if not exists portfolio_positions (
  id uuid primary key,
  tenant_id text not null default 'macro-fund',
  team_id text not null default 'global-macro',
  portfolio_id text not null,
  symbol text not null,
  direction text not null,
  quantity numeric not null,
  asset_class text not null,
  notional numeric not null,
  currency text not null,
  as_of timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_portfolio_positions_portfolio_asof on portfolio_positions(tenant_id, team_id, portfolio_id, as_of desc);

create table if not exists portfolio_risk_snapshots (
  id uuid primary key,
  portfolio_id text not null,
  as_of timestamptz not null,
  pressure_score numeric not null,
  severity text not null,
  factor_json jsonb not null,
  scenario_json jsonb not null,
  breach_flags_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_risk_snapshots_portfolio_asof on portfolio_risk_snapshots(portfolio_id, as_of desc);
create index if not exists idx_risk_snapshots_severity on portfolio_risk_snapshots(severity);

create table if not exists news_articles (
  id uuid primary key,
  provider text not null,
  title text not null,
  url text,
  published_at timestamptz not null,
  source text not null,
  summary text,
  cluster_id text,
  raw_source_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_news_articles_published_at on news_articles(published_at desc);
create index if not exists idx_news_articles_cluster_id on news_articles(cluster_id);

create table if not exists economic_calendar_events (
  id uuid primary key,
  provider text not null,
  event text not null,
  country text not null,
  date timestamptz not null,
  actual numeric,
  previous numeric,
  consensus numeric,
  surprise numeric,
  surprise_percent numeric,
  importance text not null,
  category text not null,
  freshness_status text not null,
  raw_source_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_economic_calendar_date on economic_calendar_events(date desc);
create index if not exists idx_economic_calendar_category on economic_calendar_events(category);
create index if not exists idx_economic_calendar_importance on economic_calendar_events(importance);

create table if not exists market_signals (
  id uuid primary key,
  type text not null,
  severity text not null,
  title text not null,
  description text not null,
  symbol text,
  source_ids jsonb not null,
  data jsonb not null,
  generated_at timestamptz not null
);

create index if not exists idx_market_signals_type on market_signals(type);
create index if not exists idx_market_signals_severity on market_signals(severity);
create index if not exists idx_market_signals_generated_at on market_signals(generated_at desc);

create table if not exists source_health (
  id uuid primary key,
  provider text unique not null,
  status text not null,
  latency_ms integer,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  rate_limit_remaining integer,
  circuit_json jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_source_health_status on source_health(status);

create table if not exists ingestion_runs (
  id uuid primary key,
  status text not null,
  results_json jsonb not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingestion_runs_created_at on ingestion_runs(created_at desc);

create table if not exists ai_workflows (
  id uuid primary key,
  tenant_id text not null default 'macro-fund',
  team_id text not null default 'global-macro',
  type text not null,
  status text not null,
  started_by text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  context_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_workflows_status on ai_workflows(status);
create index if not exists idx_ai_workflows_type on ai_workflows(type);

create table if not exists workflow_memory (
  id uuid primary key,
  workflow_id uuid not null,
  key text not null,
  value_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_memory_workflow on workflow_memory(workflow_id);

create table if not exists orchestration_logs (
  id uuid primary key,
  workflow_id uuid not null,
  agent_name text,
  event_type text not null,
  status text not null,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orchestration_logs_workflow on orchestration_logs(workflow_id);
create index if not exists idx_orchestration_logs_event_type on orchestration_logs(event_type);

create table if not exists ai_agent_logs (
  id uuid primary key,
  workflow_id uuid references ai_workflows(id),
  agent text not null,
  input_refs jsonb not null,
  output_json jsonb not null,
  confidence numeric,
  model_version text,
  prompt_version text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_logs_workflow on ai_agent_logs(workflow_id);
create index if not exists idx_agent_logs_agent on ai_agent_logs(agent);

create table if not exists approvals (
  id uuid primary key,
  tenant_id text not null default 'macro-fund',
  team_id text not null default 'global-macro',
  object_type text not null,
  object_id text not null,
  status text not null,
  required_role text not null,
  assigned_to text,
  decision text,
  decision_reason text,
  action_history jsonb not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists idx_approvals_status on approvals(tenant_id, team_id, status);
create index if not exists idx_approvals_assigned_to on approvals(assigned_to);
create index if not exists idx_approvals_object on approvals(object_type, object_id);

create table if not exists audit_trail (
  id uuid primary key,
  event_type text not null,
  actor_type text not null,
  actor_id text not null,
  object_type text not null,
  object_id text not null,
  payload_hash text not null,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_trail_created_at on audit_trail(created_at desc);
create index if not exists idx_audit_trail_actor on audit_trail(actor_id);
create index if not exists idx_audit_trail_object on audit_trail(object_type, object_id);

create table if not exists generated_reports (
  id uuid primary key,
  type text not null,
  status text not null,
  version integer not null,
  content_json jsonb not null,
  source_ids jsonb not null,
  approval_id uuid references approvals(id),
  created_by text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_generated_reports_type on generated_reports(type);
create index if not exists idx_generated_reports_status on generated_reports(status);

create table if not exists executive_alerts (
  id uuid primary key,
  workflow_id uuid not null,
  agent_log_id uuid,
  title text not null,
  risk_level text not null,
  key_signals jsonb not null,
  affected_positions jsonb not null,
  escalation_reason text,
  approval_required boolean not null,
  approval_id uuid,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_executive_alerts_workflow on executive_alerts(workflow_id);
create index if not exists idx_executive_alerts_status on executive_alerts(status);
create index if not exists idx_executive_alerts_risk_level on executive_alerts(risk_level);

create table if not exists system_health_logs (
  id uuid primary key,
  service text not null,
  status text not null,
  latency_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_health_service_created_at on system_health_logs(service, created_at desc);
