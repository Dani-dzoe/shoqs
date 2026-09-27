import crypto from 'crypto';
import { AuthUser, SessionData, SecurityAuditLog } from '../models/User.js';
import { Ticket, UrgencyLevel } from '../models/Ticket.js';
import { Department, QueueEvent } from '../models/Department.js';
import { config } from '../config/index.js';

export interface StoredCredential {
  hash: string;
  salt: string;
}

export class Database {
  private static instance: Database;

  public departments: Department[] = [];
  public users: Map<string, AuthUser> = new Map();
  public userCredentials: Map<string, StoredCredential> = new Map();
  public activeSessions: Map<string, SessionData> = new Map();
  public revokedTokens: Set<string> = new Set();
  public auditLogs: SecurityAuditLog[] = [];
  public tickets: Ticket[] = [];
  public events: QueueEvent[] = [];

  private constructor() {
    this.seedDefaultDepartments();
    this.seedDefaultUsers();
    this.seedInitialTickets();
    this.addAuditLog(
      'TOKEN_ISSUED',
      'Hospital Database initialized with pre-seeded departments and clinicians',
      undefined,
      undefined,
      'info'
    );
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // --- SEEDERS ---

  private seedDefaultDepartments(): void {
    this.departments = [
      {
        id: 'cardiology',
        name: 'Cardiology Clinic',
        prefix: 'CARD',
        description: 'Heart health, ECG, echocardiograms & cardiovascular triage',
        lastSequenceNumber: 104
      },
      {
        id: 'pediatrics',
        name: 'Pediatrics Ward',
        prefix: 'PEDS',
        description: 'Infant, child, and adolescent healthcare & immunizations',
        lastSequenceNumber: 203
      },
      {
        id: 'general-opd',
        name: 'General Outpatient (OPD)',
        prefix: 'OPD',
        description: 'Adult medicine, health screenings, preventative consultations',
        lastSequenceNumber: 304
      },
      {
        id: 'emergency',
        name: 'Emergency / Triage (ER)',
        prefix: 'ER',
        description: 'Acute trauma, severe symptoms & emergency stabilization',
        lastSequenceNumber: 902
      }
    ];
  }

  private seedDefaultUsers(): void {
    this.users.set('dr.jenkins@stjude-hospital.org', {
      id: 'usr-dr-jenkins',
      email: 'dr.jenkins@stjude-hospital.org',
      name: 'Dr. Sarah Jenkins, MD',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
      role: 'Doctor',
      departmentId: 'cardiology',
      provider: 'google',
      googleSub: 'google-sub-1029384756',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      lastLoginAt: new Date().toISOString()
    });

    this.users.set('dr.chen@stjude-hospital.org', {
      id: 'usr-dr-chen',
      email: 'dr.chen@stjude-hospital.org',
      name: 'Dr. Michael Chen, MD',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
      role: 'Doctor',
      departmentId: 'emergency',
      provider: 'google',
      googleSub: 'google-sub-2039485761',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      lastLoginAt: new Date().toISOString()
    });

    this.users.set('admin.security@stjude-hospital.org', {
      id: 'usr-admin',
      email: 'admin.security@stjude-hospital.org',
      name: 'Elena Rostova, Chief Security Officer',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      role: 'Admin',
      provider: 'google',
      googleSub: 'google-sub-9988776655',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      lastLoginAt: new Date().toISOString()
    });

    this.users.set('patient.rigby@gmail.com', {
      id: 'usr-patient-rigby',
      email: 'patient.rigby@gmail.com',
      name: 'Eleanor Rigby',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Eleanor%20Rigby',
      role: 'Patient',
      provider: 'password',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      lastLoginAt: new Date().toISOString()
    });

    // Seed default credentials for clinical and administrative staff
    this.setUserPassword('dr.jenkins@stjude-hospital.org', 'Doctor123!');
    this.setUserPassword('dr.chen@stjude-hospital.org', 'Doctor123!');
    this.setUserPassword('admin.security@stjude-hospital.org', 'Admin123!');
    this.setUserPassword('patient.rigby@gmail.com', 'Password123!');
  }

  public seedInitialTickets(): void {
    const now = Date.now();
    this.tickets = [
      {
        id: 't-100',
        departmentId: 'cardiology',
        ticketCode: 'CARD-100',
        patientName: 'Robert Vance',
        urgency: UrgencyLevel.Priority,
        hasAppointment: true,
        status: 'InConsultation',
        createdAt: new Date(now - 35 * 60000).toISOString(),
        calledAt: new Date(now - 8 * 60000).toISOString(),
        consultationStartedAt: new Date(now - 8 * 60000).toISOString(),
        roomNumber: 'Room 302',
        doctorName: 'Dr. Sarah Jenkins',
        estimatedWaitMinutes: 0,
        priorityScore: 82.5,
        waitTimeMinutes: 27
      },
      {
        id: 't-101',
        departmentId: 'cardiology',
        ticketCode: 'CARD-101',
        patientName: 'Eleanor Rigby',
        urgency: UrgencyLevel.Urgent,
        hasAppointment: true,
        status: 'Waiting',
        createdAt: new Date(now - 22 * 60000).toISOString(),
        estimatedWaitMinutes: 12,
        priorityScore: 93.0,
        waitTimeMinutes: 22,
        linkedUserId: 'usr-patient-rigby',
        linkedUserEmail: 'patient.rigby@gmail.com'
      },
      {
        id: 't-102',
        departmentId: 'cardiology',
        ticketCode: 'CARD-102',
        patientName: 'Marcus Miller',
        urgency: UrgencyLevel.Priority,
        hasAppointment: true,
        status: 'Waiting',
        createdAt: new Date(now - 14 * 60000).toISOString(),
        estimatedWaitMinutes: 24,
        priorityScore: 54.0,
        waitTimeMinutes: 14
      },
      {
        id: 't-103',
        departmentId: 'cardiology',
        ticketCode: 'CARD-103',
        patientName: 'Sophia Turner',
        urgency: UrgencyLevel.Routine,
        hasAppointment: true,
        status: 'Waiting',
        createdAt: new Date(now - 8 * 60000).toISOString(),
        estimatedWaitMinutes: 36,
        priorityScore: 38.0,
        waitTimeMinutes: 8
      },
      {
        id: 't-200',
        departmentId: 'pediatrics',
        ticketCode: 'PEDS-200',
        patientName: 'Liam Carter (Infant)',
        urgency: UrgencyLevel.Routine,
        hasAppointment: true,
        status: 'InConsultation',
        createdAt: new Date(now - 25 * 60000).toISOString(),
        calledAt: new Date(now - 5 * 60000).toISOString(),
        consultationStartedAt: new Date(now - 5 * 60000).toISOString(),
        roomNumber: 'Room 105',
        doctorName: 'Dr. Emily Watson',
        estimatedWaitMinutes: 0,
        priorityScore: 65.0,
        waitTimeMinutes: 20
      },
      {
        id: 't-201',
        departmentId: 'pediatrics',
        ticketCode: 'PEDS-201',
        patientName: 'Oliver Harris',
        urgency: UrgencyLevel.Priority,
        hasAppointment: false,
        status: 'Waiting',
        createdAt: new Date(now - 16 * 60000).toISOString(),
        estimatedWaitMinutes: 15,
        priorityScore: 48.0,
        waitTimeMinutes: 16
      },
      {
        id: 't-301',
        departmentId: 'general-opd',
        ticketCode: 'OPD-301',
        patientName: 'Grace Hopper',
        urgency: UrgencyLevel.Routine,
        hasAppointment: true,
        status: 'Waiting',
        createdAt: new Date(now - 19 * 60000).toISOString(),
        estimatedWaitMinutes: 10,
        priorityScore: 49.0,
        waitTimeMinutes: 19
      },
      {
        id: 't-901',
        departmentId: 'emergency',
        ticketCode: 'ER-901',
        patientName: 'John Doe (Trauma)',
        urgency: UrgencyLevel.Emergency,
        hasAppointment: false,
        status: 'InConsultation',
        createdAt: new Date(now - 15 * 60000).toISOString(),
        calledAt: new Date(now - 12 * 60000).toISOString(),
        consultationStartedAt: new Date(now - 12 * 60000).toISOString(),
        roomNumber: 'Trauma Bay 1',
        doctorName: 'Dr. Michael Chen',
        estimatedWaitMinutes: 0,
        priorityScore: 1000.0,
        waitTimeMinutes: 3
      }
    ];
  }

  // --- USER & AUTHENTICATION OPERATIONS ---

  public static hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  }

