import { store } from '../db/store.js';

export class MacroDataService {
  list({ seriesId } = {}) {
    return seriesId ? store.macroIndicators.filter((row) => row.seriesId === seriesId) : store.macroIndicators;
  }

  regimeInputs() {
    const dgs10 = store.macroIndicators.find((row) => row.seriesId === 'DGS10')?.value ?? 0;
    const cpi = store.macroIndicators.find((row) => row.seriesId === 'CPIAUCSL')?.value ?? 0;
    const unemployment = store.macroIndicators.find((row) => row.seriesId === 'UNRATE')?.value ?? 0;
    return {
      cpiYoY: cpi,
      us10y: dgs10,
      unemployment,
      inflationSignal: cpi > 3 ? 'above_target' : 'contained',
      ratesSignal: dgs10 > 4.5 ? 'restrictive' : 'neutral'
    };
  }
}

export const macroDataService = new MacroDataService();

