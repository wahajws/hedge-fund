import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';
import { auditService } from './auditService.js';
import { marketDataService } from './marketDataService.js';
import { macroDataService } from './macroDataService.js';
import { newsService } from './newsService.js';
import { portfolioService } from './portfolioService.js';
import { qwenService } from './qwenService.js';
import { riskEngine } from './riskEngine.js';

function logAgent({ workflowId, agent, inputRefs, outputJson, confidence, modelVersion = null, promptVersion = null }) {
  const log = {
    id: randomUUID(),
    workflowId,
    agent,
    inputRefs,
    outputJson,
    confidence,
    modelVersion,
    promptVersion,
    createdAt: new Date().toISOString()
  };
  store.agentLogs.push(log);
  publishEvent('agent_run.completed', log);
  return log;
}

export class DataIngestionAgent {
  async run({ workflowId, actor }) {
    const output = {
      marketRows: marketDataService.list().length,
      macroRows: macroDataService.list().length,
      newsRows: newsService.list().length,
      freshness: marketDataService.freshness(),
      approvalRequired: false
    };
    auditService.record({ eventType: 'agent.data_ingestion.completed', actor: { id: 'data-ingestion-agent', type: 'agent' }, objectType: 'workflow', objectId: workflowId, payload: output });
    return logAgent({ workflowId, agent: 'Data Ingestion Agent', inputRefs: ['market_data', 'macro_indicators', 'news_articles'], outputJson: output, confidence: 0.96 });
  }
}

export class NewsIntelligenceAgent {
  async run({ workflowId, actor }) {
    const clusters = newsService.clusters();
    const qwen = await qwenService.generateStructured({
      actor,
      task: 'news intelligence classification',
      promptVersion: 'news_intelligence_v1',
      schemaName: 'NewsIntelligenceOutput',
      facts: { clusters },
      sources: newsService.list(),
      instructions: 'Summarize news clusters and classify market relevance using only supplied article facts.'
    });
    const output = {
      clusters,
      summary: qwen.summary,
      reasoning: qwen.reasoning,
      confidence: qwen.confidence,
      approvalRequired: true
    };
    return logAgent({ workflowId, agent: 'News Intelligence Agent', inputRefs: clusters.map((c) => c.clusterId), outputJson: output, confidence: qwen.confidence, modelVersion: qwen.model, promptVersion: qwen.promptVersion });
  }
}

export class MacroRegimeAgent {
  async run({ workflowId, actor }) {
    const macro = macroDataService.regimeInputs();
    const deterministicRegime = macro.inflationSignal === 'above_target' && macro.ratesSignal === 'restrictive'
      ? 'higher_real_yield_pressure'
      : 'macro_watch';
    const qwen = await qwenService.generateStructured({
      actor,
      task: 'macro regime interpretation',
      promptVersion: 'macro_regime_v1',
      schemaName: 'MacroRegimeOutput',
      facts: { macro, deterministicRegime },
      sources: macroDataService.list(),
      instructions: 'Explain macro regime classification without creating any new market numbers.'
    });
    const output = {
      regime: deterministicRegime,
      macro,
      summary: qwen.summary,
      reasoning: qwen.reasoning,
      confidence: 0.82,
      approvalRequired: true
    };
    return logAgent({ workflowId, agent: 'Macro Regime Agent', inputRefs: macroDataService.list().map((row) => row.seriesId), outputJson: output, confidence: 0.82, modelVersion: qwen.model, promptVersion: qwen.promptVersion });
  }
}

