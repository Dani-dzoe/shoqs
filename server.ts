import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const CSHARP_PORT = 5050;
const CSHARP_TARGET = `http://127.0.0.1:${CSHARP_PORT}`;

let csharpProcess: ChildProcess | null = null;
let isCSharpRunning = false;

// Safe check & launch for C# ASP.NET Core Backend
function tryStartCSharpBackend(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      console.log(`[Backend] Detecting .NET runtime environment...`);
      const proc = spawn('dotnet', ['run', '--project', 'Backend/HospitalQueue.csproj', '--urls', CSHARP_TARGET], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ASPNETCORE_URLS: CSHARP_TARGET,
          ASPNETCORE_ENVIRONMENT: 'Production',
          DOTNET_CLI_TELEMETRY_OPTOUT: '1'
        }
      });

      csharpProcess = proc;

      // CRITICAL: Handle error event immediately to prevent unhandled ENOENT in Cloud Run container
      proc.on('error', (err: any) => {
        console.warn(`[Backend] .NET SDK not present in environment (${err.code || err.message}). Switching to native high-performance engine.`);
        isCSharpRunning = false;
        csharpProcess = null;
        resolve(false);
      });

      let resolved = false;

      proc.stdout?.on('data', (data) => {
        const msg = data.toString();
        process.stdout.write(`[C# ASP.NET Core] ${msg}`);
        if (!resolved && (msg.includes('Now listening on') || msg.includes('Application started'))) {
          resolved = true;
          isCSharpRunning = true;
          resolve(true);
        }
      });

      proc.stderr?.on('data', (data) => {
        process.stderr.write(`[C# Info/Warn] ${data.toString()}`);
      });

      proc.on('exit', (code) => {
        if (isCSharpRunning) {
          console.log(`[C# Backend] Process exited with code ${code}`);
        }
        isCSharpRunning = false;
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });

      // 4-second timeout guard
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(isCSharpRunning);
        }
      }, 4000);
    } catch (e: any) {
      console.warn(`[Backend] Could not spawn dotnet: ${e.message}`);
      isCSharpRunning = false;
      resolve(false);
    }
  });
}

// --- Built-in Engine State (used when in cloud container or fallback) ---
interface Dept {
  id: string;
  name: string;
  prefix: string;
  description: string;
  lastSequenceNumber: number;
}

interface TicketItem {
  id: string;
  departmentId: string;
  ticketCode: string;
  patientName: string;
  urgency: number; // 1: Routine, 2: Priority, 3: Urgent, 4: Emergency
  hasAppointment: boolean;
  status: 'Waiting' | 'Called' | 'InConsultation' | 'Completed' | 'NoShow';
  createdAt: string;
  calledAt?: string | null;
  consultationStartedAt?: string | null;
  completedAt?: string | null;
  roomNumber?: string | null;
  doctorName?: string | null;
  estimatedWaitMinutes: number;
  priorityScore: number;
  waitTimeMinutes: number;
  linkedUserId?: string | null;
}

const INITIAL_DEPTS: Dept[] = [
  { id: 'cardiology', name: 'Cardiology Clinic', prefix: 'CARD', description: 'Heart & Vascular Care', lastSequenceNumber: 104 },
  { id: 'pediatrics', name: 'Pediatrics Wing', prefix: 'PEDS', description: 'Child & Adolescent Health', lastSequenceNumber: 202 },
  { id: 'opd', name: 'Outpatient Department (OPD)', prefix: 'OPD', description: 'General Medicine & Checkups', lastSequenceNumber: 305 },
  { id: 'emergency', name: 'Emergency Department (ER)', prefix: 'EMER', description: 'Trauma & Critical Care', lastSequenceNumber: 901 }
];

let departments: Dept[] = JSON.parse(JSON.stringify(INITIAL_DEPTS));
let tickets: TicketItem[] = [];
let events: any[] = [];
const sseClients = new Set<Response>();

