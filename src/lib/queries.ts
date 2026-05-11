import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export function useCoreData() {
  return {
    health: useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 10000 }),
    market: useQuery({ queryKey: ['market'], queryFn: api.marketData }),
    macro: useQuery({ queryKey: ['macro'], queryFn: api.macro }),
    news: useQuery({ queryKey: ['news'], queryFn: api.news }),
    calendar: useQuery({ queryKey: ['calendar'], queryFn: api.calendar }),
    portfolio: useQuery({ queryKey: ['portfolio'], queryFn: api.portfolio }),
    risk: useQuery({ queryKey: ['risk'], queryFn: api.risk, refetchInterval: 15000 }),
    signals: useQuery({ queryKey: ['signals'], queryFn: api.signals, refetchInterval: 15000 }),
    approvals: useQuery({ queryKey: ['approvals'], queryFn: api.approvals, refetchInterval: 15000 }),
    workflows: useQuery({ queryKey: ['workflows'], queryFn: api.workflows, refetchInterval: 15000 }),
    alerts: useQuery({ queryKey: ['alerts'], queryFn: api.alerts, refetchInterval: 15000 })
  };
}

export function useOperationsData() {
  return {
    audit: useQuery({ queryKey: ['audit'], queryFn: api.audit, refetchInterval: 15000 }),
    agentLogs: useQuery({ queryKey: ['agentLogs'], queryFn: api.agentLogs, refetchInterval: 15000 }),
    integrations: useQuery({ queryKey: ['integrations'], queryFn: api.integrations, refetchInterval: 20000 }),
    reports: useQuery({ queryKey: ['reports'], queryFn: api.reports, refetchInterval: 20000 })
  };
}

export function useActions() {
  const client = useQueryClient();
  const invalidate = () => {
    void client.invalidateQueries();
  };
  return {
    ask: useMutation({ mutationFn: api.ask, onSuccess: invalidate }),
    runWorkflow: useMutation({ mutationFn: ({ workflow, question }: { workflow: string; question?: string }) => api.runWorkflow(workflow, question), onSuccess: invalidate }),
    decideApproval: useMutation({ mutationFn: ({ id, decision, comment }: { id: string; decision: string; comment: string }) => api.decideApproval(id, decision, comment), onSuccess: invalidate }),
    generateReport: useMutation({ mutationFn: api.generateReport, onSuccess: invalidate }),
    runIngestion: useMutation({ mutationFn: api.runIngestion, onSuccess: invalidate }),
    runDemo: useMutation({ mutationFn: api.runDemo, onSuccess: invalidate })
  };
}

export function useDemoData() {
  return {
    scenarios: useQuery({ queryKey: ['demoScenarios'], queryFn: api.demoScenarios }),
    runs: useQuery({ queryKey: ['demoRuns'], queryFn: api.demoRuns, refetchInterval: 10000 })
  };
}
