import { ingestionService } from './ingestionService.js';
import { logger } from '../shared/logger.js';

const schedules = [];

export function startIngestionScheduler() {
  if (process.env.DISABLE_INGESTION_SCHEDULER === 'true') return schedules;

  const systemActor = { id: 'ingestion-scheduler', role: 'operations', type: 'system' };

  const register = (name, intervalMs, sources) => {
    const timer = setInterval(async () => {
      try {
        await ingestionService.run({ actor: systemActor, sources });
      } catch (error) {
        logger.warn({ name, error: error.message }, 'Scheduled ingestion failed');
      }
    }, intervalMs);
    timer.unref?.();
    schedules.push({ name, intervalMs, sources, timer });
  };

  register('market-prices', 5 * 60_000, ['alpha_vantage']);
  register('macro-indicators', 60 * 60_000, ['fred']);
  register('calendar-news', 10 * 60_000, ['fmp']);

  return schedules;
}