function calculateScore(urgency: number, hasAppointment: boolean, createdAt: string, now: Date): number {
  const waitMinutes = Math.max(0, (now.getTime() - new Date(createdAt).getTime()) / 60000);
  if (urgency === 4) {
    return 999999 + waitMinutes;
  }
  return (waitMinutes * 1.5) + (urgency * 20) + (hasAppointment ? 15 : 0);
}

function recalculateScores() {
  const now = new Date();
  for (const t of tickets) {
    t.waitTimeMinutes = Math.max(0, (now.getTime() - new Date(t.createdAt).getTime()) / 60000);
    if (t.status === 'Waiting') {
      t.priorityScore = calculateScore(t.urgency, t.hasAppointment, t.createdAt, now);
    }
  }
}

function seedFallbackData() {
  departments = JSON.parse(JSON.stringify(INITIAL_DEPTS));
  const base = new Date();
  tickets = [
    {
      id: 't-seed-1',
      departmentId: 'emergency',
      ticketCode: 'EMER-901',
      patientName: 'David Vance (Acute Chest Pain)',
      urgency: 4,
      hasAppointment: false,
      status: 'Waiting',
      createdAt: new Date(base.getTime() - 14 * 60000).toISOString(),
      estimatedWaitMinutes: 0,
      priorityScore: 999999 + 14,
      waitTimeMinutes: 14
    },
    {
      id: 't-seed-2',
      departmentId: 'cardiology',
      ticketCode: 'CARD-101',
      patientName: 'Eleanor Rigby',
      urgency: 3,
      hasAppointment: true,
      status: 'Waiting',
      createdAt: new Date(base.getTime() - 25 * 60000).toISOString(),
      estimatedWaitMinutes: 10,
      priorityScore: 0,
      waitTimeMinutes: 25,
      linkedUserId: 'usr-patient-rigby'
    },
    {
      id: 't-seed-3',
      departmentId: 'cardiology',
      ticketCode: 'CARD-102',
      patientName: 'Arthur Pendelton',
      urgency: 1,
      hasAppointment: false,
      status: 'Waiting',
      createdAt: new Date(base.getTime() - 50 * 60000).toISOString(),
      estimatedWaitMinutes: 18,
      priorityScore: 0,
      waitTimeMinutes: 50
    },
    {
      id: 't-seed-4',
      departmentId: 'cardiology',
      ticketCode: 'CARD-103',
      patientName: 'Sophia Martinez',
      urgency: 2,
      hasAppointment: true,
      status: 'Waiting',
      createdAt: new Date(base.getTime() - 10 * 60000).toISOString(),
      estimatedWaitMinutes: 24,
      priorityScore: 0,
      waitTimeMinutes: 10
    },
    {
      id: 't-seed-5',
      departmentId: 'pediatrics',
      ticketCode: 'PEDS-201',
      patientName: 'Leo Walker (Fever 103F)',
      urgency: 3,
      hasAppointment: false,
      status: 'Waiting',
      createdAt: new Date(base.getTime() - 18 * 60000).toISOString(),
      estimatedWaitMinutes: 12,
      priorityScore: 0,
      waitTimeMinutes: 18
    },
    {
      id: 't-seed-6',
      departmentId: 'cardiology',
      ticketCode: 'CARD-100',
      patientName: 'James Henderson',
      urgency: 2,
      hasAppointment: true,
      status: 'Called',
      createdAt: new Date(base.getTime() - 35 * 60000).toISOString(),
      calledAt: new Date(base.getTime() - 2 * 60000).toISOString(),
      roomNumber: 'Room 302 - Heart Center',
      doctorName: 'Dr. Sarah Jenkins',
      estimatedWaitMinutes: 0,
      priorityScore: 0,
      waitTimeMinutes: 35
    }
  ];
  recalculateScores();
}
seedFallbackData();

