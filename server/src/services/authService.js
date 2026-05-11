import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export const rolePermissions = {
  cio: ['read:*', 'approve:*', 'run:*', 'generate:*', 'admin:executive'],
  pm: ['read:*', 'approve:risk', 'run:*', 'generate:reports'],
  risk: ['read:*', 'approve:risk', 'run:risk', 'run:workflow'],
  compliance: ['read:*', 'approve:compliance', 'approve:*', 'read:audit'],
  analyst: ['read:*', 'run:*', 'generate:drafts'],
  operations: ['read:*', 'run:ingestion', 'read:health', 'read:integrations'],
  admin: ['read:*', 'approve:*', 'run:*', 'generate:*', 'admin:*']
};

const roleAliases = {
  portfolio_manager: 'pm',
  risk_officer: 'risk',
  compliance_officer: 'compliance',
  operations_analyst: 'operations'
};

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value) {
  return createHmac('sha256', env.jwtSecret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function normalizeRole(role) {
  const normalized = String(role ?? 'analyst').toLowerCase();
  return roleAliases[normalized] ?? normalized;
}

export class AuthService {
  issueToken({ sub, role = 'analyst', name = 'Enterprise User', tenantId = 'macro-fund', teamId = 'global-macro', ttlSeconds = 3600 }) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'macro-fund-ai-os',
      aud: 'macro-fund-users',
      sub,
      name,
      role: normalizeRole(role),
      tenantId,
      teamId,
      iat: now,
      exp: now + ttlSeconds
    };
    const body = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    return `${body}.${sign(body)}`;
  }

  verifyToken(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expected = sign(`${header}.${payload}`);
    if (!safeEqual(signature, expected)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      id: parsed.sub,
      role: normalizeRole(parsed.role),
      name: parsed.name ?? parsed.sub,
      tenantId: parsed.tenantId ?? 'macro-fund',
      teamId: parsed.teamId ?? 'global-macro',
      authType: 'jwt'
    };
  }

  permissionMatrix() {
    return Object.entries(rolePermissions).map(([role, permissions]) => ({ role, permissions }));
  }
}

export const authService = new AuthService();
