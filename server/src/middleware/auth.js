import { actorFromRequest } from '../shared/requestContext.js';
import { env } from '../config/env.js';
import { authService, rolePermissions } from '../services/authService.js';

export function attachActor(req, _res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const serviceToken = req.headers['x-service-token'];
  const tokenActor = bearer ? authService.verifyToken(bearer) : null;
  if (env.authRequired && !tokenActor && serviceToken !== env.internalServiceToken) {
    req.authError = 'Authentication required';
  }
  req.actor = tokenActor ?? actorFromRequest(req);
  req.permissions = rolePermissions[req.actor.role] ?? rolePermissions.analyst;
  next();
}

function allows(granted, required) {
  if (granted === required) return true;
  if (!granted.endsWith(':*')) return false;
  const prefix = granted.split(':')[0];
  return required.startsWith(`${prefix}:`);
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (req.authError) {
      res.status(401).json({
        requestId: req.requestId,
        error: 'Unauthorized',
        message: req.authError
      });
      return;
    }
    if (req.permissions.some((granted) => allows(granted, permission))) {
      next();
      return;
    }
    res.status(403).json({
      requestId: req.requestId,
      error: 'Forbidden',
      message: `Role ${req.actor.role} lacks ${permission}`
    });
  };
}
