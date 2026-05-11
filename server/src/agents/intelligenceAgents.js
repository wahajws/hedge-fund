import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { qwenService } from '../services/qwenService.js';
import { marketIntelligenceService } from '../services/marketIntelligenceService.js';
import { ingestionService } from '../services/ingestionService.js';
import { riskEngine } from '../services/riskEngine.js';
import { approvalService } from '../services/approvalService.js';
import { auditService } from '../services/auditService.js';
import { orchestrationLogger } from '../orchestration/orchestrationLogger.js';
import { agentRegistry } from '../orchestration/agentRegistry.js';

function sourceBundle(context) {
  return [
    ...(context.market ?? []),
    ...(context.macro ?? []),
    ...(context.news ?? []),
    ...(context.calendar ?? []),
    ...(context.signals ?? []),
    ...(context.portfolio?.positions ?? [])
  ];
}

function confidence({ output, context, deterministicWeight = 0.35 }) {
  const dataCompleteness = [
    context.market?.length,
    context.macro?.length,
    context.news?.length,
    context.signals?.length,
    context.portfolio?.positions?.length
  ].filter(Boolean).length / 5;
  const sourceCoverage = Math.min((output.sourcesUsed?.length ?? 0) / 8, 1);
  return Number(Math.min(0.98, deterministicWeight + output.confidence * 0.4 + dataCompleteness * 0.15 + sourceCoverage * 0.1).toFixed(2));
}

export class InstitutionalAgent {
  constructor({ name, promptTemplate, responsibilities, approvalRule, escalationRule, deterministicStep = null }) {
    this.name = name;
    this.promptTemplate = promptTemplate;
    this.responsibilities = responsibilities;
    this.approvalRule = approvalRule;
    this.escalationRule = escalationRule;
    this.deterministicStep = deterministicStep;
    this.maxRetries = 1;
  }

  describe() {
    return {
      name: this.name,
      promptTemplate: this.promptTemplate,
      responsibilities: this.responsibilities,
      approvalRequired: 'conditional',
      failureHandling: 'retry once, then mark workflow degraded and escalate to human review',
      auditRequirements: ['input context hash', 'prompt version', 'model version', 'sources used', 'confidence', 'escalation state']
    };
  }

  async run({ workflowId, actor, context }) {
    orchestrationLogger.log({ workflowId, agentName: this.name, eventType: 'agent.started', status: 'running', actor });
    let deterministicOutput = {};
    if (this.deterministicStep) {
      deterministicOutput = await this.deterministicStep({ actor, context, workflowId });
    }

    let result;
    let failure = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        result = await qwenService.runAgentPrompt({
          actor,
          templateName: this.promptTemplate,
          context: { ...context, deterministicOutput },
          sources: sourceBundle(context),
          riskLevelFallback: context.risk?.severity ?? 'watch'
        });
        failure = null;
        break;
      } catch (error) {
        failure = error;
        orchestrationLogger.log({ workflowId, agentName: this.name, eventType: 'agent.retry', status: 'warning', actor, payload: { attempt, error: error.message } });
      }
    }

    if (failure) {
      const failedLog = this.persistLog({
        workflowId,
        result: null,
        deterministicOutput,
        confidenceScore: 0,
        approvalRequired: true,
        escalationRequired: true,
        status: 'failed',
        error: failure.message
      });
      orchestrationLogger.log({ workflowId, agentName: this.name, eventType: 'agent.failed', status: 'failed', actor, payload: failedLog });
      return failedLog;
    }

    const output = {
      ...result.output,
      deterministicOutput
    };
    const confidenceScore = confidence({ output, context });
    const approvalRequired = this.approvalRule?.({ output, context, deterministicOutput }) ?? output.approvalRequired;
    const escalationRequired = this.escalationRule?.({ output, context, deterministicOutput }) ?? ['high', 'critical'].includes(output.riskLevel);
    const log = this.persistLog({
      workflowId,
      result: {
        invocationId: result.invocationId,
        model: result.model,
        promptVersion: result.promptVersion,
        output
      },
      deterministicOutput,
      confidenceScore,
      approvalRequired,
      escalationRequired,
      status: 'completed'
    });

    auditService.record({
      eventType: 'agent.intelligence.completed',
      actor: { id: this.name, role: 'agent', type: 'agent' },
      objectType: 'workflow',
      objectId: workflowId,
      payload: {
        agent: this.name,
        confidence: confidenceScore,
        approvalRequired,
        escalationRequired,
        promptVersion: result.promptVersion,
        model: result.model
      }
    });
    orchestrationLogger.log({ workflowId, agentName: this.name, eventType: 'agent.completed', status: 'completed', actor, payload: { confidence: confidenceScore, approvalRequired, escalationRequired } });
    return log;
  }

  persistLog({ workflowId, result, deterministicOutput, confidenceScore, approvalRequired, escalationRequired, status, error = null }) {
    const log = {
      id: randomUUID(),
      workflowId,
      agent: this.name,
      inputRefs: result?.output?.sourcesUsed ?? [],
      outputJson: result?.output ?? { error },
      deterministicOutput,
      confidence: confidenceScore,
      modelVersion: result?.model ?? null,
      promptVersion: result?.promptVersion ?? this.promptTemplate,
      approvalRequired,
      escalationRequired,
      status,
      createdAt: new Date().toISOString()
    };
    store.agentLogs.push(log);
    return log;
  }
}