function broadcastEvent(evt: any) {
  events.unshift(evt);
  if (events.length > 50) events.pop();
  const payload = `data: ${JSON.stringify(evt)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

const app = express();
app.use(express.json());

// Proxy configuration to C# Kestrel
const csharpProxy = createProxyMiddleware({
  target: CSHARP_TARGET,
  changeOrigin: true,
  ws: true,
  xfwd: true,
  on: {
    error: (err, _req, res) => {
      console.warn('[Proxy Notice]: C# bridge routing...', err.message);
      if (res && 'writeHead' in res && !res.headersSent) {
        (res as Response).status(503).json({
          status: 'Starting',
          backend: 'C# ASP.NET Core 8',
          message: 'The C# backend is initializing. Please retry in a moment.'
        });
      }
    }
  }
});

// Route /api and /hubs to C# if running, or to internal high-performance fallback
app.use((req, res, next) => {
  if (isCSharpRunning && (req.url.startsWith('/api') || req.url.startsWith('/hubs'))) {
    return csharpProxy(req, res, next);
  }
  next();
});

// --- API Fallback Handlers (executes when C# ASP.NET Core process is not active) ---

// 1. Departments
app.get('/api/departments', (_req: Request, res: Response) => {
  res.json({ departments });
});

app.get('/api/departments/:id', (req: Request, res: Response) => {
  const dept = departments.find(d => d.id === req.params.id);
  if (!dept) return res.status(404).json({ message: 'Department not found' });
  res.json(dept);
});

// 2. Queue Overview
app.get('/api/queue/overview', (_req: Request, res: Response) => {
  recalculateScores();
  const deptOverviews = departments.map(d => {
    const deptTickets = tickets.filter(t => t.departmentId === d.id);
    const waitingQueue = deptTickets
      .filter(t => t.status === 'Waiting')
      .sort((a, b) => b.priorityScore - a.priorityScore || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const inConsultation = deptTickets.find(t => t.status === 'Called' || t.status === 'InConsultation') || null;
    const completedTickets = deptTickets
      .filter(t => t.status === 'Completed' || t.status === 'NoShow')
      .slice(-10);

    return {
      department: d,
      waitingQueue,
      inConsultation,
      completedTickets,
      waitingCount: waitingQueue.length,
      estimatedWaitMinutes: waitingQueue.length * 12
    };
  });

  res.json({
    timestamp: new Date().toISOString(),
    departments: deptOverviews,
    recentEvents: events.slice(0, 15)
  });
});

// 3. Department Specific Queue
app.get('/api/queue/:deptId', (req: Request, res: Response) => {
  recalculateScores();
  const dept = departments.find(d => d.id === req.params.deptId);
  if (!dept) return res.status(404).json({ message: 'Department not found' });

  const deptTickets = tickets.filter(t => t.departmentId === dept.id);
  const waitingQueue = deptTickets
    .filter(t => t.status === 'Waiting')
    .sort((a, b) => b.priorityScore - a.priorityScore || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const inConsultation = deptTickets.find(t => t.status === 'Called' || t.status === 'InConsultation') || null;
  const completedTickets = deptTickets.filter(t => t.status === 'Completed' || t.status === 'NoShow').slice(-10);

  res.json({
    department: dept,
    waitingQueue,
    inConsultation,
    completedTickets,
    waitingCount: waitingQueue.length,
    estimatedWaitMinutes: waitingQueue.length * 12
  });
});

// 4. Patient Queue Status
app.get('/api/queue/patient/:userId', (req: Request, res: Response) => {
  recalculateScores();
  const userId = req.params.userId;
  const email = (req.query.email as string)?.toLowerCase();

  const userTicket = tickets.slice().reverse().find(t => {
    if (t.linkedUserId === userId) return true;
    if (email && t.patientName.toLowerCase().includes(email)) return true;
    return false;
  });

  if (!userTicket) {
    return res.json({
      activeTicket: null,
      position: 0,
      estimatedWaitMinutes: 0,
      inConsultation: false,
      department: null,
      message: 'No active ticket found for this patient.'
    });
  }

  const dept = departments.find(d => d.id === userTicket.departmentId) || null;
  let position = 0;
  if (userTicket.status === 'Waiting') {
    const deptWaiting = tickets
      .filter(t => t.departmentId === userTicket.departmentId && t.status === 'Waiting')
      .sort((a, b) => b.priorityScore - a.priorityScore || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    position = deptWaiting.findIndex(t => t.id === userTicket.id) + 1;
  }

  res.json({
    activeTicket: userTicket,
    position,
    estimatedWaitMinutes: userTicket.urgency === 4 ? 0 : Math.max(0, position * 12),
    inConsultation: userTicket.status === 'Called' || userTicket.status === 'InConsultation',
    department: dept
  });
});

// 5. Issue Ticket
app.post(['/api/tickets', '/api/queue/issue'], (req: Request, res: Response) => {
  const { departmentId, patientName, urgency, hasAppointment, linkedUserId } = req.body;
  const dept = departments.find(d => d.id === departmentId);
  if (!dept) return res.status(400).json({ message: 'Invalid Department ID' });

  dept.lastSequenceNumber++;
  const ticketCode = `${dept.prefix}-${dept.lastSequenceNumber.toString().padStart(3, '0')}`;
  const now = new Date();

  const newTicket: TicketItem = {
    id: `t-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    departmentId,
    ticketCode,
    patientName: patientName?.trim() || 'Anonymous Patient',
    urgency: Number(urgency) || 1,
    hasAppointment: !!hasAppointment,
    status: 'Waiting',
    createdAt: now.toISOString(),
    estimatedWaitMinutes: urgency === 4 ? 0 : 15,
    priorityScore: calculateScore(Number(urgency) || 1, !!hasAppointment, now.toISOString(), now),
    waitTimeMinutes: 0,
    linkedUserId
  };

  tickets.push(newTicket);
  recalculateScores();

  const deptWaiting = tickets
    .filter(t => t.departmentId === departmentId && t.status === 'Waiting')
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const position = deptWaiting.findIndex(t => t.id === newTicket.id) + 1;
  newTicket.estimatedWaitMinutes = newTicket.urgency === 4 ? 0 : position * 12;

  const evt = {
    id: `ev-${Date.now()}`,
    type: 'TICKET_ISSUED',
    ticketCode: newTicket.ticketCode,
    departmentId: newTicket.departmentId,
    message: `Ticket ${newTicket.ticketCode} issued for ${newTicket.patientName}`,
    timestamp: now.toISOString(),
    data: { ticket: newTicket, position }
  };
  broadcastEvent(evt);

  res.status(201).json({
    ticket: newTicket,
    department: dept,
    queuePosition: position,
    estimatedWaitMinutes: newTicket.estimatedWaitMinutes
  });
});

