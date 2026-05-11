# System Architecture

The Macro Fund AI Operating System is a layered institutional intelligence platform:

- React/Nginx frontend for executive, risk, workflow, approval, audit, and demo surfaces.
- Express API for access control, normalized data APIs, workflow execution, approvals, reports, and audit queries.
- Qwen orchestration layer for source-bound reasoning and report generation.
- Deterministic engines for ingestion, market signals, portfolio risk, compliance gates, and approval routing.
- PostgreSQL-ready persistence model for system-of-record storage.
- Redis-ready cache and queue layer for scale-out execution.
- WebSocket stream for workflow, alert, approval, audit, and health events.

Production deployment should split API, ingestion workers, workflow workers, Redis, PostgreSQL, frontend, and gateway into independently scalable services.
