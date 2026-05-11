import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/store.js';
import { requirePermission } from '../middleware/auth.js';
import { paginate } from '../shared/pagination.js';
import { agentRegistry } from '../orchestration/agentRegistry.js';
import '../agents/intelligenceAgents.js';
import { auditService } from '../services/auditService.js';
import { approvalService } from '../services/approvalService.js';
import { economicCalendarService } from '../services/economicCalendarService.js';
import { demoScenarioService } from '../services/demoScenarioService.js';
import { executiveAlertService } from '../services/executiveAlertService.js';
import { ingestionService } from '../services/ingestionService.js';
import { macroDataService } from '../services/macroDataService.js';
import { marketDataService } from '../services/marketDataService.js';
import { marketIntelligenceService } from '../services/marketIntelligenceService.js';
import { newsService } from '../services/newsService.js';
import { portfolioService } from '../services/portfolioService.js';
import { qwenService } from '../services/qwenService.js';
import { reportService } from '../services/reportService.js';
import { riskEngine } from '../services/riskEngine.js';
import { systemHealthService } from '../services/systemHealthService.js';
import { workflowEngine } from '../orchestration/workflowEngine.js';
import { authService } from '../services/authService.js';
import { metricsService } from '../services/metricsService.js';

export const apiRouter = Router();

function ok(req, data) {
  return {
    requestId: req.requestId,
    data
  };
}

function okPage(req, rows, freshness = {}) {
  const page = paginate(rows, { limit: req.query.limit, cursor: req.query.cursor });
  return {
    requestId: req.requestId,
    data: page.rows,
    pageInfo: page.pageInfo,
    freshness
  };
}

apiRouter.get('/health', (req, res) => {
  res.json(ok(req, systemHealthService.snapshot()));
});

apiRouter.get('/ops/readiness', (req, res) => {
  res.json(ok(req, metricsService.readiness()));
});

apiRouter.get('/ops/metrics', requirePermission('read:health'), (req, res) => {
  res.json(ok(req, metricsService.executiveMetrics()));
});

apiRouter.get('/ops/permission-matrix', requirePermission('read:audit'), (req, res) => {
  res.json(ok(req, authService.permissionMatrix()));
});

apiRouter.post('/auth/token', (req, res) => {
  const token = authService.issueToken({
    sub: req.body.sub ?? req.body.userId ?? 'local-analyst',
    role: req.body.role ?? 'analyst',
    name: req.body.name ?? 'Local Analyst',
    tenantId: req.body.tenantId ?? 'macro-fund',
    teamId: req.body.teamId ?? 'global-macro',
    ttlSeconds: req.body.ttlSeconds ?? 3600
  });
  res.json(ok(req, { token, tokenType: 'Bearer', expiresIn: req.body.ttlSeconds ?? 3600 }));
});

apiRouter.get('/market-data', requirePermission('read:market-data'), (req, res) => {
  res.json(okPage(req, marketDataService.list({ symbol: req.query.symbol }), {
    asOf: new Date().toISOString(),
    status: marketDataService.freshness()
  }));
});

apiRouter.get('/macro', requirePermission('read:macro'), (req, res) => {
  res.json(okPage(req, macroDataService.list({ seriesId: req.query.seriesId }), {
    asOf: new Date().toISOString(),
    status: 'source_tracked'
  }));
});

apiRouter.get('/news', requirePermission('read:news'), (req, res) => {
  res.json(okPage(req, newsService.list({ clusterId: req.query.clusterId, category: req.query.category }), {
    asOf: new Date().toISOString(),
    status: 'source_tracked'
  }));
});

apiRouter.get('/economic-calendar', requirePermission('read:macro'), (req, res) => {
  res.json(okPage(req, economicCalendarService.list({
    country: req.query.country,
    importance: req.query.importance,
    category: req.query.category
  }), {
    asOf: new Date().toISOString(),
    status: 'source_tracked'
  }));
});

apiRouter.get('/signals', requirePermission('read:risk'), (req, res) => {
  res.json(okPage(req, marketIntelligenceService.list({
    type: req.query.type,
    severity: req.query.severity
  }), {
    asOf: new Date().toISOString(),
    status: 'deterministic'
  }));
});

apiRouter.get('/portfolio', requirePermission('read:portfolio'), (req, res) => {
  res.json(ok(req, portfolioService.getPortfolio()));
});

apiRouter.get('/portfolio/:portfolioId', requirePermission('read:portfolio'), (req, res) => {
  res.json(ok(req, portfolioService.getPortfolio(req.params.portfolioId)));
});

apiRouter.get('/risk', requirePermission('read:risk'), (req, res) => {
  res.json(ok(req, riskEngine.latest()));
});

apiRouter.get('/risk/:portfolioId', requirePermission('read:risk'), (req, res) => {
  res.json(ok(req, riskEngine.latest(req.params.portfolioId)));
});

