import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { auditService } from './auditService.js';
import { promptManager } from '../orchestration/promptManager.js';
import { responseValidator } from '../orchestration/responseValidator.js';

const agentStructuredOutputContract = {
  summary: 'string, 2-4 institutional sentences using only supplied facts',
  keySignals: ['array of concise strings from supplied deterministic signals or facts'],
  affectedPositions: ['array of supplied portfolio symbols only, for example USDJPY or QQQ'],
  riskLevel: 'one of normal, watch, elevated, high, critical',
  confidence: 'number from 0 to 1 based on source coverage and ambiguity',
  sourcesUsed: ['array of exact source IDs from the supplied sources list'],
  recommendations: ['array of operational review recommendations, not trade instructions'],
  approvalRequired: 'boolean',
  escalationReason: 'string or null',
  assumptions: ['array of explicit assumptions or data gaps'],
  guardrails: ['array of guardrail labels, for example source_bound_only']
};

function hasUnsupportedNumericClaim(text, allowedNumbers) {
  const numbers = String(text).match(/\b\d+(?:\.\d+)?%?\b/g) ?? [];
  return numbers.some((number) => !allowedNumbers.some((allowed) => String(allowed).includes(number.replace('%', ''))));
}

function buildFallbackSummary({ task, context }) {
  const risk = context?.risk?.severity ?? context?.deterministicOutput?.severity ?? context?.deterministicOutput?.regime?.regime ?? 'watch';
  const signalTitles = (context?.signals ?? []).slice(0, 3).map((signal) => signal.title ?? signal.type).filter(Boolean);
  const providerIssues = context?.deterministicOutput?.providers
    ?.filter?.((provider) => provider.status && provider.status !== 'healthy')
    ?.map?.((provider) => `${provider.provider} ${provider.status}`) ?? [];
  const positions = context?.portfolio?.positions?.slice(0, 4).map((position) => position.symbol).filter(Boolean) ?? [];
  const parts = [`${task} completed using source-bound deterministic context.`];
  parts.push(`Current risk posture is ${risk}.`);
  if (signalTitles.length) parts.push(`Primary signals: ${signalTitles.join(', ')}.`);
  if (positions.length) parts.push(`Portfolio context includes ${positions.join(', ')}.`);
  if (providerIssues.length) parts.push(`Data quality note: ${providerIssues.join(', ')}.`);
  return parts.join(' ');
}

export class QwenService {
  async runAgentPrompt({ actor, templateName, context, sources = [], riskLevelFallback = 'watch' }) {
    const template = promptManager.get(templateName);
    const raw = await this.generateStructured({
      actor,
      task: template.purpose,
      promptVersion: template.version,
      schemaName: 'AgentStructuredOutput',
      facts: context,
      sources,
      instructions: template.user,
      systemPrompt: template.system
    });
    return {
      invocationId: raw.invocationId,
      model: raw.model,
      promptVersion: raw.promptVersion,
      output: responseValidator.validateAgentOutput({
        output: raw,
        sources,
        riskLevelFallback,
        fallbackSummary: buildFallbackSummary({ task: template.purpose, context })
      })
    };
  }

  summarizeMacroEvents({ actor, signals, macro, market }) {
    return this.generateStructured({
      actor,
      task: 'macro event summarization',
      promptVersion: 'macro_events_v1',
      schemaName: 'MacroEventSummary',
      facts: { signals, macro, market },
      sources: [...macro, ...market],
      instructions: 'Summarize deterministic macro and market signals. Cite source IDs. Do not create numbers.'
    });
  }

  explainPortfolioImpact({ actor, risk, portfolio, signals }) {
    return this.generateStructured({
      actor,
      task: 'portfolio impact explanation',
      promptVersion: 'portfolio_impact_v1',
      schemaName: 'PortfolioImpactExplanation',
      facts: { risk, portfolio, signals },
      sources: [...portfolio.positions, ...signals],
      instructions: 'Explain deterministic portfolio impact. No calculations and no new prices.'
    });
  }

