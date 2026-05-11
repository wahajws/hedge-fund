# Incident Response Guide

Incident classes:

- Data provider outage
- Qwen gateway degradation
- workflow failure
- stale market data
- websocket disruption
- approval backlog
- audit write failure

Response pattern:

1. Capture request ID, workflow ID, agent log ID, and affected provider.
2. Check `/api/ops/metrics` and `/api/ops/readiness`.
3. Inspect source health and circuit breaker state.
4. Confirm whether stale data reached executive outputs.
5. Notify risk/compliance for high-risk affected workflows.
6. Preserve audit trail references.
7. Replay or retry only after source status stabilizes.