// 6. Ticket Lookup
app.get('/api/tickets/:code', (req: Request, res: Response) => {
  recalculateScores();
  const code = req.params.code.trim().toUpperCase();
  const ticket = tickets.find(t => t.ticketCode.toUpperCase() === code || t.id === req.params.code);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

  const dept = departments.find(d => d.id === ticket.departmentId);
  let position = 0;
  if (ticket.status === 'Waiting') {
    const deptWaiting = tickets
      .filter(t => t.departmentId === ticket.departmentId && t.status === 'Waiting')
      .sort((a, b) => b.priorityScore - a.priorityScore);
    position = deptWaiting.findIndex(t => t.id === ticket.id) + 1;
  }

  res.json({
    ticket,
    department: dept,
    queuePosition: position,
    inConsultation: ticket.status === 'Called' || ticket.status === 'InConsultation'
  });
});

// 7. Doctor: Call Next
app.post('/api/doctor/call-next', (req: Request, res: Response) => {
  recalculateScores();
  const { departmentId = 'cardiology', doctorName = 'Dr. Sarah Jenkins', roomNumber = 'Room 302' } = req.body || {};
  const now = new Date();

  // Complete any existing in-progress consultation
  const inConsult = tickets.filter(t => t.departmentId === departmentId && (t.status === 'Called' || t.status === 'InConsultation'));
  for (const t of inConsult) {
    t.status = 'Completed';
    t.completedAt = now.toISOString();
  }

  const waiting = tickets
    .filter(t => t.departmentId === departmentId && t.status === 'Waiting')
    .sort((a, b) => b.priorityScore - a.priorityScore || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (waiting.length === 0) {
    return res.json({
      success: false,
      calledTicket: null,
      message: 'No waiting patients remaining in this department.'
    });
  }

  const nextTicket = waiting[0];
  nextTicket.status = 'Called';
  nextTicket.calledAt = now.toISOString();
  nextTicket.roomNumber = roomNumber;
  nextTicket.doctorName = doctorName;

  const evt = {
    id: `ev-${Date.now()}`,
    type: 'PATIENT_CALLED',
    ticketCode: nextTicket.ticketCode,
    departmentId: nextTicket.departmentId,
    message: `Patient ${nextTicket.ticketCode} (${nextTicket.patientName}) called to ${nextTicket.roomNumber} by ${nextTicket.doctorName}`,
    timestamp: now.toISOString(),
    data: nextTicket
  };
  broadcastEvent(evt);

  res.json({
    success: true,
    calledTicket: nextTicket,
    message: `Patient ${nextTicket.ticketCode} has been called to ${roomNumber}.`
  });
});

// 8. Doctor: Complete Consultation
app.post('/api/doctor/complete-consultation', (req: Request, res: Response) => {
  const { departmentId = 'cardiology', ticketId } = req.body || {};
  const now = new Date();

  let ticket = ticketId ? tickets.find(t => t.id === ticketId) : null;
  if (!ticket) {
    ticket = tickets.find(t => t.departmentId === departmentId && (t.status === 'Called' || t.status === 'InConsultation')) || null;
  }

  if (!ticket) {
    return res.status(400).json({ success: false, message: 'No active consultation found to complete.' });
  }

  ticket.status = 'Completed';
  ticket.completedAt = now.toISOString();

  const evt = {
    id: `ev-${Date.now()}`,
    type: 'STATUS_CHANGED',
    ticketCode: ticket.ticketCode,
    departmentId: ticket.departmentId,
    message: `Ticket ${ticket.ticketCode} completed consultation.`,
    timestamp: now.toISOString(),
    data: ticket
  };
  broadcastEvent(evt);

  res.json({ success: true, ticket, message: `Consultation for ${ticket.ticketCode} completed.` });
});

// 9. Doctor: Recall
app.post('/api/doctor/recall', (req: Request, res: Response) => {
  const { departmentId = 'cardiology' } = req.body || {};
  const ticket = tickets.find(t => t.departmentId === departmentId && (t.status === 'Called' || t.status === 'InConsultation'));

  if (!ticket) {
    return res.status(400).json({ success: false, message: 'No called ticket found to recall.' });
  }

  const evt = {
    id: `ev-${Date.now()}`,
    type: 'PATIENT_CALLED',
    ticketCode: ticket.ticketCode,
    departmentId: ticket.departmentId,
    message: `[RECALL] Patient ${ticket.ticketCode} (${ticket.patientName}), please proceed to ${ticket.roomNumber}`,
    timestamp: new Date().toISOString(),
    data: ticket
  };
  broadcastEvent(evt);

  res.json({ success: true, ticket, message: `Patient ${ticket.ticketCode} recalled to ${ticket.roomNumber}.` });
});

// 10. Update Status
app.post('/api/queue/update-status', (req: Request, res: Response) => {
  const { ticketId, newStatus } = req.body;
  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  const now = new Date();
  ticket.status = newStatus;
  if (newStatus === 'InConsultation') ticket.consultationStartedAt = now.toISOString();
  if (newStatus === 'Completed' || newStatus === 'NoShow') ticket.completedAt = now.toISOString();

  const evt = {
    id: `ev-${Date.now()}`,
    type: 'STATUS_CHANGED',
    ticketCode: ticket.ticketCode,
    departmentId: ticket.departmentId,
    message: `Ticket ${ticket.ticketCode} status changed to ${newStatus}`,
    timestamp: now.toISOString(),
    data: ticket
  };
  broadcastEvent(evt);

  res.json({ success: true, ticket, message: `Ticket ${ticket.ticketCode} updated to ${newStatus}` });
});

// 11. Simulation Reset
app.post('/api/simulation/reset', (_req: Request, res: Response) => {
  seedFallbackData();
  const evt = {
    id: `ev-${Date.now()}`,
    type: 'RESET_ALL',
    message: 'Hospital Queue Simulation reset to initial seed state.',
    timestamp: new Date().toISOString()
  };
  broadcastEvent(evt);
  res.json({ success: true, message: 'Simulation reset to initial seeded state.' });
});

// 12. Real-Time SSE Stream
app.get('/api/events/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Connected to Event Stream' })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// 13. Authentication Endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email = 'dr.jenkins@stjude-hospital.org', role = 'Doctor', departmentId = 'cardiology' } = req.body || {};
  const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  res.json({
    message: 'Login successful.',
    token,
    user: {
      id: `usr-${email.split('@')[0]}`,
      email,
      name: email.includes('dr.') ? 'Dr. Sarah Jenkins, MD' : email.split('@')[0],
      fullName: email.includes('dr.') ? 'Dr. Sarah Jenkins, MD' : email.split('@')[0],
      role,
      departmentId,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    }
  });
});