  classifyMacroRegime({ actor, regime, signals, macro }) {
    return this.generateStructured({
      actor,
      task: 'macro regime classification explanation',
      promptVersion: 'macro_regime_real_data_v1',
      schemaName: 'MacroRegimeClassification',
      facts: { regime, signals, macro },
      sources: [...signals, ...macro],
      instructions: 'Explain the supplied deterministic regime classification and assumptions.'
    });
  }

  generateMorningBrief({ actor, market, macro, news, calendar, signals, risk }) {
    return this.generateStructured({
      actor,
      task: 'real data morning brief generation',
      promptVersion: 'morning_brief_real_data_v1',
      schemaName: 'MorningBrief',
      facts: { market, macro, news, calendar, signals, risk },
      sources: [...market, ...macro, ...news, ...calendar, ...signals],
      instructions: 'Generate CIO morning brief using only supplied normalized facts. Include assumptions and confidence.'
    });
  }

  summarizeNewsFlow({ actor, news, signals }) {
    return this.generateStructured({
      actor,
      task: 'news flow summarization',
      promptVersion: 'news_flow_v1',
      schemaName: 'NewsFlowSummary',
      facts: { news, signals },
      sources: news,
      instructions: 'Summarize and classify news themes using only normalized articles and deterministic signals.'
    });
  }

  async generateStructured({ actor, task, promptVersion, schemaName, facts = {}, sources = [], instructions, systemPrompt = null }) {
    const invocationId = randomUUID();
    const allowedNumbers = [
      ...(JSON.stringify(facts).match(/\b\d+(?:\.\d+)?\b/g) ?? []),
      String(sources.length)
    ];

    const payload = {
      invocationId,
      provider: 'qwen',
      model: env.qwenModel,
      task,
      promptVersion,
      schemaName,
      facts,
      sources,
      instructions,
      requiredJsonContract: agentStructuredOutputContract
    };

    auditService.record({
      eventType: 'qwen.invocation.requested',
      actor: { ...actor, type: actor?.type ?? 'user' },
      objectType: 'qwen_invocation',
      objectId: invocationId,
      payload: {
        task,
        model: env.qwenModel,
        promptVersion,
        schemaName,
        sourceIds: sources.map((source) => source.id ?? source.seriesId ?? source.symbol ?? source.title)
      }
    });

    const result = env.qwenApiKey ? await this.callWithRetry({ ...payload, systemPrompt }) : this.mockQwenResult(payload);

    const narrativeFields = [
      result.summary,
      ...(Array.isArray(result.reasoning) ? result.reasoning : []),
      result.recommendation,
      result.classification
    ].filter(Boolean);
    if (hasUnsupportedNumericClaim(JSON.stringify(narrativeFields), allowedNumbers)) {
      result.guardrails = [...(result.guardrails ?? []), 'numeric_claim_validation_required'];
    }

    auditService.record({
      eventType: 'qwen.invocation.completed',
      actor: { id: 'qwen-gateway', role: 'ai-service', type: 'agent' },
      objectType: 'qwen_invocation',
      objectId: invocationId,
      payload: {
        task,
        model: env.qwenModel,
        promptVersion,
        schemaName,
        confidence: result.confidence,
        guardrails: result.guardrails ?? []
      }
    });

    return {
      invocationId,
      model: env.qwenModel,
      promptVersion,
      ...result
    };
  }

  async callWithRetry(payload) {
    let lastResult = null;
    for (let attempt = 0; attempt <= env.qwenMaxRetries; attempt += 1) {
      try {
        lastResult = await this.callQwenApi(payload);
      } catch (error) {
        lastResult = {
          summary: 'Qwen request failed; deterministic workflow continues with manual review required.',
          reasoning: [`Qwen gateway error: ${error.message}`],
          confidence: 0.25,
          guardrails: ['qwen_gateway_error']
        };
      }
      if (!lastResult.guardrails?.includes('qwen_gateway_error') && !lastResult.guardrails?.includes('malformed_qwen_json')) {
        return lastResult;
      }
    }
    return {
      ...lastResult,
      guardrails: [...(lastResult?.guardrails ?? []), 'qwen_max_retries_exhausted']
    };
  }

