import { AuthUser, AuthTokenResponse, SessionData, SecurityAuditLog, UserRole } from '../types/auth';
import { Department, Ticket, QueueEvent, UrgencyLevel, PatientQueueStatus } from '../types/queue';

const TOKEN_STORAGE_KEY = 'stjude_bearer_token';
const USER_STORAGE_KEY = 'stjude_auth_user';

class ApiClient {
  private token: string | null = null;
  private currentUser: AuthUser | null = null;
  private eventSource: EventSource | null = null;
  private eventListeners: Set<(event: QueueEvent) => void> = new Set();
  private authListeners: Set<() => void> = new Set();

  constructor() {
    this.restoreToken();
    this.initEventStream();
  }

  // --- Token Management ---

  private restoreToken() {
    if (typeof window === 'undefined') return;
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedToken) {
        this.token = storedToken;
      }
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
    } catch (e) {
      console.warn('Failed to restore token from localStorage', e);
    }
  }

  public setToken(token: string | null, user?: AuthUser | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        // Also mirror into cookie for standard browser compliance
        document.cookie = `hospital_token=${encodeURIComponent(token)};path=/;max-age=86400;SameSite=Lax`;
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        document.cookie = `hospital_token=;path=/;max-age=0;SameSite=Lax`;
      }

      if (user) {
        this.currentUser = user;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else if (token === null) {
        this.currentUser = null;
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    this.notifyAuth();
  }

  public getToken(): string | null {
    return this.token;
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  public isDoctor(): boolean {
    return !!this.currentUser && (this.currentUser.role === 'Doctor' || this.currentUser.role === 'Admin');
  }

  public isAdmin(): boolean {
    return !!this.currentUser && this.currentUser.role === 'Admin';
  }

  // --- Generic REST Request Wrapper with Bearer Token ---

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      if (response.status === 401 || response.status === 403) {
        // If unauthorized or forbidden because of token expiry
        if (this.token && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/signup') {
          console.warn('Authentication token expired or rejected by server.');
          this.setToken(null, null);
        }
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || `REST API error: ${response.statusText}`);
      }

      return data as T;
    } catch (err: any) {
      console.error(`REST API call failed [${options.method || 'GET'} ${endpoint}]:`, err.message);
      throw err;
    }
  }

  // --- REST Authentication Endpoints ---

  public async login(
    email: string,
    password?: string,
    role?: UserRole,
    departmentId?: string
  ): Promise<AuthTokenResponse> {
    const res = await this.request<AuthTokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, departmentId })
    });
    this.setToken(res.token, res.user);
    return res;
  }

  public async signup(payload: {
    name: string;
    email: string;
    password?: string;
    role?: UserRole;
    departmentId?: string;
  }): Promise<AuthTokenResponse> {
    const res = await this.request<AuthTokenResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.token, res.user);
    return res;
  }

  public async loginWithGoogle(payload?: {
    email: string;
    name: string;
    avatarUrl?: string;
    role?: UserRole;
    departmentId?: string;
  }): Promise<AuthTokenResponse> {
    const res = await this.request<AuthTokenResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload || { email: 'dr.jenkins@stjude-hospital.org', name: 'Dr. Sarah Jenkins' })
    });
    this.setToken(res.token, res.user);
    return res;
  }

  public async getMe(): Promise<{ user: AuthUser; session?: SessionData; token: string }> {
    const res = await this.request<{ user: AuthUser; session?: SessionData; token: string }>('/api/auth/me');
    if (res.user) {
      this.currentUser = res.user;
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
      }
    }
    return res;
  }

  public async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.request('/api/auth/logout', { method: 'POST' });
      }
    } finally {
      this.setToken(null, null);
    }
  }

  public async getSessions(): Promise<{ count: number; sessions: SessionData[] }> {
    return this.request<{ count: number; sessions: SessionData[] }>('/api/auth/sessions');
  }

  public async getAuditLogs(): Promise<{ logs: SecurityAuditLog[] }> {
    return this.request<{ logs: SecurityAuditLog[] }>('/api/auth/audit-logs');
  }

  public async postAuditLog(payload: Partial<SecurityAuditLog>): Promise<void> {
    await this.request('/api/auth/audit-logs', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        user: payload.userId ? undefined : this.currentUser || undefined,
        tokenSnippet: this.token ? `${this.token.substring(0, 8)}...` : undefined
      })
    }).catch(() => {});
  }

  // --- REST Hospital Queue Endpoints ---

  public async getDepartments(): Promise<Department[]> {
    const res = await this.request<any>('/api/departments');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.departments)) return res.departments;
    return [];
  }

  public async getOverview(): Promise<{
    timestamp: string;
    departments: Array<{
      department: Department;
      waitingQueue: Ticket[];
      inConsultation: Ticket | null;
      completedTickets: Ticket[];
      waitingCount: number;
      estimatedWaitMinutes: number;
    }>;
    recentEvents: QueueEvent[];
  }> {
    return this.request('/api/queue/overview');
  }

  public async getDepartmentQueue(deptId: string): Promise<{
    department: Department;
    waitingQueue: Ticket[];
    inConsultation: Ticket | null;
    completedTickets: Ticket[];
    waitingCount: number;
  }> {
    return this.request(`/api/queue/${deptId}`);
  }

  public async issueTicket(payload: {
    departmentId: string;
    patientName: string;
    urgency?: UrgencyLevel;
    hasAppointment?: boolean;
    linkedUserId?: string;
    linkedUserEmail?: string;
  }): Promise<{ ticket: Ticket; department: Department; queuePosition: number; estimatedWaitMinutes: number }> {
    return this.request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async getPatientQueueStatus(userId: string, email?: string): Promise<PatientQueueStatus> {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return this.request<PatientQueueStatus>(`/api/queue/patient/${encodeURIComponent(userId)}${query}`);
  }

  public async getTicket(code: string): Promise<{
    ticket: Ticket;
    department: Department;
    queuePosition: number;
    inConsultation: boolean;
  }> {
    return this.request(`/api/tickets/${encodeURIComponent(code)}`);
  }

  public async callNext(payload?: {
    departmentId?: string;
    doctorName?: string;
    roomNumber?: string;
  }): Promise<{ success: boolean; calledTicket: Ticket | null; message: string }> {
    return this.request('/api/doctor/call-next', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
  }

  public async completeConsultation(departmentId?: string, ticketId?: string): Promise<{ success: boolean; ticket: Ticket }> {
    return this.request('/api/doctor/complete-consultation', {
      method: 'POST',
      body: JSON.stringify({ departmentId, ticketId })
    });
  }

  public async recall(departmentId?: string): Promise<{ success: boolean; ticket: Ticket }> {
    return this.request('/api/doctor/recall', {
      method: 'POST',
      body: JSON.stringify({ departmentId })
    });
  }

  public async resetSimulation(): Promise<void> {
    await this.request('/api/simulation/reset', { method: 'POST' });
  }

  // --- Real-Time Server-Sent Events (SSE) Bus ---

  private initEventStream() {
    if (typeof window === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/events/stream');
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.ticketCode) {
            this.eventListeners.forEach(listener => listener(data));
          }
        } catch {
          // heartbeat or non-json message
        }
      };
      this.eventSource.onerror = () => {
        // Auto reconnect handled by browser EventSource
      };
    } catch (e) {
      console.warn('SSE stream init failed:', e);
    }
  }

  public onQueueEvent(callback: (event: QueueEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  // --- Subscriptions ---

  public subscribeAuth(callback: () => void): () => void {
    this.authListeners.add(callback);
    return () => this.authListeners.delete(callback);
  }

  private notifyAuth() {
    this.authListeners.forEach(cb => cb());
  }
}

export const apiClient = new ApiClient();
