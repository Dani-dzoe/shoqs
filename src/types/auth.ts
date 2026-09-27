export type UserRole = 'Doctor' | 'Nurse' | 'Admin' | 'Patient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: UserRole;
  departmentId?: string;
  googleSub?: string;
  provider: 'google' | 'password';
  createdAt: string;
  lastLoginAt: string;
}

export interface SessionData {
  sessionId: string;
  token?: string;
  user: AuthUser;
  createdAt: string;
  expiresAt: string;
  userAgent: string;
  ipAddress: string;
}

export interface AuthTokenResponse {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number; // in seconds
  user: AuthUser;
  session: SessionData;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  role?: UserRole;
  departmentId?: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
  departmentId?: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  eventType: 
    | 'LOGIN_GOOGLE' 
    | 'LOGIN_PASSWORD' 
    | 'SIGNUP_GOOGLE' 
    | 'LOGOUT' 
    | 'UNAUTHORIZED_ACCESS' 
    | 'SESSION_EXPIRED'
    | 'TOKEN_ISSUED'
    | 'TOKEN_VERIFIED'
    | 'TOKEN_REVOKED'
    | 'REST_API_CALL';
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  tokenSnippet?: string;
  details: string;
  severity: 'info' | 'warning' | 'security_alert';
}
