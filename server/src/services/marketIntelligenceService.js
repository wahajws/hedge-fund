import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';
import { validateOrThrow, MarketSignalSchema } from '../shared/normalizedSchemas.js';
import { qwenService } from './qwenService.js';

function severity(level) {
  if (level >= 90) return 'critical';
  if (level >= 70) return 'high';
  if (level >= 50) return 'elevated';
  if (level >= 25) return 'watch';
  return 'normal';
}

function latestMarket(symbol) {
  return [...store.marketData].reverse().find((row) => row.symbol === symbol || row.canonicalSymbol === symbol);
}

function latestMacro(seriesId) {
  return [...store.macroIndicators].reverse().find((row) => row.seriesId === seriesId);
}

function hasNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export class MarketIntelligenceService {
  generateSignals() {
    const signals = [];
    const us10y = latestMacro('DGS10') ?? latestMarket('US10Y');
    const vix = latestMacro('VIXCLS');
    const dollar = latestMacro('DTWEXBGS');
    const cpiEvent = [...store.economicCalendar].reverse().find((event) => event.category === 'inflation' && event.surprise !== null);
    const spy = latestMarket('SPY');
    const qqq = latestMarket('QQQ');
    const uso = latestMarket('USO') ?? latestMarket('WTI');
    const usdjpy = latestMarket('USDJPY');

    if (hasNumber(us10y?.change) && Math.abs(us10y.change) >= 0.05) {
      signals.push(this.signal({
        type: 'yield_spike',
        level: Math.abs(us10y.change) >= 0.12 ? 78 : 58,
        title: '10Y Treasury yield spike detected',
        description: `DGS10 changed by ${us10y.change}.`,
        symbol: 'DGS10',
        sourceIds: [us10y.id],
        data: { value: us10y.value, change: us10y.change }
      }));
    }

    if (cpiEvent && Math.abs(cpiEvent.surprisePercent ?? 0) >= 1) {
      signals.push(this.signal({
        type: 'cpi_surprise',
        level: Math.abs(cpiEvent.surprisePercent) >= 3 ? 78 : 55,
        title: 'Inflation surprise detected',
        description: `${cpiEvent.event} actual deviated from consensus.`,
        symbol: null,
        sourceIds: [cpiEvent.id],
        data: {
          actual: cpiEvent.actual,
          consensus: cpiEvent.consensus,
          surprise: cpiEvent.surprise,
          surprisePercent: cpiEvent.surprisePercent
        }
      }));
    }

    for (const row of [spy, qqq].filter(Boolean)) {
      if ((row.changePercent ?? 0) <= -1) {
        signals.push(this.signal({
          type: 'equity_selloff',
          level: Math.abs(row.changePercent) >= 2 ? 76 : 54,
          title: `${row.symbol} equity selloff detected`,
          description: `${row.symbol} changePercent is ${row.changePercent}.`,
          symbol: row.symbol,
          sourceIds: [row.id],
          data: { value: row.value, changePercent: row.changePercent }
        }));
      }
    }

    if (uso && (uso.changePercent ?? 0) >= 2) {
      signals.push(this.signal({
        type: 'commodity_shock',
        level: uso.changePercent >= 4 ? 74 : 52,
        title: 'Oil proxy surge detected',
        description: `${uso.symbol} changePercent is ${uso.changePercent}.`,
        symbol: uso.symbol,
        sourceIds: [uso.id],
        data: { value: uso.value, changePercent: uso.changePercent }
      }));
    }

    if (usdjpy && Math.abs(usdjpy.changePercent ?? 0) >= 0.75) {
      signals.push(this.signal({
        type: 'fx_volatility',
        level: Math.abs(usdjpy.changePercent) >= 1.5 ? 72 : 50,
        title: 'USDJPY volatility detected',
        description: `USDJPY changePercent is ${usdjpy.changePercent}.`,
        symbol: 'USDJPY',
        sourceIds: [usdjpy.id],
        data: { value: usdjpy.value, changePercent: usdjpy.changePercent }
      }));
    }

    if (vix && vix.value >= 25) {
      signals.push(this.signal({
        type: 'risk_off',
        level: vix.value >= 32 ? 82 : 58,
        title: 'Risk-off volatility regime detected',
        description: `VIXCLS level is ${vix.value}.`,
        symbol: 'VIXCLS',
        sourceIds: [vix.id],
        data: { value: vix.value }
      }));
    }

    if (hasNumber(dollar?.change) && Math.abs(dollar.change) >= 0.75) {
      signals.push(this.signal({
        type: 'dollar_shock',
        level: Math.abs(dollar.change) >= 1.5 ? 72 : 51,
        title: 'Dollar index proxy move detected',
        description: `DTWEXBGS changed by ${dollar.change}.`,
        symbol: 'DTWEXBGS',
        sourceIds: [dollar.id],
        data: { value: dollar.value, change: dollar.change }
      }));
    }

    for (const signal of signals) {
      const existing = store.marketSignals.find((row) => row.type === signal.type && row.symbol === signal.symbol);
      if (existing) Object.assign(existing, signal);
      else store.marketSignals.push(signal);
      publishEvent('market_signal.generated', signal);
    }

    return store.marketSignals.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  signal({ type, level, title, description, symbol, sourceIds, data }) {
    return validateOrThrow(MarketSignalSchema, {
      id: randomUUID(),
      type,
      severity: severity(level),
      title,
      description,
      symbol,
      sourceIds,
      data: { ...data, severityScore: level },
      generatedAt: new Date().toISOString()
    }, `signal ${type}`);
  }

  list({ type, severity: severityFilter } = {}) {
    const rows = this.generateSignals();
    return rows
      .filter((row) => !type || row.type === type)
      .filter((row) => !severityFilter || row.severity === severityFilter);
  }

  classifyMarketRegime() {
    const signals = this.generateSignals();
    const highRisk = signals.filter((signal) => ['high', 'critical'].includes(signal.severity)).length;
    const inflationSignals = signals.filter((signal) => ['yield_spike', 'cpi_surprise', 'dollar_shock'].includes(signal.type)).length;
    const riskOffSignals = signals.filter((signal) => ['equity_selloff', 'risk_off'].includes(signal.type)).length;
    if (inflationSignals >= 2) return 'inflation_pressure_higher_real_yields';
    if (riskOffSignals >= 2 || highRisk >= 2) return 'risk_off_deleveraging';
    if (signals.some((signal) => signal.type === 'commodity_shock')) return 'commodity_supply_pressure';
    return 'macro_watch';
  }

  async explainSignals({ actor }) {
    const signals = this.generateSignals();
    return qwenService.summarizeMacroEvents({ actor, signals, macro: store.macroIndicators, market: store.marketData });
  }
}

export const marketIntelligenceService = new MarketIntelligenceService();