app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { email, fullName, role = 'Patient', departmentId } = req.body;
  const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  res.status(201).json({
    message: 'Account created and session authenticated.',
    token,
    user: {
      id: `usr-${Date.now()}`,
      email,
      name: fullName,
      fullName,
      role,
      departmentId,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    }
  });
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email = 'dr.jenkins@stjude-hospital.org', name = 'Dr. Sarah Jenkins', role = 'Doctor', departmentId = 'cardiology' } = req.body || {};
  const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  res.json({
    message: 'Google OAuth login successful.',
    token,
    user: {
      id: `usr-${email.split('@')[0]}`,
      email,
      name,
      fullName: name,
      role,
      departmentId,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    }
  });
});

app.get('/api/auth/me', (_req: Request, res: Response) => {
  res.json({
    isAuthenticated: true,
    token: 'active-session-token',
    user: {
      id: 'usr-jenkins',
      email: 'dr.jenkins@stjude-hospital.org',
      name: 'Dr. Sarah Jenkins, MD',
      fullName: 'Dr. Sarah Jenkins, MD',
      role: 'Doctor',
      departmentId: 'cardiology',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    },
    session: {
      sessionId: 'sess-active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    }
  });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully.' });
});

app.get('/api/auth/sessions', (_req: Request, res: Response) => {
  res.json({
    count: 1,
    sessions: [
      {
        id: 'sess-current',
        ip: '127.0.0.1',
        userAgent: 'Browser/1.0',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        isCurrent: true
      }
    ]
  });
});

app.get('/api/auth/audit-logs', (_req: Request, res: Response) => {
  res.json({
    logs: [
      {
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        action: 'SYSTEM_START',
        description: 'Hospital Queue System active and operational'
      }
    ]
  });
});

// --- Server Startup ---
async function startServer() {
  await tryStartCSharpBackend();

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StJude Hospital Gateway] Running on http://0.0.0.0:${PORT}`);
    if (isCSharpRunning) {
      console.log(`[Backend Mode] C# ASP.NET Core Kestrel active on port ${CSHARP_PORT}`);
    } else {
      console.log(`[Backend Mode] Integrated engine active (C# source retained in Backend/)`);
    }
  });

  server.on('upgrade', (req, socket, head) => {
    if (isCSharpRunning && (req.url?.startsWith('/hubs') || req.url?.startsWith('/api'))) {
      (csharpProxy as any).upgrade?.(req, socket, head);
    }
  });
}

// Graceful cleanup
function cleanup() {
  if (csharpProcess) {
    try {
      csharpProcess.kill('SIGTERM');
    } catch { }
  }
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

startServer();
