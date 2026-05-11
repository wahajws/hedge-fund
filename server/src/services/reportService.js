import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { marketDataService } from './marketDataService.js';
import { macroDataService } from './macroDataService.js';
import { qwenService } from './qwenService.js';
import { riskEngine } from './riskEngine.js';
import { approvalService } from './approvalService.js';
import { auditService } from './auditService.js';
import { newsService } from './newsService.js';
import { economicCalendarService } from './economicCalendarService.js';
import { marketIntelligenceService } from './marketIntelligenceService.js';

export class ReportService {
  async generate({ actor, type = 'cio_morning_brief', portfolioId = 'GLOBAL-MACRO-01' }) {
    const risk = riskEngine.latest(portfolioId);
    const macro = macroDataService.regimeInputs();
    const market = marketDataService.snapshot();
    const news = newsService.list();
    const calendar = economicCalendarService.list();
    const signals = marketIntelligenceService.list();
    const qwen = await qwenService.generateMorningBrief({
      actor,
      market: market.data,
      macro: macroDataService.list(),
      news,
      calendar,
      signals,
      risk
    });
    const report = {
      id: randomUUID(),
      type,
      status: 'draft',
      version: 1,
      contentJson: {
        title: 'CIO Morning Brief',
        executiveSummary: qwen.summary,
        reasoning: qwen.reasoning,
        recommendation: qwen.recommendation
      },
      sourceIds: [...market.data, ...macroDataService.list()].map((source) => source.id),
      createdBy: actor.id,
      createdAt: new Date().toISOString()
    };
    store.generatedReports.push(report);
    const approval = approvalService.create({
      actor,
      objectType: 'generated_report',
      objectId: report.id,
      title: report.contentJson.title,
      riskLevel: risk.severity,
      payload: { reportId: report.id, portfolioId }
    });
    auditService.record({ eventType: 'report.generated', actor, objectType: 'generated_report', objectId: report.id, payload: { approvalId: approval.id, type } });
    return { report, approval };
  }

  list() {
    return store.generatedReports;
  }
}

export const reportService = new ReportService();
