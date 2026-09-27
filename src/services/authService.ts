import { AuthUser, UserRole, SessionData, SecurityAuditLog } from '../types/auth';
import { apiClient } from './apiClient';

const TOKEN_STORAGE_KEY = 'stjude_bearer_token';
const SESSION_COOKIE_NAME = 'hospital_session_token';
const SESSIONS_STORAGE_KEY = 'hospital_active_sessions_v1';
const USERS_STORAGE_KEY = 'hospital_registered_users_v1';
const AUDIT_STORAGE_KEY = 'hospital_security_audit_v1';
const SESSION_DURATION_HOURS = 24;

const DEFAULT_GOOGLE_USERS: AuthUser[] = [
  {
    id: 'usr-dr-jenkins',
    email: 'dr.jenkins@stjude-hospital.org',
    name: 'Dr. Sarah Jenkins, MD',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    role: 'Doctor',
    departmentId: 'cardiology',
    googleSub: 'google-sub-1029384756',
    provider: 'google',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'usr-dr-chen',
    email: 'dr.chen@stjude-hospital.org',
    name: 'Dr. Michael Chen, MD',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    role: 'Doctor',
    departmentId: 'emergency',
    googleSub: 'google-sub-2039485761',
    provider: 'google',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'usr-admin',
    email: 'admin.security@stjude-hospital.org',
    name: 'Administrator Elena Rostova',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'Admin',
    googleSub: 'google-sub-9988776655',
    provider: 'google',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    lastLoginAt: new Date().toISOString()
  }
];

