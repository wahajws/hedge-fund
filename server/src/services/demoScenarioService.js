import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';
import { auditService } from './auditService.js';
import { marketIntelligenceService } from './marketIntelligenceService.js';
import { workflowEngine } from '../orchestration/workflowEngine.js';

const scenarioDefinitions = {
  inflation_surprise: {
    id: 'inflation_surprise',
    title: 'US Inflation Surprise',
    subtitle: 'Hot CPI reprices rates, strengthens USD, pressures duration-sensitive risk.',
    narrative: [
      '08:30 ET: CPI prints above consensus.',
      'Treasury yields gap higher and USDJPY extends.',
      'QQQ and GLD come under pressure through real-rate sensitivity.',
      'Portfolio Risk Agent escalates QQQ concentration and pressure score.',
      'CIO Briefing Agent drafts a source-bound morning brief for approval.'
    ],
    marketMutations: [
      { symbol: 'US10Y', value: 4.86, change: 0.15, changePercent: null },
      { symbol: 'USDJPY', value: 163.45, change: null, changePercent: 1.22 },
      { symbol: 'QQQ', value: 435.1, change: null, changePercent: -2.05 },
      { symbol: 'SPY', value: 507.8, change: null, changePercent: -1.28 },
      { symbol: 'GLD', value: 187.9, change: null, changePercent: -1.85 }
    ],
    calendarEvent: {
      event: 'US CPI YoY',
      country: 'US',
      actual: 3.6,
      previous: 3.2,
      consensus: 3.3,
      importance: 'high',
      category: 'inflation'
    },
    news: [
      'Treasury yields jump after inflation surprise',
      'Dollar strengthens as Fed path reprices',
      'Growth equities weaken on real-yield pressure'
    ]
  },
  oil_shock: {
    id: 'oil_shock',
    title: 'Oil Shock',
    subtitle: 'Energy surge raises inflation concern and portfolio stress.',
    narrative: [
      'Overnight supply risk reprices crude oil higher.',
      'Inflation-sensitive assets and FX pairs react to energy shock.',
      'Long oil offsets some portfolio pressure, but inflation-risk regime worsens.',
      'Executive alert routes the scenario to CIO and risk review.'
    ],
    marketMutations: [
      { symbol: 'USO', value: 88.6, change: null, changePercent: 7.4 },
      { symbol: 'WTI', value: 95.2, change: null, changePercent: 6.9 },
      { symbol: 'GLD', value: 195.2, change: null, changePercent: 1.9 },
      { symbol: 'SPY', value: 509.2, change: null, changePercent: -1.05 },
      { symbol: 'USDJPY', value: 162.9, change: null, changePercent: 0.55 }
    ],
    calendarEvent: {
      event: 'Oil Supply Shock Monitor',
      country: 'Global',
      actual: 7.4,
      previous: 2.1,
      consensus: 2.5,
      importance: 'high',
      category: 'commodities'
    },
    news: [
      'Oil surges as supply risk premium rises',
      'Inflation concern returns to macro strategy agenda',
      'Energy-sensitive FX and rates markets reassess risk'
    ]
  },
  boj_policy_shift: {
    id: 'boj_policy_shift',
    title: 'BOJ Policy Shift',
    subtitle: 'USDJPY volatility and Asia rates repricing trigger FX risk review.',
    narrative: [
      'BOJ communication surprises markets.',
      'USDJPY volatility spikes as rate differentials are challenged.',
      'Asia risk sentiment weakens and portfolio FX exposure is flagged.',
      'Workflow pauses for human review before CIO distribution.'
    ],
    marketMutations: [
      { symbol: 'USDJPY', value: 158.2, change: null, changePercent: -2.45 },
      { symbol: 'EURUSD', value: 1.081, change: null, changePercent: 0.48 },
      { symbol: 'QQQ', value: 439.4, change: null, changePercent: -0.88 },
      { symbol: 'SPY', value: 511.0, change: null, changePercent: -0.74 }
    ],
    calendarEvent: {
      event: 'BOJ Policy Communication',
      country: 'JP',
      actual: 1,
      previous: 0,
      consensus: 0,
      importance: 'high',
      category: 'rates'
    },
    news: [
      'BOJ policy shift drives yen volatility',
      'USDJPY falls as traders reassess rate differential',
      'Asia macro desks flag FX risk escalation'
    ]
  },
  risk_off_selloff: {
    id: 'risk_off_selloff',
    title: 'Risk-Off Market Selloff',
    subtitle: 'VIX spike, equity drawdown, and liquidity concern trigger enterprise escalation.',
    narrative: [
      'Global equities sell off during overnight session.',
      'Volatility rises and liquidity screens deteriorate.',
      'Short SPY partially offsets losses, but QQQ and FX exposures require review.',
      'Audit trail captures AI workflow, approval interruption, and executive override path.'
    ],
    marketMutations: [
      { symbol: 'SPY', value: 498.2, change: null, changePercent: -3.2 },
      { symbol: 'QQQ', value: 421.7, change: null, changePercent: -4.1 },
      { symbol: 'GLD', value: 198.1, change: null, changePercent: 2.2 },
      { symbol: 'USDJPY', value: 160.1, change: null, changePercent: -1.1 }
    ],
    macroMutations: [
      { seriesId: 'VIXCLS', value: 32.8, change: 13.4 }
    ],
    calendarEvent: {
      event: 'Risk-Off Liquidity Shock',
      country: 'Global',
      actual: 32.8,
      previous: 19.4,
      consensus: 20.0,
      importance: 'high',
      category: 'risk_sentiment'
    },
    news: [
      'VIX spikes as global equities sell off',
      'Liquidity concerns emerge across risk assets',
      'Macro funds reassess exposure amid deleveraging'
    ]
  }
};

