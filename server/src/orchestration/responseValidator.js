import { z } from 'zod';

export const AgentOutputSchema = z.object({
  summary: z.string().min(1),
  keySignals: z.array(z.string()).default([]),
  affectedPositions: z.array(z.string()).default([]),
  riskLevel: z.enum(['normal', 'watch', 'elevated', 'high', 'critical']).default('watch'),
  confidence: z.number().min(0).max(1),
  sourcesUsed: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  approvalRequired: z.boolean().default(false),
  escalationReason: z.string().nullable().default(null),
  assumptions: z.array(z.string()).default([]),
  guardrails: z.array(z.string()).default([])
});

function extractAllowedSourceIds(sources) {
  return new Set(sources.map((source) => String(source.id ?? source.seriesId ?? source.symbol ?? source.rawSourceId ?? source.title)));
}

function unwrapOutput(output) {
  return output?.outputJson ?? output?.output ?? output?.result ?? output?.data ?? output?.response ?? output;
}

function toStringArray(value, itemMapper = null) {
  const mapper = itemMapper ?? ((item) => item);
  if (Array.isArray(value)) {
    return value
      .map((item) => mapper(item))
      .filter((item) => item !== null && item !== undefined && String(item).trim() !== '')
      .map(String);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizeRiskLevel(value, fallback) {
  const risk = String(value ?? fallback ?? 'watch').toLowerCase();
  if (['normal', 'watch', 'elevated', 'high', 'critical'].includes(risk)) return risk;
  if (['low', 'benign', 'stable'].includes(risk)) return 'normal';
  if (['medium', 'moderate'].includes(risk)) return 'elevated';
  if (['severe', 'urgent'].includes(risk)) return 'critical';
  return fallback ?? 'watch';
}

function extractSummary(output, fallbackSummary) {
  const direct = output.summary ?? output.executiveSummary ?? output.answer ?? output.analysis ?? output.interpretation ?? output.brief ?? output.message;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (Array.isArray(output.reasoning) && output.reasoning.length) return output.reasoning.map(String).join(' ');
  if (Array.isArray(output.keyTakeaways) && output.keyTakeaways.length) return output.keyTakeaways.map(String).join(' ');
  return fallbackSummary ?? 'Source-bound analysis completed; review structured signals, affected positions, and approval status.';
}

function sanitizeOutput(output, { riskLevelFallback = 'watch', fallbackSummary = null } = {}) {
  const unwrapped = unwrapOutput(output) ?? {};
  const sourceValues = unwrapped.sourcesUsed ?? unwrapped.sources ?? unwrapped.sourceIds ?? unwrapped.source_ids;
  const positionValues = unwrapped.affectedPositions ?? unwrapped.affected_positions ?? unwrapped.positions ?? unwrapped.impactedPositions;
  return {
    summary: extractSummary(unwrapped, fallbackSummary),
    keySignals: toStringArray(unwrapped.keySignals ?? unwrapped.key_signals ?? unwrapped.signals ?? unwrapped.themes, (item) => item?.title ?? item?.signal ?? item?.name ?? item),
    affectedPositions: toStringArray(positionValues, (item) => item?.symbol ?? item?.position ?? item?.name ?? item),
    riskLevel: normalizeRiskLevel(unwrapped.riskLevel ?? unwrapped.risk_level ?? unwrapped.severity ?? unwrapped.classification, riskLevelFallback),
    confidence: Number(unwrapped.confidence ?? unwrapped.confidenceLevel ?? unwrapped.confidence_level ?? 0.65),
    sourcesUsed: toStringArray(sourceValues, (item) => item?.id ?? item?.sourceId ?? item?.source_id ?? item?.seriesId ?? item?.symbol ?? item?.title ?? item),
    recommendations: Array.isArray(unwrapped.recommendations)
      ? unwrapped.recommendations.map((item) => String(item?.action ?? item?.recommendation ?? item))
      : unwrapped.recommendation
        ? [String(unwrapped.recommendation)]
        : [],
    approvalRequired: Boolean(unwrapped.approvalRequired ?? unwrapped.approval_required),
    escalationReason: unwrapped.escalationReason || unwrapped.escalation_reason ? String(unwrapped.escalationReason ?? unwrapped.escalation_reason) : null,
    assumptions: toStringArray(unwrapped.assumptions),
    guardrails: toStringArray(unwrapped.guardrails)
  };
}

export class ResponseValidator {
  validateAgentOutput({ output, sources = [], riskLevelFallback = 'watch', fallbackSummary = null }) {
    const sourceIds = extractAllowedSourceIds(sources);
    const sanitized = sanitizeOutput(output, { riskLevelFallback, fallbackSummary });

    if (!['normal', 'watch', 'elevated', 'high', 'critical'].includes(sanitized.riskLevel)) {
      sanitized.riskLevel = riskLevelFallback;
      sanitized.guardrails.push('risk_level_normalized');
    }

    const unverifiedSources = sanitized.sourcesUsed.filter((sourceId) => !sourceIds.has(sourceId));
    if (unverifiedSources.length) {
      sanitized.sourcesUsed = sanitized.sourcesUsed.filter((sourceId) => sourceIds.has(sourceId));
      sanitized.guardrails.push('unverified_sources_removed');
    }

    if (!sanitized.sourcesUsed.length && sources.length) {
      sanitized.sourcesUsed = [...sourceIds].slice(0, 12);
      sanitized.guardrails.push('sources_auto_attached_from_context');
    }

    return AgentOutputSchema.parse(sanitized);
  }
}

export const responseValidator = new ResponseValidator();