class AuthService {
  private activeSessions: Map<string, SessionData> = new Map();
  private users: Map<string, AuthUser> = new Map();
  private auditLogs: SecurityAuditLog[] = [];
  private currentSession: SessionData | null = null;
  private currentToken: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initStorage();
    this.restoreSessionFromTokenOrCookie();
    this.syncFromRestApi();
  }

  // --- Cookie Helpers ---

  private setCookie(name: string, value: string, days: number) {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  private deleteCookie(name: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  }

  // --- Storage & Initialization ---

  private initStorage() {
    try {
      const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      if (storedToken) {
        this.currentToken = storedToken;
      }

      const storedUsers = typeof localStorage !== 'undefined' ? localStorage.getItem(USERS_STORAGE_KEY) : null;
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers) as AuthUser[];
        parsed.forEach(u => this.users.set(u.id, u));
      } else {
        DEFAULT_GOOGLE_USERS.forEach(u => this.users.set(u.id, u));
        this.saveUsers();
      }

      const storedSessions = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSIONS_STORAGE_KEY) : null;
      if (storedSessions) {
        const parsed = JSON.parse(storedSessions) as SessionData[];
        parsed.forEach(s => {
          if (new Date(s.expiresAt).getTime() > Date.now()) {
            this.activeSessions.set(s.sessionId, s);
          }
        });
      }

      const storedLogs = typeof localStorage !== 'undefined' ? localStorage.getItem(AUDIT_STORAGE_KEY) : null;
      if (storedLogs) {
        this.auditLogs = JSON.parse(storedLogs);
      }
    } catch (e) {
      console.warn('Auth storage init error:', e);
    }
  }

  private async syncFromRestApi() {
    try {
      if (this.currentToken) {
        const me = await apiClient.getMe();
        if (me && me.user) {
          if (this.currentSession) {
            this.currentSession.user = me.user;
          }
          this.notify();
        }
      }
      const remoteLogs = await apiClient.getAuditLogs();
      if (remoteLogs && remoteLogs.logs && remoteLogs.logs.length > 0) {
        this.auditLogs = remoteLogs.logs;
        this.notify();
      }
    } catch {
      // Offline fallback
    }
  }

  private saveUsers() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(Array.from(this.users.values())));
      }
    } catch (e) {
      console.warn('Save users failed', e);
    }
  }

  private saveSessions() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(Array.from(this.activeSessions.values())));
      }
    } catch (e) {
      console.warn('Save sessions failed', e);
    }
  }

  private saveAuditLogs() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.auditLogs.slice(0, 100)));
      }
    } catch (e) {
      console.warn('Save audit logs failed', e);
    }
  }

  public logAudit(
    eventType: SecurityAuditLog['eventType'],
    details: string,
    user?: AuthUser,
    severity: SecurityAuditLog['severity'] = 'info',
    tokenSnippet?: string
  ) {
    const entry: SecurityAuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      eventType,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      tokenSnippet: tokenSnippet || (this.currentToken ? `${this.currentToken.substring(0, 8)}...` : undefined),
      details,
      severity
    };
    this.auditLogs.unshift(entry);
    this.saveAuditLogs();

    // Async sync with backend REST API
    apiClient.postAuditLog(entry).catch(() => {});

    this.notify();
  }

  // --- Session Lifecycle with Token & Cookie Verification ---

  public restoreSessionFromTokenOrCookie(): SessionData | null {
    // 1. Check local token
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (token) {
      this.currentToken = token;
      // find in active sessions
      const existingSession = Array.from(this.activeSessions.values()).find(s => s.token === token);
      if (existingSession && new Date(existingSession.expiresAt).getTime() > Date.now()) {
        this.currentSession = existingSession;
        return existingSession;
      }
    }

    // 2. Fallback to cookie
    const cookieToken = this.getCookie(SESSION_COOKIE_NAME);
    if (!cookieToken) {
      this.currentSession = null;
      return null;
    }

    const session = this.activeSessions.get(cookieToken);
    if (!session) {
      this.deleteCookie(SESSION_COOKIE_NAME);
      this.currentSession = null;
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      this.activeSessions.delete(cookieToken);
      this.saveSessions();
      this.deleteCookie(SESSION_COOKIE_NAME);
      this.currentSession = null;
      this.logAudit('SESSION_EXPIRED', `Session ${cookieToken.substring(0, 10)}... expired automatically.`, session.user, 'warning');
      return null;
    }

    this.currentSession = session;
    return session;
  }

  private createLocalSession(user: AuthUser, token?: string): SessionData {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_HOURS * 3600 * 1000);
    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const resolvedToken = token || 'tok_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const sessionData: SessionData = {
      sessionId,
      token: resolvedToken,
      user,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser Client',
      ipAddress: '127.0.0.1 (Verified Gateway)'
    };

    this.activeSessions.set(sessionId, sessionData);
    this.saveSessions();

    this.setCookie(SESSION_COOKIE_NAME, sessionId, 1);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, resolvedToken);
    }
    this.currentToken = resolvedToken;
    this.currentSession = sessionData;

    this.notify();
    return sessionData;
  }

  // --- REST API Authentication with Bearer Tokens ---

  public async loginWithGoogle(emailOrProfile?: {
    email: string;
    name: string;
    avatarUrl?: string;
    role?: UserRole;
    departmentId?: string;
  }): Promise<SessionData> {
    try {
      // 1. Try real REST API endpoint
      const response = await apiClient.loginWithGoogle(emailOrProfile);
      this.currentToken = response.token;
      this.currentSession = response.session;
      this.activeSessions.set(response.session.sessionId, response.session);
      this.saveSessions();
      this.setCookie(SESSION_COOKIE_NAME, response.session.sessionId, 1);
      this.logAudit(
        'TOKEN_ISSUED',
        `Authenticated via REST API. Received JWT Bearer Token for ${response.user.name} [${response.user.role}]`,
        response.user,
        'info',
        response.token.substring(0, 8) + '...'
      );
      this.notify();
      return response.session;
    } catch {
      // Fallback to local session generation
      const email = emailOrProfile?.email || 'dr.jenkins@stjude-hospital.org';
      let user = Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        const role: UserRole = emailOrProfile?.role || (email.includes('dr.') ? 'Doctor' : 'Patient');
        user = {
          id: 'usr-g-' + Date.now(),
          email,
          name: emailOrProfile?.name || email.split('@')[0],
          avatarUrl: emailOrProfile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
          role,
          departmentId: emailOrProfile?.departmentId || (role === 'Doctor' ? 'cardiology' : undefined),
          googleSub: 'google-oauth-sub-' + Math.random().toString(36).substring(2, 10),
          provider: 'google',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        this.users.set(user.id, user);
        this.saveUsers();
        this.logAudit('SIGNUP_GOOGLE', `New user registered via Google OAuth: ${user.name} (${user.email}) as [${user.role}]`, user);
      } else {
        user.lastLoginAt = new Date().toISOString();
        if (emailOrProfile?.role && emailOrProfile.role !== user.role) {
          user.role = emailOrProfile.role;
        }
        this.saveUsers();
        this.logAudit('LOGIN_GOOGLE', `Successful Google OAuth login: ${user.name} (${user.email}) [${user.role}]. Token session issued.`, user);
      }

      return this.createLocalSession(user);
    }
  }

  public async signupWithGoogle(role: UserRole, departmentId?: string): Promise<SessionData> {
    const randomSeed = Math.floor(Math.random() * 1000);
    const demoEmail = role === 'Doctor'
      ? `doctor.${randomSeed}@stjude-hospital.org`
      : role === 'Nurse'
      ? `nurse.${randomSeed}@stjude-hospital.org`
      : `patient.${randomSeed}@gmail.com`;

    const demoName = role === 'Doctor'
      ? `Dr. Alex Taylor, MD`
      : role === 'Nurse'
      ? `Nurse Jordan Reed, RN`
      : `Patient Sam Morgan`;

    return this.loginWithGoogle({
      email: demoEmail,
      name: demoName,
      role,
      departmentId: departmentId || (role === 'Doctor' ? 'cardiology' : undefined)
    });
  }

  public async loginWithPassword(
    email: string,
    password?: string,
    role?: UserRole,
    departmentId?: string
  ): Promise<SessionData> {
    try {
      const response = await apiClient.login(email, password, role, departmentId);
      this.currentToken = response.token;
      this.currentSession = response.session;
      this.activeSessions.set(response.session.sessionId, response.session);
      this.saveSessions();
      this.setCookie(SESSION_COOKIE_NAME, response.session.sessionId, 1);
      this.logAudit('LOGIN_PASSWORD', `Logged in via REST API: ${response.user.name} (${response.user.email})`, response.user);
      this.notify();
      return response.session;
    } catch (err: any) {
      // If error from backend (such as invalid password or non-existent user), rethrow it so form shows message
      if (err.message && (err.message.includes('password') || err.message.includes('Unauthorized') || err.message.includes('Invalid'))) {
        throw err;
      }

      // Offline / fallback behavior
      let user = Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        user = {
          id: 'usr-pwd-' + Date.now(),
          email,
          name: email.split('@')[0],
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
          role: role || (email.includes('dr.') ? 'Doctor' : 'Patient'),
          departmentId: departmentId || (role === 'Doctor' ? 'cardiology' : undefined),
          provider: 'password',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        this.users.set(user.id, user);
        this.saveUsers();
      }
      return this.createLocalSession(user);
    }
  }

  public async signupWithPassword(
    name: string,
    email: string,
    password: string,
    role: UserRole = 'Patient',
    departmentId?: string
  ): Promise<SessionData> {
    try {
      const response = await apiClient.signup({
        name,
        email,
        password,
        role,
        departmentId: role === 'Doctor' ? departmentId || 'cardiology' : departmentId
      });
      this.currentToken = response.token;
      this.currentSession = response.session;
      this.activeSessions.set(response.session.sessionId, response.session);
      this.saveSessions();
      this.setCookie(SESSION_COOKIE_NAME, response.session.sessionId, 1);
      this.logAudit('SIGNUP_GOOGLE', `New user registered via standard signup: ${response.user.name} (${response.user.email})`, response.user);
      this.notify();
      return response.session;
    } catch (err: any) {
      if (err.message && (err.message.includes('exists') || err.message.includes('Password') || err.message.includes('Conflict'))) {
        throw err;
      }

      // Offline fallback
      const cleanEmail = email.toLowerCase().trim();
      const user: AuthUser = {
        id: 'usr-reg-' + Date.now(),
        email: cleanEmail,
        name: name.trim(),
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
        role,
        departmentId: role === 'Doctor' ? departmentId || 'cardiology' : undefined,
        provider: 'password',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      this.users.set(user.id, user);
      this.saveUsers();
      return this.createLocalSession(user);
    }
  }

  public async logout(): Promise<void> {
    const currentUsr = this.currentSession?.user;
    try {
      await apiClient.logout();
    } catch {
      // continue local cleanup
    }

    const token = this.getCookie(SESSION_COOKIE_NAME);
    if (token) {
      this.activeSessions.delete(token);
      this.saveSessions();
      this.deleteCookie(SESSION_COOKIE_NAME);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    this.currentToken = null;
    this.currentSession = null;
    apiClient.setToken(null, null);

    if (currentUsr) {
      this.logAudit('TOKEN_REVOKED', `Bearer token revoked on logout for user ${currentUsr.email}`, currentUsr);
    }
    this.notify();
  }

  public switchRole(role: UserRole) {
    if (this.currentSession) {
      this.currentSession.user.role = role;
      if (role === 'Doctor' && !this.currentSession.user.departmentId) {
        this.currentSession.user.departmentId = 'cardiology';
      }
      this.saveUsers();
      this.saveSessions();
      this.logAudit('TOKEN_ISSUED', `Role updated to [${role}] for ${this.currentSession.user.name}. New token claims mapped.`, this.currentSession.user);
      this.notify();
    }
  }

  public recordUnauthorizedAttempt(resource: string) {
    this.logAudit(
      'UNAUTHORIZED_ACCESS',
      `REST API 403 Forbidden: Blocked access to [${resource}]. Requires Doctor or Admin privileges.`,
      this.currentSession?.user,
      'security_alert'
    );
  }

  // --- Getters & Status Checks ---

  public getCurrentUser(): AuthUser | null {
    return this.currentSession?.user || apiClient.getCurrentUser();
  }

  public getSession(): SessionData | null {
    return this.currentSession;
  }

  public getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  public getToken(): string | null {
    return this.currentToken || apiClient.getToken();
  }

  public getBearerHeader(): string | null {
    const token = this.getToken();
    return token ? `Bearer ${token}` : null;
  }

  public isAuthenticated(): boolean {
    return !!this.currentToken || (!!this.currentSession && new Date(this.currentSession.expiresAt).getTime() > Date.now());
  }

  public isDoctor(): boolean {
    const user = this.getCurrentUser();
    return !!user && (user.role === 'Doctor' || user.role === 'Admin');
  }

  public isAdmin(): boolean {
    const user = this.getCurrentUser();
    return !!user && user.role === 'Admin';
  }

  public getCookieToken(): string | null {
    return this.getCookie(SESSION_COOKIE_NAME) || this.currentToken;
  }

  public getActiveSessions(): SessionData[] {
    return Array.from(this.activeSessions.values());
  }

  public getAuditLogs(): SecurityAuditLog[] {
    return [...this.auditLogs];
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }
}

export const authService = new AuthService();