  public setUserPassword(email: string, password: string): void {
    const cleanEmail = email.toLowerCase().trim();
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = Database.hashPassword(password, salt);
    this.userCredentials.set(cleanEmail, { hash, salt });

    const user = this.users.get(cleanEmail);
    if (user) {
      user.passwordHash = hash;
      user.passwordSalt = salt;
    }
  }

  public verifyUserPassword(email: string, password: string): boolean {
    const cleanEmail = email.toLowerCase().trim();
    const cred = this.userCredentials.get(cleanEmail);
    if (!cred) {
      // Allow fallback demo passwords for pre-seeded test accounts
      if (cleanEmail === 'dr.jenkins@stjude-hospital.org' || cleanEmail === 'dr.chen@stjude-hospital.org') {
        return password === 'Doctor123!' || password === 'Password123!';
      }
      if (cleanEmail === 'admin.security@stjude-hospital.org') {
        return password === 'Admin123!' || password === 'Password123!';
      }
      return false;
    }

    const testHash = Database.hashPassword(password, cred.salt);
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(cred.hash, 'hex'));
  }

  public getUserByEmail(email: string): AuthUser | undefined {
    return this.users.get(email.toLowerCase().trim());
  }

  public saveUser(user: AuthUser): void {
    this.users.set(user.email.toLowerCase().trim(), user);
  }

  public createUserWithPassword(
    name: string,
    email: string,
    password: string,
    role: AuthUser['role'] = 'Patient',
    departmentId?: string
  ): AuthUser {
    const cleanEmail = email.toLowerCase().trim();
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = Database.hashPassword(password, salt);
    this.userCredentials.set(cleanEmail, { hash, salt });

    const user: AuthUser = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      name: name.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
      role,
      departmentId: departmentId || (role === 'Doctor' ? 'cardiology' : undefined),
      provider: 'password',
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    this.users.set(cleanEmail, user);
    return user;
  }

  public getUserById(id: string): AuthUser | undefined {
    for (const user of this.users.values()) {
      if (user.id === id) return user;
    }
    return undefined;
  }

  // --- SESSIONS & TOKEN BLACKLIST ---

  public saveSession(session: SessionData): void {
    this.activeSessions.set(session.sessionId, session);
  }

  public getSession(sessionId: string): SessionData | undefined {
    return this.activeSessions.get(sessionId);
  }

  public deleteSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  public getAllSessions(): SessionData[] {
    return Array.from(this.activeSessions.values());
  }

  public revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  public isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  // --- AUDIT LOGS ---

  public addAuditLog(
    eventType: SecurityAuditLog['eventType'],
    details: string,
    user?: AuthUser,
    tokenSnippet?: string,
    severity: SecurityAuditLog['severity'] = 'info'
  ): SecurityAuditLog {
    const log: SecurityAuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      eventType,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      tokenSnippet,
      details,
      severity
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > config.MAX_AUDIT_LOG_ITEMS) {
      this.auditLogs.pop();
    }
    return log;
  }

  public getAuditLogs(): SecurityAuditLog[] {
    return this.auditLogs;
  }

  // --- DEPARTMENT OPERATIONS ---

  public getDepartments(): Department[] {
    return this.departments;
  }

  public getDepartmentById(id: string): Department | undefined {
    return this.departments.find(d => d.id === id);
  }

  public incrementDepartmentSequence(id: string): number {
    const dept = this.getDepartmentById(id);
    if (!dept) throw new Error(`Department ${id} not found`);
    dept.lastSequenceNumber += 1;
    return dept.lastSequenceNumber;
  }

  // --- TICKET OPERATIONS ---

  public getAllTickets(): Ticket[] {
    return this.tickets;
  }

  public getTicketsByDepartment(deptId: string): Ticket[] {
    return this.tickets.filter(t => t.departmentId === deptId);
  }

  public getTicketByCode(code: string): Ticket | undefined {
    const target = code.trim().toUpperCase();
    return this.tickets.find(t => t.ticketCode.toUpperCase() === target);
  }

  public getTicketById(id: string): Ticket | undefined {
    return this.tickets.find(t => t.id === id);
  }

  public addTicket(ticket: Ticket): void {
    this.tickets.push(ticket);
  }

  // --- EVENT OPERATIONS ---

  public addEvent(event: QueueEvent): void {
    this.events.unshift(event);
    if (this.events.length > config.MAX_EVENT_HISTORY_ITEMS) {
      this.events.pop();
    }
  }

  public getRecentEvents(limit = 15): QueueEvent[] {
    return this.events.slice(0, limit);
  }
}

export const db = Database.getInstance();