function upsertMarket(mutation) {
  const existing = store.marketData.find((row) => row.symbol === mutation.symbol || row.canonicalSymbol === mutation.symbol);
  if (existing) {
    Object.assign(existing, {
      value: mutation.value,
      change: mutation.change,
      changePercent: mutation.changePercent,
      timestamp: new Date().toISOString(),
      freshnessStatus: 'fresh',
      provider: existing.provider ?? 'Demo Scenario Engine'
    });
    return existing;
  }
  const created = {
    id: randomUUID(),
    provider: 'Demo Scenario Engine',
    symbol: mutation.symbol,
    canonicalSymbol: mutation.symbol,
    assetClass: mutation.symbol === 'US10Y' ? 'Rates' : ['USDJPY', 'EURUSD'].includes(mutation.symbol) ? 'FX' : 'ETF',
    timestamp: new Date().toISOString(),
    value: mutation.value,
    previousValue: null,
    change: mutation.change,
    changePercent: mutation.changePercent,
    currency: 'USD',
    unit: mutation.symbol === 'US10Y' ? 'percent' : 'price',
    freshnessStatus: 'fresh',
    sourceHealth: 'healthy',
    rawSourceId: `demo:${mutation.symbol}`
  };
  store.marketData.push(created);
  return created;
}

function upsertMacro(mutation) {
  const existing = store.macroIndicators.find((row) => row.seriesId === mutation.seriesId);
  if (existing) {
    Object.assign(existing, {
      value: mutation.value,
      change: mutation.change,
      date: new Date().toISOString().slice(0, 10),
      freshnessStatus: 'fresh'
    });
    return existing;
  }
  const created = {
    id: randomUUID(),
    provider: 'Demo Scenario Engine',
    seriesId: mutation.seriesId,
    name: mutation.seriesId,
    date: new Date().toISOString().slice(0, 10),
    value: mutation.value,
    previousValue: null,
    change: mutation.change,
    units: 'index',
    realtimeStart: null,
    realtimeEnd: null,
    freshnessStatus: 'fresh',
    sourceHealth: 'healthy',
    rawSourceId: `demo:${mutation.seriesId}`
  };
  store.macroIndicators.push(created);
  return created;
}

