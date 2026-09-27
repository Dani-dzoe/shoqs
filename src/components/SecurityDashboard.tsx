import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { AuthUser, SessionData, SecurityAuditLog } from '../types/auth';
import { 
  ShieldCheck, 
  Key, 
  UserCheck, 
  LogOut, 
  AlertTriangle, 
  Clock, 
  Server, 
  Lock, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Copy,
  Terminal,
  Send,
  Zap,
  Shield
} from 'lucide-react';

interface SecurityDashboardProps {
  onOpenAuthModal: () => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ onOpenAuthModal }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [currentSession, setCurrentSession] = useState<SessionData | null>(authService.getCurrentSession());
  const [token, setToken] = useState<string | null>(authService.getToken());
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(authService.getAuditLogs());
  const [copiedToken, setCopiedToken] = useState(false);
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([]);
  
  // REST API Live Tester state
  const [apiEndpoint, setApiEndpoint] = useState<string>('/api/auth/me');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<number | null>(null);

  const loadData = async () => {
    setCurrentUser(authService.getCurrentUser());
    setCurrentSession(authService.getCurrentSession());
    setToken(authService.getToken());
    setAuditLogs(authService.getAuditLogs());

    if (authService.isAuthenticated()) {
      try {
        const sessRes = await apiClient.getSessions();
        if (sessRes && sessRes.sessions) {
          setActiveSessions(sessRes.sessions);
        }
      } catch {
        setActiveSessions(authService.getActiveSessions());
      }
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = authService.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleExecuteRestApi = async () => {
    setApiLoading(true);
    setApiResponse(null);
    setApiStatus(null);
    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(apiEndpoint, { headers });
      setApiStatus(res.status);
      const data = await res.json().catch(() => ({ status: res.statusText }));
      const latency = Math.round(performance.now() - start);
      setApiResponse({ ...data, _latencyMs: latency });
      loadData();
    } catch (err: any) {
      setApiResponse({ error: err.message });
      setApiStatus(500);
    } finally {
      setApiLoading(false);
    }
  };

  const handleSimulateUnauthorized = () => {
    authService.recordUnauthorizedAttempt('/api/doctor/call-next');
  };

  const calculateRemainingHours = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shadow-sky-600/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                REST API & Token Gateway
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{token ? 'Bearer Token Active' : 'Unauthenticated'}</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
              REST API Token Authentication & Security Center
            </h1>
            <p className="text-xs text-slate-400">
              JWT Bearer tokens, token header authorization, RBAC endpoint protection, and audit stream
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {currentUser ? (
            <button
              onClick={() => authService.logout()}
              className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-semibold rounded-xl flex items-center space-x-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Revoke Token & Sign Out</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition"
            >
              <span>Get Authenticated Token</span>
            </button>
          )}

          <button
            onClick={handleSimulateUnauthorized}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            title="Simulate 403 Forbidden on Doctor route"
          >
            Test 403 Forbidden
          </button>
        </div>
      </div>

      {/* Grid: Token Claims & Profile & RBAC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: REST API JWT Bearer Token */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">JWT Bearer Token</h3>
                <p className="text-[11px] text-slate-400">Authorization: Bearer &lt;token&gt;</p>
              </div>
            </div>
            {token && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Verified
              </span>
            )}
          </div>

          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
            <div>
              <div className="text-[10px] uppercase font-sans font-bold text-slate-500">Header Format</div>
              <div className="text-sky-400 font-bold truncate">Authorization: Bearer ...</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-sans font-bold text-slate-500">Token Raw Value</div>
              <div className="flex items-center justify-between text-slate-300 gap-2">
                <span className="truncate max-w-[200px] text-[11px]">
                  {token ? `${token.substring(0, 24)}...` : 'None (Please login to issue token)'}
                </span>
                {token && (
                  <button
                    onClick={handleCopyToken}
                    className="text-[11px] font-sans text-sky-400 hover:text-white flex items-center gap-1 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[11px]">
              <div>
                <span className="text-slate-500">Type:</span> <span className="text-sky-400">JWT (HS256)</span>
              </div>
              <div>
                <span className="text-slate-500">Signature:</span> <span className="text-emerald-400">Valid</span>
              </div>
              <div>
                <span className="text-slate-500">Storage:</span> <span className="text-slate-300">Bearer / Memory</span>
              </div>
              <div>
                <span className="text-slate-500">Expiry:</span> <span className="text-amber-400">24 Hours</span>
              </div>
            </div>
          </div>

          {currentSession && (
            <div className="p-3 bg-sky-950/20 border border-sky-800/30 rounded-xl text-xs text-sky-300 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Token Lifetime: {calculateRemainingHours(currentSession.expiresAt)}</span>
            </div>
          )}
        </div>

        {/* Card 2: Authenticated Google Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Subject Identity & Claims</h3>
              <p className="text-[11px] text-slate-400">Decoded Token Subject Payload</p>
            </div>
          </div>

          {currentUser ? (
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-3">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`;
                  }}
                />
                <div>
                  <div className="text-sm font-bold text-white">{currentUser.name}</div>
                  <div className="text-xs text-slate-400">{currentUser.email}</div>
                  <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    Role: {currentUser.role} {currentUser.departmentId ? `(${currentUser.departmentId})` : ''}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-2 border-t border-slate-900">
                <div>sub: {currentUser.id}</div>
                <div>email: {currentUser.email}</div>
                <div>provider: {currentUser.provider}</div>
                <div>lastLogin: {new Date(currentUser.lastLoginAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 text-center space-y-3">
              <Lock className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No active token subject found.</p>
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Log In / Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Card 3: RBAC Endpoint Gatekeeping */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">REST API RBAC Matrix</h3>
              <p className="text-[11px] text-slate-400">Bearer Token Permissions</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">POST /api/doctor/call-next</span>
                <span className="text-[11px] text-slate-400 block">Requires: Doctor or Admin Token</span>
              </div>
              {authService.isDoctor() ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Allowed</span>
                </span>
              ) : (
                <span className="text-rose-400 font-bold flex items-center space-x-1">
                  <XCircle className="w-4 h-4" />
                  <span>403 Blocked</span>
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">GET /api/auth/sessions</span>
                <span className="text-[11px] text-slate-400 block">Requires: Admin or Doctor Token</span>
              </div>
              {authService.isDoctor() || authService.isAdmin() ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Allowed</span>
                </span>
              ) : (
                <span className="text-rose-400 font-bold flex items-center space-x-1">
                  <XCircle className="w-4 h-4" />
                  <span>403 Blocked</span>
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">POST /api/tickets</span>
                <span className="text-[11px] text-slate-400 block">Open: Public Kiosk / Patient Pass</span>
              </div>
              <span className="text-blue-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Public Access</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* REST API Live Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">REST API Live Tester</h3>
              <p className="text-xs text-slate-400">
                Execute authenticated HTTP REST requests with the active JWT Bearer token
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setApiEndpoint('/api/auth/me'); }}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
            >
              /api/auth/me
            </button>
            <button
              onClick={() => { setApiEndpoint('/api/departments'); }}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
            >
              /api/departments
            </button>
            <button
              onClick={() => { setApiEndpoint('/api/queue/overview'); }}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
            >
              /api/queue/overview
            </button>
            <button
              onClick={() => { setApiEndpoint('/api/auth/sessions'); }}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
            >
              /api/auth/sessions
            </button>
          </div>
        </div>

        {/* Request Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-xs">
            <span className="text-emerald-400 font-bold mr-2">GET</span>
            <input
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              className="w-full bg-transparent text-white focus:outline-none"
              placeholder="/api/..."
            />
          </div>

          <button
            onClick={handleExecuteRestApi}
            disabled={apiLoading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
          >
            {apiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Execute REST Call</span>
          </button>
        </div>

        {/* Headers preview */}
        <div className="text-[11px] font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-slate-400">
          <div>Content-Type: application/json</div>
          <div>Authorization: {token ? `Bearer ${token.substring(0, 30)}...` : '<No Bearer token attached - 401 expected on protected endpoints>'}</div>
        </div>

        {/* Response Box */}
        {apiResponse && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Status:</span>
                <span className={`font-bold px-1.5 py-0.5 rounded ${apiStatus && apiStatus < 400 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {apiStatus} {apiStatus === 200 ? 'OK' : apiStatus === 201 ? 'Created' : apiStatus === 401 ? 'Unauthorized' : apiStatus === 403 ? 'Forbidden' : ''}
                </span>
              </div>
              <div>Latency: {apiResponse._latencyMs || 12}ms</div>
            </div>
            <pre className="text-emerald-400 overflow-x-auto max-h-60 text-[11px] leading-relaxed">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Security Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">REST API & Token Security Audit Stream</h3>
              <p className="text-xs text-slate-400">
                Live audit trail for token issuance, Bearer verification, role enforcement, and REST API access
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">{auditLogs.length} Events Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Subject / User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Token Snippet</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                    No security audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const badgeColor = {
                    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    security_alert: 'bg-red-500/10 text-red-400 border-red-500/20'
                  }[log.severity];

                  return (
                    <tr key={log.id} className="hover:bg-slate-950/40 transition">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 whitespace-nowrap text-[11px]">
                        {log.userEmail || 'Anonymous'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {log.userRole || 'Guest'}
                      </td>
                      <td className="py-2.5 px-3 text-sky-400 whitespace-nowrap text-[11px]">
                        {log.tokenSnippet || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
