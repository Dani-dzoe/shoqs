export const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  JWT_SECRET: process.env.JWT_SECRET || 'stjude-hospital-secure-jwt-token-secret-2026',
  TOKEN_EXPIRY_SECONDS: 86400, // 24 hours
  DEFAULT_SESSION_TIMEOUT_HOURS: 24,
  MAX_AUDIT_LOG_ITEMS: 300,
  MAX_EVENT_HISTORY_ITEMS: 100
};
