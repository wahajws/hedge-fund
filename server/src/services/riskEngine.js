import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { marketDataService } from './marketDataService.js';
import { portfolioService } from './portfolioService.js';
import { publishEvent } from '../shared/events.js';

const factorSensitivity = {
  USDJPY: { usdStrength: 0.92, higherRealYields: 0.38, growthShock: -0.32, geopoliticalStress: -0.08, riskOnLiquidity: 0.2 },
  US10Y: { usdStrength: 0.12, higherRealYields: 0.88, growthShock: -0.44, geopoliticalStress: -0.14, riskOnLiquidity: -0.18 },
  GLD: { usdStrength: -0.48, higherRealYields: -0.82, growthShock: 0.34, geopoliticalStress: 0.78, riskOnLiquidity: -0.22 },
  WTI: { usdStrength: -0.18, higherRealYields: -0.16, growthShock: -0.72, geopoliticalStress: 0.86, riskOnLiquidity: 0.48 },
  SPY: { usdStrength: 0.08, higherRealYields: 0.34, growthShock: 0.64, geopoliticalStress: 0.52, riskOnLiquidity: -0.64 },
  QQQ: { usdStrength: -0.22, higherRealYields: -0.78, growthShock: -0.7, geopoliticalStress: -0.44, riskOnLiquidity: 0.86 }
};

function getMarket(symbol) {
  return [...store.marketData].reverse().find((row) => row.symbol === symbol || row.canonicalSymbol === symbol);
}

function getMacro(seriesId) {
  return [...store.macroIndicators].reverse().find((row) => row.seriesId === seriesId);
}

function deriveMacroShock() {
  const usdjpy = getMarket('USDJPY');
  const eurusd = getMarket('EURUSD');
  const us10y = getMacro('DGS10') ?? getMarket('US10Y');
  const uso = getMarket('USO') ?? getMarket('WTI');
  const spy = getMarket('SPY');
  const qqq = getMarket('QQQ');
  const gld = getMarket('GLD');
  const vix = getMacro('VIXCLS');

  const usdStrength = clamp(((usdjpy?.changePercent ?? 0) - (eurusd?.changePercent ?? 0)) / 2, -1, 1);
  const higherRealYields = clamp(((us10y?.change ?? 0) / 0.15) + (gld?.changePercent && gld.changePercent < 0 ? 0.2 : 0), -1, 1);
  const growthShock = clamp(-(((spy?.changePercent ?? 0) + (qqq?.changePercent ?? 0)) / 4), -1, 1);
  const geopoliticalStress = clamp(((uso?.changePercent ?? 0) / 5) + ((vix?.value ?? 18) > 25 ? 0.25 : 0), -1, 1);
  const riskOnLiquidity = clamp((((spy?.changePercent ?? 0) + (qqq?.changePercent ?? 0)) / 5) - ((us10y?.change ?? 0) / 0.2), -1, 1);

  return {
    usdStrength: Number(usdStrength.toFixed(3)),
    higherRealYields: Number(higherRealYields.toFixed(3)),
    growthShock: Number(growthShock.toFixed(3)),
    geopoliticalStress: Number(geopoliticalStress.toFixed(3)),
    riskOnLiquidity: Number(riskOnLiquidity.toFixed(3))
  };
}

function severityFromScore(score) {
  if (score >= 86) return 'critical';
  if (score >= 71) return 'high';
  if (score >= 51) return 'elevated';
  if (score >= 26) return 'watch';
  return 'normal';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class RiskEngine {
  calculate(portfolioId = 'GLOBAL-MACRO-01') {
    const portfolio = portfolioService.getPortfolio(portfolioId);
    const marketSnapshot = marketDataService.snapshot();
    const currentMacroShock = deriveMacroShock();
    const totalNotional = portfolio.totalNotional || 1;

    const positionContributions = portfolio.positions.map((position) => {
      const sensitivity = factorSensitivity[position.symbol] ?? {};
      const rawImpact = Object.entries(currentMacroShock).reduce((sum, [factor, shock]) => {
        return sum + (sensitivity[factor] ?? 0) * shock;
      }, 0);
      const directionMultiplier = position.direction === 'short' ? -1 : 1;
      const notionalWeight = position.notional / totalNotional;
      const pressureContribution = rawImpact * directionMultiplier * notionalWeight * 100;
      return {
        symbol: position.symbol,
        direction: position.direction,
        notional: position.notional,
        pressureContribution: Number(pressureContribution.toFixed(2)),
        primarySensitivity: Object.entries(sensitivity).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]?.[0] ?? 'unknown'
      };
    });

    const grossPressure = positionContributions.reduce((sum, row) => sum + Math.abs(row.pressureContribution), 0);
    const concentration = this.detectConcentration(positionContributions);
    const portfolioPressureScore = clamp(Math.round(grossPressure * 2.6 + concentration.penalty), 0, 100);
    const severity = severityFromScore(portfolioPressureScore);

    const snapshot = {
      id: randomUUID(),
      portfolioId,
      asOf: new Date().toISOString(),
      marketAsOf: marketSnapshot.asOf,
      pressureScore: portfolioPressureScore,
      severity,
      factorJson: currentMacroShock,
      scenarioJson: {
        hotCpiHawkishFed: clamp(portfolioPressureScore + 14, 0, 100),
        oilSupplyShock: clamp(portfolioPressureScore + 8, 0, 100),
        riskOnLiquidity: clamp(portfolioPressureScore - 19, 0, 100),
        growthScare: clamp(portfolioPressureScore + 11, 0, 100)
      },
      breachFlags: this.detectBreaches(portfolioPressureScore, concentration),
      concentration,
      positionContributions
    };

    store.riskSnapshots.push(snapshot);
    publishEvent('risk_snapshot.created', snapshot);
    return snapshot;
  }

  detectConcentration(contributions) {
    const absolute = contributions.map((row) => ({ ...row, abs: Math.abs(row.pressureContribution) }));
    const total = absolute.reduce((sum, row) => sum + row.abs, 0) || 1;
    const largest = absolute.sort((a, b) => b.abs - a.abs)[0];
    const largestShare = largest.abs / total;
    return {
      largestSymbol: largest.symbol,
      largestShare: Number(largestShare.toFixed(2)),
      penalty: largestShare > 0.38 ? 12 : largestShare > 0.25 ? 6 : 0
    };
  }

  detectBreaches(score, concentration) {
    const flags = [];
    if (score >= 71) flags.push({ code: 'PORTFOLIO_PRESSURE_HIGH', severity: 'high' });
    if (concentration.penalty > 0) flags.push({ code: 'CONCENTRATION_RISK', severity: 'elevated', symbol: concentration.largestSymbol });
    return flags;
  }

  latest(portfolioId = 'GLOBAL-MACRO-01') {
    return [...store.riskSnapshots].reverse().find((row) => row.portfolioId === portfolioId) ?? this.calculate(portfolioId);
  }
}

export const riskEngine = new RiskEngine();