apiRouter.post('/ask', requirePermission('run:qwen'), async (req, res, next) => {
  try {
    const schema = z.object({
      question: z.string().min(3),
      contextType: z.enum(['macro', 'risk', 'news', 'portfolio']).default('macro'),
      portfolioId: z.string().default('GLOBAL-MACRO-01')
    });
    const body = schema.parse(req.body);
    const result = await workflowEngine.run({
      actor: req.actor,
      workflow: 'executive_ask',
      portfolioId: body.portfolioId,
      question: body.question
    });
    res.status(202).json(ok(req, result));
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/workflows/run', requirePermission('run:workflow'), async (req, res, next) => {
  try {
    const schema = z.object({
      workflow: z
        .enum(['morning_macro_intelligence', 'morning_macro_brief', 'risk_escalation', 'executive_ask'])
        .default('morning_macro_intelligence'),
      portfolioId: z.string().default('GLOBAL-MACRO-01'),
      question: z.string().optional()
    });
    const body = schema.parse(req.body);
    const workflow = body.workflow === 'morning_macro_brief' ? 'morning_macro_intelligence' : body.workflow;
    const result = await workflowEngine.run({ actor: req.actor, workflow, portfolioId: body.portfolioId, question: body.question ?? null });
    res.status(202).json(ok(req, result));
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/workflows/:id', requirePermission('read:workflows'), (req, res) => {
  const workflow = workflowEngine.get(req.params.id);
  if (!workflow) {
    res.status(404).json({ requestId: req.requestId, error: 'NotFound', message: 'Workflow not found.' });
    return;
  }
  res.json(ok(req, workflow));
});

apiRouter.post('/workflows/:id/replay', requirePermission('run:workflow'), async (req, res, next) => {
  try {
    const replay = await workflowEngine.replay({ id: req.params.id, actor: req.actor });
    if (!replay) {
      res.status(404).json({ requestId: req.requestId, error: 'NotFound', message: 'Workflow not found.' });
      return;
    }
    res.status(202).json(ok(req, replay));
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/workflows', requirePermission('read:workflows'), (req, res) => {
  res.json(okPage(req, workflowEngine.list({ status: req.query.status, type: req.query.type })));
});

apiRouter.get('/approvals', requirePermission('read:approvals'), (req, res) => {
  res.json(ok(req, approvalService.list({ status: req.query.status })));
});

apiRouter.post('/approvals/:id', requirePermission('approve:*'), (req, res, next) => {
  try {
    const schema = z.object({
      decision: z.enum(['approved', 'rejected', 'changes_requested', 'escalated']),
      comment: z.string().default('')
    });
    const body = schema.parse(req.body);
    const approval = approvalService.decide({ id: req.params.id, actor: req.actor, decision: body.decision, comment: body.comment });
    if (!approval) {
      res.status(404).json({ requestId: req.requestId, error: 'NotFound', message: 'Approval not found.' });
      return;
    }
    const workflow = workflowEngine.continueAfterApproval({ approval, actor: req.actor });
    res.json(ok(req, { approval, workflow }));
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/audit', requirePermission('read:audit'), (req, res) => {
  res.json(ok(req, auditService.list({ limit: req.query.limit, objectId: req.query.objectId, actor: req.query.actor })));
});

apiRouter.post('/reports/generate', requirePermission('generate:reports'), async (req, res, next) => {
  try {
    const result = await reportService.generate({
      actor: req.actor,
      type: req.body.type ?? 'cio_morning_brief',
      portfolioId: req.body.portfolioId ?? 'GLOBAL-MACRO-01'
    });
    res.status(202).json(ok(req, result));
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/reports', requirePermission('read:reports'), (req, res) => {
  res.json(ok(req, reportService.list()));
});

apiRouter.post('/ingestion/run', requirePermission('run:ingestion'), async (req, res, next) => {
  try {
    const run = await ingestionService.run({ actor: req.actor, sources: req.body.sources });
    const signals = marketIntelligenceService.generateSignals();
    res.status(202).json(ok(req, { run, signals }));
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/integrations', requirePermission('read:integrations'), (req, res) => {
  res.json(ok(req, ingestionService.status()));
});

apiRouter.get('/agent-logs', requirePermission('read:agent-logs'), (req, res) => {
  res.json(okPage(req, store.agentLogs));
});

apiRouter.get('/agents', requirePermission('read:agent-logs'), (req, res) => {
  res.json(ok(req, agentRegistry.list()));
});

apiRouter.get('/executive-alerts', requirePermission('read:risk'), (req, res) => {
  res.json(okPage(req, executiveAlertService.list({
    status: req.query.status,
    riskLevel: req.query.riskLevel
  })));
});

apiRouter.post('/intelligence/explain-signals', requirePermission('run:qwen'), async (req, res, next) => {
  try {
    res.json(ok(req, await marketIntelligenceService.explainSignals({ actor: req.actor })));
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/demo/scenarios', requirePermission('read:risk'), (req, res) => {
  res.json(ok(req, demoScenarioService.list()));
});

apiRouter.get('/demo/runs', requirePermission('read:workflows'), (req, res) => {
  res.json(okPage(req, demoScenarioService.history()));
});

apiRouter.post('/demo/run', requirePermission('run:workflow'), async (req, res, next) => {
  try {
    const schema = z.object({
      scenarioId: z.enum(['inflation_surprise', 'oil_shock', 'boj_policy_shift', 'risk_off_selloff'])
    });
    const body = schema.parse(req.body);
    const result = await demoScenarioService.run({ scenarioId: body.scenarioId, actor: req.actor });
    res.status(202).json(ok(req, result));
  } catch (error) {
    next(error);
  }
});