const approvalIfHigh = ({ output, context }) => ['high', 'critical'].includes(output.riskLevel) || ['high', 'critical'].includes(context.risk?.severity);
const escalationIfCritical = ({ output, context }) => output.riskLevel === 'critical' || context.risk?.severity === 'critical';

export function registerIntelligenceAgents() {
  if (agentRegistry.list().length) return agentRegistry;

  agentRegistry.register(new InstitutionalAgent({
    name: 'Data Intelligence Agent',
    promptTemplate: 'market_shock_explanation_v2',
    responsibilities: ['ingestion quality synthesis', 'freshness interpretation', 'source health interpretation'],
    deterministicStep: async ({ actor }) => ingestionService.status(),
    approvalRule: () => false,
    escalationRule: ({ deterministicOutput }) => deterministicOutput.health?.some((row) => row.status === 'failed')
  }));

  agentRegistry.register(new InstitutionalAgent({
    name: 'News Intelligence Agent',
    promptTemplate: 'news_summarization_v2',
    responsibilities: ['news summarization', 'theme extraction', 'portfolio theme mapping'],
    approvalRule: ({ output }) => output.riskLevel === 'high' || output.riskLevel === 'critical',
    escalationRule: ({ output }) => output.escalationReason !== null
  }));

  agentRegistry.register(new InstitutionalAgent({
    name: 'Macro Regime Agent',
    promptTemplate: 'macro_regime_analysis_v2',
    responsibilities: ['macro regime explanation', 'inflation/rates/growth interpretation', 'assumption reporting'],
    deterministicStep: async () => ({ regime: marketIntelligenceService.classifyMarketRegime() }),
    approvalRule: approvalIfHigh,
    escalationRule: escalationIfCritical
  }));

  agentRegistry.register(new InstitutionalAgent({
    name: 'Portfolio Risk Intelligence Agent',
    promptTemplate: 'portfolio_impact_explanation_v2',
    responsibilities: ['portfolio impact explanation', 'affected exposure mapping', 'risk pressure interpretation'],
    deterministicStep: async ({ context }) => riskEngine.latest(context.portfolioId),
    approvalRule: approvalIfHigh,
    escalationRule: escalationIfCritical
  }));

  agentRegistry.register(new InstitutionalAgent({
    name: 'Compliance Guardrail Agent',
    promptTemplate: 'compliance_explanation_v2',
    responsibilities: ['unsupported-claim review', 'source coverage check', 'approval gate reasoning'],
    deterministicStep: async ({ context }) => ({
      missingSources: !context.lineage?.length,
      highRiskWithoutApproval: ['high', 'critical'].includes(context.risk?.severity),
      policyFindings: []
    }),
    approvalRule: ({ deterministicOutput }) => deterministicOutput.highRiskWithoutApproval,
    escalationRule: ({ deterministicOutput }) => deterministicOutput.missingSources
  }));

  agentRegistry.register(new InstitutionalAgent({
    name: 'CIO Briefing Agent',
    promptTemplate: 'morning_cio_brief_v2',
    responsibilities: ['CIO briefing synthesis', 'recommendation drafting', 'source-bound executive summary'],
    approvalRule: () => true,
    escalationRule: approvalIfHigh
  }));

  agentRegistry.register(new InstitutionalAgent({
    name: 'Executive Alert Agent',
    promptTemplate: 'executive_alerts_v2',
    responsibilities: ['executive alert generation', 'risk escalation message', 'approval routing'],
    deterministicStep: async ({ context }) => ({
      alertCandidates: context.signals?.filter((signal) => ['high', 'critical'].includes(signal.severity)) ?? []
    }),
    approvalRule: approvalIfHigh,
    escalationRule: ({ deterministicOutput }) => deterministicOutput.alertCandidates.length > 0
  }));

  agentRegistry.register(new InstitutionalAgent({
    name: 'Workflow Coordination Agent',
    promptTemplate: 'workflow_coordination_v2',
    responsibilities: ['workflow next-step decision', 'approval interruption', 'recovery recommendation'],
    approvalRule: ({ output }) => output.approvalRequired,
    escalationRule: ({ output }) => output.escalationReason !== null
  }));

  return agentRegistry;
}

registerIntelligenceAgents();

