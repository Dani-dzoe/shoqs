import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { UserRole, AuthUser } from '../models/User.js';
import { db } from '../db/index.js';
import { issueJwtToken } from '../utils/jwt.js';
import { logSecurityEvent } from '../utils/logger.js';
import { config } from '../config/index.js';

export class AuthController {
  /**
   * POST /api/auth/login
   * Login with email and password. Issues JWT Bearer token.
   */
  public static async login(req: Request, res: Response): Promise<any> {
    const { email, password, role, departmentId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = db.getUserByEmail(cleanEmail);

    // If password provided, verify it
    if (password) {
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password. Please check your credentials.'
        });
      }

      const isValid = db.verifyUserPassword(cleanEmail, password);
      if (!isValid) {
        logSecurityEvent(
          'UNAUTHORIZED_ACCESS',
          `Failed login attempt for ${cleanEmail}: Invalid password`,
          undefined,
          undefined,
          'warning'
        );
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password. Please check your credentials.'
        });
      }
    } else {
      // Quick login or demo session without password
      if (!user) {
        const determinedRole: UserRole = role || (cleanEmail.includes('dr.') ? 'Doctor' : 'Patient');
        user = {
          id: 'usr-' + Math.random().toString(36).substring(2, 9),
          email: cleanEmail,
          name: cleanEmail.split('@')[0].replace('.', ' '),
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
          role: determinedRole,
          departmentId: departmentId || (determinedRole === 'Doctor' ? 'cardiology' : undefined),
          provider: 'password',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        db.saveUser(user);
      }
    }

    user.lastLoginAt = new Date().toISOString();
    if (role && role !== user.role) user.role = role;
    if (departmentId) user.departmentId = departmentId;

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser Client';
    const { token, session } = issueJwtToken(user, clientIp, userAgent);

    logSecurityEvent(
      'LOGIN_PASSWORD',
      `User ${user.name} (${user.email}) logged in successfully. Bearer token issued.`,
      user,
      token.substring(0, 10) + '...',
      'info'
    );

    return res.json({
      token,
      tokenType: 'Bearer',
      expiresIn: config.TOKEN_EXPIRY_SECONDS,
      user,
      session
    });
  }

  /**
   * POST /api/auth/signup
   * Normal user registration with name, email, password, and clinical role.
   */
  public static async signup(req: Request, res: Response): Promise<any> {
    const { name, email, password, role, departmentId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Name and email are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    if (password && password.length < 6) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Password must be at least 6 characters long.'
      });
    }

    const userRole: UserRole = role || 'Patient';
    const initialPassword = password || 'Password123!';
    const user = db.createUserWithPassword(name, cleanEmail, initialPassword, userRole, departmentId);

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser Client';
    const { token, session } = issueJwtToken(user, clientIp, userAgent);

    logSecurityEvent(
      'LOGIN_PASSWORD',
      `New user registered via standard signup: ${user.name} (${user.email}) as [${user.role}]`,
      user,
      token.substring(0, 10) + '...',
      'info'
    );

    return res.status(201).json({
      token,
      tokenType: 'Bearer',
      expiresIn: config.TOKEN_EXPIRY_SECONDS,
      user,
      session
    });
  }

  /**
   * POST /api/auth/google
   * Google OAuth login / registration. Issues signed JWT Bearer token.
   */
  public static async googleAuth(req: Request, res: Response): Promise<any> {
    const { email, name, avatarUrl, role, departmentId, googleSub } = req.body;
    const cleanEmail = (email || 'dr.jenkins@stjude-hospital.org').toLowerCase().trim();

    let user = db.getUserByEmail(cleanEmail);
    const isNew = !user;

    if (!user) {
      const assignedRole: UserRole = role || (cleanEmail.includes('dr.') ? 'Doctor' : 'Patient');
      user = {
        id: 'usr-g-' + Date.now(),
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
        role: assignedRole,
        departmentId: departmentId || (assignedRole === 'Doctor' ? 'cardiology' : undefined),
        googleSub: googleSub || 'sub-' + Math.random().toString(36).substring(2, 10),
        provider: 'google',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      db.saveUser(user);
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (role) user.role = role;
      if (departmentId) user.departmentId = departmentId;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Google OAuth Agent';
    const { token, session } = issueJwtToken(user, clientIp, userAgent);

    logSecurityEvent(
      isNew ? 'SIGNUP_GOOGLE' : 'LOGIN_GOOGLE',
      `User ${user.name} authenticated via Google OAuth. Issued JWT Bearer Token.`,
      user,
      token.substring(0, 10) + '...',
      'info'
    );

    return res.json({
      token,
      tokenType: 'Bearer',
      expiresIn: config.TOKEN_EXPIRY_SECONDS,
      user,
      session
    });
  }

  /**
   * GET /api/auth/me
   * Verified user profile and active session for the supplied Bearer token.
   */
  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<any> {
    logSecurityEvent(
      'TOKEN_VERIFIED',
      `Verified Bearer token for ${req.user?.name} (${req.user?.role})`,
      req.user,
      undefined,
      'info'
    );
    return res.json({
      user: req.user,
      session: req.session,
      token: req.token
    });
  }

  /**
   * POST /api/auth/logout
   * Revokes current Bearer token and deletes session.
   */
  public static async logout(req: AuthenticatedRequest, res: Response): Promise<any> {
    if (req.token) {
      db.revokeToken(req.token);
    }
    if (req.session) {
      db.deleteSession(req.session.sessionId);
    }
    logSecurityEvent(
      'TOKEN_REVOKED',
      `Bearer token revoked on logout for user ${req.user?.email}`,
      req.user,
      undefined,
      'info'
    );
    return res.json({
      success: true,
      message: 'Logged out successfully. Bearer token revoked.'
    });
  }

  /**
   * GET /api/auth/sessions
   * List active sessions (Requires Admin or Doctor role).
   */
  public static async getSessions(_req: AuthenticatedRequest, res: Response): Promise<any> {
    const sessions = db.getAllSessions().map(s => ({
      ...s,
      tokenSnippet: s.token
        ? `${s.token.substring(0, 8)}...${s.token.substring(s.token.length - 6)}`
        : undefined,
      token: undefined // Don't leak raw secret token strings in list endpoint
    }));
    return res.json({ count: sessions.length, sessions });
  }

  /**
   * GET /api/auth/audit-logs
   * Retrieve immutable security audit trail.
   */
  public static async getAuditLogs(_req: Request, res: Response): Promise<any> {
    return res.json({ logs: db.getAuditLogs() });
  }

  /**
   * POST /api/auth/audit-logs
   * Record client-side security event.
   */
  public static async postAuditLog(req: Request, res: Response): Promise<any> {
    const { eventType, details, severity, user, tokenSnippet } = req.body;
    const log = logSecurityEvent(
      eventType || 'REST_API_CALL',
      details || 'Client security event',
      user,
      tokenSnippet,
      severity || 'info'
    );
    return res.status(201).json({ success: true, log });
  }
}
