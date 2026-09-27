import { AuthUser, SecurityAuditLog } from '../models/User.js';
import { db } from '../db/index.js';

export function logSecurityEvent(
  eventType: SecurityAuditLog['eventType'],
  details: string,
  user?: AuthUser,
  tokenSnippet?: string,
  severity: SecurityAuditLog['severity'] = 'info'
): SecurityAuditLog {
  return db.addAuditLog(eventType, details, user, tokenSnippet, severity);
}
