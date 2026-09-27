export type UserRole = 'Doctor' | 'Nurse' | 'Admin' | 'Patient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: UserRole;
  departmentId?: string;
  provider: 'google' | 'password';
  googleSub?: string;
  passwordHash?: string;
  passwordSalt?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface LoginBody {
  email: string;
  password?: string;
  role?: UserRole;
  departmentId?: string;
}

export interface SignupBody {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
  departmentId?: string;
}

export interface SessionData {
  sessionId: string;
  token: string;
  user: AuthUser;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  eventType:
    | 'LOGIN_GOOGLE'
    | 'LOGIN_PASSWORD'
    | 'SIGNUP_GOOGLE'
    | 'TOKEN_ISSUED'
    | 'TOKEN_VERIFIED'
    | 'TOKEN_REVOKED'
    | 'UNAUTHORIZED_ACCESS'
    | 'ROLE_SWITCH'
    | 'REST_API_CALL';
  userId?: string;
  userEmail?: string;
  userRole?: string;
  tokenSnippet?: string;
  details: string;
  severity: 'info' | 'warning' | 'security_alert';
}

export function createDefaultUser(
  email: string,
  name?: string,
  role: UserRole = 'Patient',
  departmentId?: string,
  provider: 'google' | 'password' = 'password'
): AuthUser {
  const cleanEmail = email.toLowerCase().trim();
  const userName = name?.trim() || cleanEmail.split('@')[0].replace('.', ' ');

  return {
    id: 'usr-' + Math.random().toString(36).substring(2, 9),
    email: cleanEmail,
    name: userName,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
    role,
    departmentId: departmentId || (role === 'Doctor' ? 'cardiology' : undefined),
    provider,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
}
