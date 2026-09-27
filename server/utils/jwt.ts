import jwt from 'jsonwebtoken';
import { AuthUser, SessionData } from '../models/User.js';
import { config } from '../config/index.js';
import { db } from '../db/index.js';

export interface DecodedTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export function formatTokenSnippet(token: string): string {
  if (!token || token.length < 15) return 'token-short';
  return `${token.substring(0, 8)}...${token.substring(token.length - 6)}`;
}

export function issueJwtToken(
  user: AuthUser,
  ipAddress: string = '127.0.0.1',
  userAgent: string = 'REST API Client'
): { token: string; session: SessionData; tokenSnippet: string } {
  const sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.TOKEN_EXPIRY_SECONDS * 1000);

  const payload: DecodedTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
    jti: sessionId
  };

  const token = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.TOKEN_EXPIRY_SECONDS
  });

  const tokenSnippet = formatTokenSnippet(token);

  const session: SessionData = {
    sessionId,
    token,
    user,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userAgent,
    ipAddress
  };

  db.saveSession(session);
  db.addAuditLog(
    'TOKEN_ISSUED',
    `Issued JWT Bearer token for ${user.name} (${user.email}) [${user.role}]. Expires in 24h.`,
    user,
    tokenSnippet,
    'info'
  );

  return { token, session, tokenSnippet };
}

export function verifyJwtToken(token: string): Promise<DecodedTokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err || !decoded) {
        return reject(err || new Error('Invalid token'));
      }
      resolve(decoded as DecodedTokenPayload);
    });
  });
}