function createCalendarEvent(definition) {
  const event = {
    id: randomUUID(),
    provider: 'Demo Scenario Engine',
    event: definition.calendarEvent.event,
    country: definition.calendarEvent.country,
    date: new Date().toISOString(),
    actual: definition.calendarEvent.actual,
    previous: definition.calendarEvent.previous,
    consensus: definition.calendarEvent.consensus,
    surprise: Number((definition.calendarEvent.actual - definition.calendarEvent.consensus).toFixed(4)),
    surprisePercent: definition.calendarEvent.consensus
      ? Number((((definition.calendarEvent.actual - definition.calendarEvent.consensus) / Math.abs(definition.calendarEvent.consensus)) * 100).toFixed(2))
      : null,
    importance: definition.calendarEvent.importance,
    category: definition.calendarEvent.category,
    freshnessStatus: 'fresh',
    rawSourceId: `demo:calendar:${definition.id}:${Date.now()}`
  };
  store.economicCalendar.push(event);
  return event;
}

function createNews(definition) {
  return definition.news.map((title) => {
    const article = {
      id: randomUUID(),
      provider: 'Demo Scenario Engine',
      title,
      url: `demo://${definition.id}/${title.toLowerCase().replaceAll(' ', '-')}`,
      publishedAt: new Date().toISOString(),
      source: 'Executive Demo Feed',
      summary: title,
      clusterId: `demo-${definition.id}`,
      category: definition.calendarEvent.category,
      symbols: definition.marketMutations.map((row) => row.symbol),
      relevanceScore: 92,
      freshnessStatus: 'fresh',
      rawSourceId: `demo:news:${definition.id}:${title}`
    };
    store.newsArticles.push(article);
    return article;
  });
}

export class DemoScenarioService {
  list() {
    return Object.values(scenarioDefinitions);
  }

  get(id) {
    return scenarioDefinitions[id] ?? null;
  }

  async run({ scenarioId, actor }) {
    const definition = this.get(scenarioId);
    if (!definition) throw new Error(`Unknown demo scenario ${scenarioId}`);

    const run = {
      id: randomUUID(),
      scenarioId,
      title: definition.title,
      status: 'running',
      startedAt: new Date().toISOString(),
      timeline: []
    };
    store.demoRuns.push(run);
    publishEvent('demo.scenario.started', run);

    const marketRows = definition.marketMutations.map(upsertMarket);
    const macroRows = (definition.macroMutations ?? []).map(upsertMacro);
    const calendarEvent = createCalendarEvent(definition);
    const newsRows = createNews(definition);
    const signals = marketIntelligenceService.generateSignals();

    for (const [index, narrative] of definition.narrative.entries()) {
      const event = {
        step: index + 1,
        narrative,
        createdAt: new Date(Date.now() + index * 400).toISOString()
      };
      run.timeline.push(event);
      publishEvent('demo.timeline', { scenarioId, ...event });
    }

    auditService.record({
      eventType: 'demo.scenario.injected',
      actor,
      objectType: 'demo_scenario',
      objectId: run.id,
      payload: {
        scenarioId,
        marketRows: marketRows.map((row) => row.id),
        macroRows: macroRows.map((row) => row.id),
        calendarEvent: calendarEvent.id,
        newsRows: newsRows.map((row) => row.id),
        signalCount: signals.length
      }
    });

    const workflow = await workflowEngine.run({
      actor,
      workflow: scenarioId === 'risk_off_selloff' ? 'risk_escalation' : 'morning_macro_intelligence',
      portfolioId: 'GLOBAL-MACRO-01',
      question: `Executive demo scenario: ${definition.title}`
    });

    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    run.workflowId = workflow.workflow.id;
    run.approvalId = workflow.approval?.id ?? null;
    run.alertIds = workflow.alerts.map((alert) => alert.id);
    publishEvent('demo.scenario.completed', run);
    return {
      scenario: definition,
      run,
      injected: { marketRows, macroRows, calendarEvent, newsRows, signals },
      workflow
    };
  }

  history() {
    return [...store.demoRuns].reverse();
  }
}

export const demoScenarioService = new DemoScenarioService();

