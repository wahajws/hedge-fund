import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';
import { contextManager } from './contextManager.js';
import { orchestrationLogger } from './orchestrationLogger.js';
import { agentRegistry } from './agentRegistry.js';
import '../agents/intelligenceAgents.js';
import { approvalService } from '../services/approvalService.js';
import { executiveAlertService } from '../services/executiveAlertService.js';
import { ingestionService } from '../services/ingestionService.js';
import { marketIntelligenceService } from '../services/marketIntelligenceService.js';

const workflowPlans = {
  morning_macro_intelligence: [
    'Data Intelligence Agent',
    'News Intelligence Agent',
    'Macro Regime Agent',
    'Portfolio Risk Intelligence Agent',
    'Compliance Guardrail Agent',
    'CIO Briefing Agent',
    'Workflow Coordination Agent'
  ],
  risk_escalation: [
    'Data Intelligence Agent',
    'Macro Regime Agent',
    'Portfolio Risk Intelligence Agent',
    'Executive Alert Agent',
    'Compliance Guardrail Agent',
    'Workflow Coordination Agent'
  ],
  executive_ask: [
    'Data Intelligence Agent',
    'Macro Regime Agent',
    'Portfolio Risk Intelligence Agent',
    'Workflow Coordination Agent'
  ]
};

function terminalRisk(logs) {
  const levels = ['normal', 'watch', 'elevated', 'high', 'critical'];
  return logs.reduce((max, log) => {
    const level = log.outputJson?.riskLevel ?? 'watch';
    return levels.indexOf(level) > levels.indexOf(max) ? level : max;
  }, 'normal');
}

export class WorkflowEngine {
  async run({ actor, workflow = 'morning_macro_intelligence', portfolioId = 'GLOBAL-MACRO-01', question = null, replayOf = null }) {
    if (!workflowPlans[workflow]) throw new Error(`Unsupported workflow ${workflow}`);

    const execution = {
      id: randomUUID(),
      type: workflow,
      status: 'running',
      state: 'initialized',
      startedBy: actor.id,
      startedAt: new Date().toISOString(),
      completedAt: null,
      replayOf,
      contextJson: { portfolioId, question },
      currentStep: null,
      stepResults: [],
      approvalId: null,
      diagnostics: []
    };
    store.workflowExecutions.push(execution);
    store.workflows.push(execution);
    publishEvent('workflow.status', execution);
    orchestrationLogger.log({ workflowId: execution.id, eventType: 'workflow.started', status: 'running', actor, payload: { workflow, portfolioId, replayOf } });

    if (workflow === 'morning_macro_intelligence') {
      await ingestionService.run({ actor, sources: ['fred', 'alpha_vantage', 'fmp'] });
      marketIntelligenceService.generateSignals();
    }

    let context = contextManager.buildBaseContext({ portfolioId, question });
    contextManager.remember({ workflowId: execution.id, key: 'initial_context_lineage', value: context.lineage });

    const results = [];
    for (const agentName of workflowPlans[workflow]) {
      execution.currentStep = agentName;
      execution.state = `running:${agentName}`;
      orchestrationLogger.log({ workflowId: execution.id, agentName, eventType: 'workflow.step.started', status: 'running', actor });

      const agent = agentRegistry.get(agentName);
      const agentLog = await agent.run({ workflowId: execution.id, actor, context });
      results.push(agentLog);
      execution.stepResults.push(agentLog.id);
      context = {
        ...context,
        agentOutputs: results.map((log) => ({ agent: log.agent, output: log.outputJson, confidence: log.confidence }))
      };
      contextManager.remember({ workflowId: execution.id, key: `agent:${agentName}`, value: agentLog.outputJson });

      if (agentLog.status === 'failed') {
        execution.status = 'degraded';
        execution.state = 'human_review_required';
        execution.diagnostics.push({ agentName, reason: 'agent_failed' });
        break;
      }

      if (agentName === 'Executive Alert Agent' && agentLog.escalationRequired) {
        const approval = this.createApprovalForLog({ actor, execution, agentLog });
        execution.approvalId = approval.id;
        executiveAlertService.createFromAgent({ actor, workflowId: execution.id, agentLog, approvalId: approval.id });
      }
    }

    const approvalCandidate = [...results].reverse().find((log) => log.approvalRequired);
    if (approvalCandidate && !execution.approvalId) {
      const approval = this.createApprovalForLog({ actor, execution, agentLog: approvalCandidate });
      execution.approvalId = approval.id;
      if (approvalCandidate.escalationRequired || ['high', 'critical'].includes(approvalCandidate.outputJson?.riskLevel)) {
        executiveAlertService.createFromAgent({ actor, workflowId: execution.id, agentLog: approvalCandidate, approvalId: approval.id });
      }
    }

    execution.status = execution.approvalId ? 'waiting_for_human' : execution.status === 'degraded' ? 'degraded' : 'completed';
    execution.state = execution.approvalId ? 'approval_interruption' : execution.status;
    execution.completedAt = new Date().toISOString();
    execution.contextJson = {
      ...execution.contextJson,
      terminalRisk: terminalRisk(results),
      agentLogIds: results.map((log) => log.id)
    };
    orchestrationLogger.log({ workflowId: execution.id, eventType: 'workflow.completed', status: execution.status, actor, payload: execution.contextJson });
    publishEvent('workflow.completion', execution);

    return {
      workflow: execution,
      agents: results,
      approval: execution.approvalId ? store.approvals.find((approval) => approval.id === execution.approvalId) : null,
      alerts: store.executiveAlerts.filter((alert) => alert.workflowId === execution.id)
    };
  }

