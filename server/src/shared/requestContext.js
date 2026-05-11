import { randomUUID } from 'node:crypto';

export function requestContext(req, res, next) {
  req.requestId = req.headers['x-request-id'] ?? randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}

export function actorFromRequest(req) {
  return {
    id: req.headers['x-user-id'] ?? 'local-analyst',
    role: req.headers['x-user-role'] ?? 'analyst',
    name: req.headers['x-user-name'] ?? 'Local Analyst',
    tenantId: req.headers['x-tenant-id'] ?? 'macro-fund',
    teamId: req.headers['x-team-id'] ?? 'global-macro',
    authType: 'headers'
  };
}