export class PortfolioRiskAgent {
  async run({ workflowId, actor, portfolioId }) {
    const risk = riskEngine.calculate(portfolioId);
    const portfolio = portfolioService.getPortfolio(portfolioId);
    const qwen = await qwenService.generateStructured({
      actor,
      task: 'portfolio risk explanation',
      promptVersion: 'portfolio_risk_v1',
      schemaName: 'PortfolioRiskOutput',
      facts: { risk, portfolio },
      sources: [...portfolio.positions, ...marketDataService.list()],
      instructions: 'Explain deterministic risk output. Do not calculate new values.'
    });
    const output = {
      risk,
      explanation: qwen.summary,
      reasoning: qwen.reasoning,
      confidence: 0.78,
      approvalRequired: ['high', 'critical'].includes(risk.severity)
    };
    return logAgent({ workflowId, agent: 'Portfolio Risk Agent', inputRefs: [risk.id, portfolioId], outputJson: output, confidence: 0.78, modelVersion: qwen.model, promptVersion: qwen.promptVersion });
  }
}

export class ComplianceGuardrailAgent {
  async run({ workflowId, actor, draft }) {
    const deterministicFindings = [];
    if (!draft?.sourceIds?.length) deterministicFindings.push({ code: 'MISSING_SOURCES', severity: 'high' });
    if (String(draft?.content ?? '').toLowerCase().includes('guaranteed')) deterministicFindings.push({ code: 'PROHIBITED_CERTAINTY_LANGUAGE', severity: 'critical' });
    const qwen = await qwenService.generateStructured({
      actor,
      task: 'compliance language review',
      promptVersion: 'compliance_guardrail_v1',
      schemaName: 'ComplianceGuardrailOutput',
      facts: { deterministicFindings, draft },
      sources: draft?.sourceIds ?? [],
      instructions: 'Review wording ambiguity only. Deterministic policy findings remain authoritative.'
    });
    const output = {
      status: deterministicFindings.some((finding) => finding.severity === 'critical') ? 'blocked' : deterministicFindings.length ? 'escalate' : 'pass',
      findings: deterministicFindings,
      qwenReview: qwen.summary,
      confidence: 0.86,
      approvalRequired: deterministicFindings.length > 0
    };
    return logAgent({ workflowId, agent: 'Compliance Guardrail Agent', inputRefs: draft?.sourceIds ?? [], outputJson: output, confidence: 0.86, modelVersion: qwen.model, promptVersion: qwen.promptVersion });
  }
}

export class CIOBriefingAgent {
  async run({ workflowId, actor, riskLog, macroLog, newsLog }) {
    const facts = {
      risk: riskLog.outputJson.risk,
      macro: macroLog.outputJson.macro,
      regime: macroLog.outputJson.regime,
      newsClusters: newsLog.outputJson.clusters
    };
    const qwen = await qwenService.generateStructured({
      actor,
      task: 'cio briefing generation',
      promptVersion: 'cio_briefing_v1',
      schemaName: 'CIOBriefingOutput',
      facts,
      sources: [...marketDataService.list(), ...macroDataService.list(), ...newsService.list()],
      instructions: 'Draft a concise CIO morning brief using only supplied facts and source IDs.'
    });
    const report = {
      id: randomUUID(),
      type: 'cio_morning_brief',
      status: 'draft',
      version: 1,
      contentJson: {
        title: 'CIO Morning Brief: Higher Real Yield Pressure',
        executiveSummary: qwen.summary,
        reasoning: qwen.reasoning,
        recommendation: qwen.recommendation
      },
      sourceIds: [...marketDataService.list(), ...macroDataService.list(), ...newsService.list()].map((source) => source.id),
      createdBy: actor.id,
      createdAt: new Date().toISOString()
    };
    store.generatedReports.push(report);
    return logAgent({ workflowId, agent: 'CIO Briefing Agent', inputRefs: [riskLog.id, macroLog.id, newsLog.id], outputJson: { report, confidence: qwen.confidence, approvalRequired: true }, confidence: qwen.confidence, modelVersion: qwen.model, promptVersion: qwen.promptVersion });
  }
}

export const agents = {
  dataIngestion: new DataIngestionAgent(),
  newsIntelligence: new NewsIntelligenceAgent(),
  macroRegime: new MacroRegimeAgent(),
  portfolioRisk: new PortfolioRiskAgent(),
  complianceGuardrail: new ComplianceGuardrailAgent(),
  cioBriefing: new CIOBriefingAgent()
};

