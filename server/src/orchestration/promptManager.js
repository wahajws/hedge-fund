const baseSystemPrompt = `
You are Alibaba Qwen operating inside a macro hedge fund AI Operating System.
You are not a chatbot. You are an institutional intelligence engine.
Use only supplied deterministic facts, source IDs, portfolio records, news records, and workflow context.
Never invent market values, portfolio positions, confidence scores, timestamps, or sources.
Never perform raw calculations. Deterministic services provide all numbers.
Return compact JSON only.
`;

const templates = {
  macro_regime_analysis_v2: {
    version: 'macro_regime_analysis_v2',
    purpose: 'Macro regime analysis',
    user: 'Analyze supplied macro signals and deterministic market intelligence. Explain regime, assumptions, risks, and source IDs.'
  },
  portfolio_impact_explanation_v2: {
    version: 'portfolio_impact_explanation_v2',
    purpose: 'Portfolio impact explanation',
    user: 'Explain deterministic portfolio pressure and affected positions. Do not calculate new numbers.'
  },
  risk_escalation_v2: {
    version: 'risk_escalation_v2',
    purpose: 'Risk escalation',
    user: 'Generate an executive risk escalation from deterministic signals and risk snapshots. Include escalation reason and approval need.'
  },
  morning_cio_brief_v2: {
    version: 'morning_cio_brief_v2',
    purpose: 'Morning CIO brief',
    user: 'Generate a CIO-ready institutional brief using supplied normalized data, agent outputs, and source IDs.'
  },
  news_summarization_v2: {
    version: 'news_summarization_v2',
    purpose: 'News summarization',
    user: 'Summarize news flow, classify macro themes, and map themes to supplied portfolio exposures.'
  },
  executive_alerts_v2: {
    version: 'executive_alerts_v2',
    purpose: 'Executive alerts',
    user: 'Create concise executive alerts from deterministic signals, severity, affected positions, and approval requirements.'
  },
  market_shock_explanation_v2: {
    version: 'market_shock_explanation_v2',
    purpose: 'Market shock explanation',
    user: 'Explain market shock causes and portfolio relevance from deterministic signals only.'
  },
  compliance_explanation_v2: {
    version: 'compliance_explanation_v2',
    purpose: 'Compliance explanation',
    user: 'Explain compliance findings and suggest safer wording without changing deterministic findings.'
  },
  workflow_coordination_v2: {
    version: 'workflow_coordination_v2',
    purpose: 'Workflow coordination',
    user: 'Coordinate next workflow actions based on agent outputs, gating rules, approvals, and risk severity.'
  },
  executive_ask_v2: {
    version: 'executive_ask_v2',
    purpose: 'Executive ask',
    user: 'Answer the executive question using supplied deterministic context, agent outputs, and source lineage.'
  }
};

export class PromptManager {
  get(name) {
    const template = templates[name];
    if (!template) throw new Error(`Unknown prompt template ${name}`);
    return {
      ...template,
      system: baseSystemPrompt.trim()
    };
  }

  list() {
    return Object.values(templates);
  }
}

export const promptManager = new PromptManager();

