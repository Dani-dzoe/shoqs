import { Request, Response, NextFunction } from 'express';
import { AuthUser, SessionData, UserRole } from '../models/User.js';
import { db } from '../db/index.js';
import { verifyJwtToken } from '../utils/jwt.js';
import { logSecurityEvent } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  token?: string;
  session?: SessionData;
}

/**
 * Bearer Token Authentication Middleware
 * Validates 'Authorization: Bearer <token>' header, checks against the revocation blacklist,
 * and attaches verified user identity and session to the request.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    logSecurityEvent(
      'UNAUTHORIZED_ACCESS',
      `REST API request to ${req.method} ${req.path} failed: Missing Authorization Bearer header`,
      undefined,
      undefined,
      'warning'
    );
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>'
    });
  }

  if (db.isTokenRevoked(token)) {
    logSecurityEvent(
      'UNAUTHORIZED_ACCESS',
      `REST API request rejected: Bearer token has been revoked / logged out`,
      undefined,
      undefined,
      'security_alert'
    );
    return res.status(401).json({
      error: 'TokenRevoked',
      message: 'This authentication token has been revoked. Please sign in again.'
    });
  }

  try {
    const decoded = await verifyJwtToken(token);
    const email = decoded.email.toLowerCase();

    let user = db.getUserByEmail(email);
    if (!user) {
      user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || 'Clinician',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(decoded.email)}`,
        role: (decoded.role as UserRole) || 'Patient',
        departmentId: decoded.departmentId,
        provider: 'google',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      db.saveUser(user);
    }

    const session = db.getSession(decoded.jti);

    req.user = user;
    req.token = token;
    req.session = session;

    next();
  } catch (err: any) {
    logSecurityEvent(
      'UNAUTHORIZED_ACCESS',
      `REST API request rejected: Invalid or expired Bearer token (${err.message})`,
      undefined,
      undefined,
      'warning'
    );
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or expired authentication token. Please sign in again.'
    });
  }
}

/**
 * Role-based Authorization Guard Middleware
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logSecurityEvent(
        'UNAUTHORIZED_ACCESS',
        `Access denied to ${req.method} ${req.path}. User role '${req.user?.role}' does not satisfy required [${allowedRoles.join(', ')}]`,
        req.user,
        undefined,
        'security_alert'
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}. Current role: ${req.user?.role || 'Guest'}`
      });
    }
    next();
  };
}