  async callQwenApi(payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.qwenTimeout);
    const response = await fetch(env.qwenBaseUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.qwenApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.qwenModel,
        messages: [
          {
            role: 'system',
            content:
              payload.systemPrompt ??
              'You are Qwen operating inside a macro hedge fund AI OS. Use only supplied facts and sources. Never fabricate market data or calculations. Return only one valid JSON object matching the requiredJsonContract.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              ...payload,
              outputRules: [
                'Return valid JSON only. No markdown, no prose outside JSON.',
                'Use exactly these top-level keys: summary, keySignals, affectedPositions, riskLevel, confidence, sourcesUsed, recommendations, approvalRequired, escalationReason, assumptions, guardrails.',
                'sourcesUsed must contain only IDs from sources. Do not invent IDs.',
                'affectedPositions must contain only symbols found in supplied portfolio positions.',
                'If data is incomplete, say so in assumptions instead of inventing values.'
              ]
            })
          }
        ],
        response_format: { type: 'json_object' }
      })
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return {
        summary: 'Qwen request failed; deterministic workflow continues with manual review required.',
        reasoning: [`Qwen gateway returned HTTP ${response.status}.`],
        confidence: 0.25,
        guardrails: ['qwen_gateway_error']
      };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    try {
      const trimmed = String(content ?? '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      return JSON.parse(trimmed);
    } catch {
      return {
        summary: content ?? 'Qwen returned empty content.',
        reasoning: ['Response was not parseable JSON and requires review.'],
        confidence: 0.35,
        guardrails: ['malformed_qwen_json']
      };
    }
  }

  mockQwenResult({ task, facts, sources }) {
    const riskLevel = facts?.risk?.severity ?? facts?.signals?.[0]?.severity ?? facts?.agentOutputs?.find?.((row) => row?.output?.riskLevel)?.output?.riskLevel ?? 'watch';
    const keySignals = (facts?.signals ?? []).slice(0, 5).map((signal) => signal.title ?? signal.type);
    const affectedPositions = facts?.risk?.positionContributions
      ?.filter((row) => Math.abs(row.pressureContribution) > 5)
      ?.map((row) => row.symbol) ?? [];
    const sourceIds = sources.map((source) => String(source.id ?? source.seriesId ?? source.symbol ?? source.rawSourceId ?? source.title)).slice(0, 12);
    return {
      summary: `${task}: source-bound interpretation generated with mock Qwen gateway because QWEN_API_KEY is not configured.`,
      keySignals,
      affectedPositions,
      riskLevel,
      sourcesUsed: sourceIds,
      recommendations: [
        riskLevel === 'high' || riskLevel === 'critical'
          ? 'Route to human approval before publication or action.'
          : 'Keep in analyst review until source validation is complete.'
      ],
      approvalRequired: ['high', 'critical'].includes(riskLevel),
      escalationReason: ['high', 'critical'].includes(riskLevel) ? 'Deterministic risk severity requires human review.' : null,
      assumptions: ['Mock Qwen gateway used because QWEN_API_KEY is not configured.'],
      reasoning: [
        'All numerical values in this response are derived from deterministic service facts supplied to the gateway.',
        `The response used ${sources.length} source artifact(s).`,
        facts?.risk?.severity
          ? `Risk interpretation references deterministic severity ${facts.risk.severity}.`
          : 'No deterministic risk severity was supplied for this task.'
      ],
      classification: facts?.risk?.severity ?? facts?.macro?.ratesSignal ?? 'review_required',
      recommendation: facts?.risk?.severity === 'high' || facts?.risk?.severity === 'critical'
        ? 'Route to human approval before publication or action.'
        : 'Keep in analyst review until source validation is complete.',
      confidence: 0.74,
      guardrails: ['mock_qwen_gateway', 'source_bound_only']
    };
  }
}

export const qwenService = new QwenService();
