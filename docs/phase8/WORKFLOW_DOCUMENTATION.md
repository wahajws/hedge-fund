# Workflow Documentation

Primary workflows:

- `morning_macro_intelligence`
- `risk_escalation`
- `executive_ask`
- `morning_macro_brief`

Workflow pattern:

1. Refresh deterministic data.
2. Generate market intelligence signals.
3. Build workflow context.
4. Execute Qwen agents.
5. Validate structured outputs.
6. Generate approval if risk or policy requires it.
7. Emit audit and websocket events.
8. Preserve workflow replay context.

Failures should degrade visibly through source health, agent logs, and approval gates rather than silently disappear.