  createApprovalForLog({ actor, execution, agentLog }) {
    return approvalService.create({
      actor,
      objectType: 'ai_workflow_recommendation',
      objectId: execution.id,
      title: `${execution.type}: ${agentLog.agent}`,
      riskLevel: agentLog.outputJson?.riskLevel ?? execution.contextJson?.terminalRisk ?? 'watch',
      payload: {
        workflowId: execution.id,
        agentLogId: agentLog.id,
        output: agentLog.outputJson
      }
    });
  }

  get(id) {
    const workflow = store.workflowExecutions.find((row) => row.id === id) ?? store.workflows.find((row) => row.id === id);
    if (!workflow) return null;
    return {
      workflow,
      logs: store.agentLogs.filter((log) => log.workflowId === id),
      orchestration: store.orchestrationLogs.filter((log) => log.workflowId === id),
      memory: contextManager.getMemory(id),
      approvals: store.approvals.filter((approval) => approval.payload?.workflowId === id || approval.objectId === id),
      alerts: store.executiveAlerts.filter((alert) => alert.workflowId === id)
    };
  }

  list({ status, type } = {}) {
    return store.workflowExecutions
      .filter((workflow) => !status || workflow.status === status)
      .filter((workflow) => !type || workflow.type === type)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async replay({ id, actor }) {
    const previous = this.get(id);
    if (!previous) return null;
    return this.run({
      actor,
      workflow: previous.workflow.type,
      portfolioId: previous.workflow.contextJson?.portfolioId ?? 'GLOBAL-MACRO-01',
      question: previous.workflow.contextJson?.question ?? null,
      replayOf: id
    });
  }

  continueAfterApproval({ approval, actor }) {
    const workflowId = approval.payload?.workflowId ?? approval.objectId;
    const workflow = store.workflowExecutions.find((row) => row.id === workflowId);
    if (!workflow) return null;
    workflow.status = approval.status === 'approved' ? 'approved_completed' : approval.status;
    workflow.state = `approval_${approval.status}`;
    workflow.completedAt = new Date().toISOString();
    orchestrationLogger.log({ workflowId, eventType: 'workflow.approval_decision_applied', status: workflow.status, actor, payload: { approvalId: approval.id, decision: approval.status } });
    publishEvent('approval.updates', { workflow, approval });
    return workflow;
  }
}

export const workflowEngine = new WorkflowEngine();

