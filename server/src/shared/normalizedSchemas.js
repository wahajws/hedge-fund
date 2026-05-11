import { z } from 'zod';

export const MarketPriceSchema = z.object({
  id: z.string(),
  provider: z.string(),
  symbol: z.string(),
  canonicalSymbol: z.string(),
  assetClass: z.string(),
  timestamp: z.string(),
  value: z.number(),
  previousValue: z.number().nullable().default(null),
  change: z.number().nullable().default(null),
  changePercent: z.number().nullable().default(null),
  currency: z.string().nullable().default(null),
  unit: z.string(),
  freshnessStatus: z.string(),
  sourceHealth: z.string(),
  rawSourceId: z.string().nullable().default(null)
});

export const MacroIndicatorSchema = z.object({
  id: z.string(),
  provider: z.string(),
  seriesId: z.string(),
  name: z.string(),
  date: z.string(),
  value: z.number(),
  previousValue: z.number().nullable().default(null),
  change: z.number().nullable().default(null),
  units: z.string(),
  realtimeStart: z.string().nullable().default(null),
  realtimeEnd: z.string().nullable().default(null),
  freshnessStatus: z.string(),
  sourceHealth: z.string(),
  rawSourceId: z.string().nullable().default(null)
});

export const NewsArticleSchema = z.object({
  id: z.string(),
  provider: z.string(),
  title: z.string(),
  url: z.string().nullable().default(null),
  publishedAt: z.string(),
  source: z.string(),
  summary: z.string().nullable().default(null),
  clusterId: z.string(),
  category: z.string(),
  symbols: z.array(z.string()).default([]),
  relevanceScore: z.number().min(0).max(100),
  freshnessStatus: z.string(),
  rawSourceId: z.string().nullable().default(null)
});

export const EconomicCalendarEventSchema = z.object({
  id: z.string(),
  provider: z.string(),
  event: z.string(),
  country: z.string(),
  date: z.string(),
  actual: z.number().nullable().default(null),
  previous: z.number().nullable().default(null),
  consensus: z.number().nullable().default(null),
  surprise: z.number().nullable().default(null),
  surprisePercent: z.number().nullable().default(null),
  importance: z.string(),
  category: z.string(),
  freshnessStatus: z.string(),
  rawSourceId: z.string().nullable().default(null)
});

export const MarketSignalSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: z.string(),
  title: z.string(),
  description: z.string(),
  symbol: z.string().nullable().default(null),
  sourceIds: z.array(z.string()),
  data: z.record(z.string(), z.unknown()),
  generatedAt: z.string()
});

export function validateOrThrow(schema, value, label) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label} validation failed: ${result.error.message}`);
  }
  return result.data;
}

