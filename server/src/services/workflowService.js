import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';
import { agents } from './agents.js';
import { approvalService } from './approvalService.js';
import { auditService } from './auditService.js';

export class WorkflowService {
  async runMorningMacroBrief({ actor, portfolioId = 'GLOBAL-MACRO-01' }) {
    const workflow = {
      id: randomUUID(),
      type: 'morning_macro_brief',
      status: 'running',
      startedBy: actor.id,
      startedAt: new Date().toISOString(),
      completedAt: null,
      contextJson: { portfolioId }
    };
    store.workflows.push(workflow);
    publishEvent('agent_run.started', workflow);
    auditService.record({ eventType: 'workflow.started', actor, objectType: 'workflow', objectId: workflow.id, payload: workflow });

    const dataLog = await agents.dataIngestion.run({ workflowId: workflow.id, actor });
    const newsLog = await agents.newsIntelligence.run({ workflowId: workflow.id, actor });
    const macroLog = await agents.macroRegime.run({ workflowId: workflow.id, actor });
    const riskLog = await agents.portfolioRisk.run({ workflowId: workflow.id, actor, portfolioId });
    const briefLog = await agents.cioBriefing.run({ workflowId: workflow.id, actor, riskLog, macroLog, newsLog });
    const complianceLog = await agents.complianceGuardrail.run({
      workflowId: workflow.id,
      actor,
      draft: {
        content: briefLog.outputJson.report.contentJson.executiveSummary,
        sourceIds: briefLog.outputJson.report.sourceIds
      }
    });

    const approval = approvalService.create({
      actor,
      objectType: 'generated_report',
      objectId: briefLog.outputJson.report.id,
      title: briefLog.outputJson.report.contentJson.title,
      riskLevel: riskLog.outputJson.risk.severity,
      payload: {
        workflowId: workflow.id,
        reportId: briefLog.outputJson.report.id,
        riskSnapshotId: riskLog.outputJson.risk.id,
        complianceStatus: complianceLog.outputJson.status
      }
    });

    workflow.status = 'waiting_for_human';
    workflow.completedAt = new Date().toISOString();
    workflow.contextJson = {
      ...workflow.contextJson,
      dataLogId: dataLog.id,
      newsLogId: newsLog.id,
      macroLogId: macroLog.id,
      riskLogId: riskLog.id,
      complianceLogId: complianceLog.id,
      briefLogId: briefLog.id,
      approvalId: approval.id
    };
    publishEvent('agent_run.completed', workflow);
    auditService.record({ eventType: 'workflow.waiting_for_human', actor, objectType: 'workflow', objectId: workflow.id, payload: workflow.contextJson });

    return {
      workflow,
      steps: [dataLog, newsLog, macroLog, riskLog, complianceLog, briefLog],
      approval
    };
  }

  list({ status, type } = {}) {
    return store.workflows.filter((workflow) => {
      if (status && workflow.status !== status) return false;
      if (type && workflow.type !== type) return false;
      return true;
    });
  }
}

export const workflowService = new WorkflowService();

