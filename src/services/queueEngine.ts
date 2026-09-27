import { Department, Ticket, TicketStatus, UrgencyLevel, PriorityBreakdown, QueueEvent, PatientQueueStatus } from '../types/queue';

const STORAGE_KEY_TICKETS = 'hospital_queue_tickets_v1';
const STORAGE_KEY_DEPTS = 'hospital_queue_depts_v1';
const STORAGE_KEY_EVENTS = 'hospital_queue_events_v1';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'cardiology',
    name: 'Cardiology Clinic',
    prefix: 'CARD',
    description: 'Heart, Vascular & Cardiovascular Diagnostics',
    lastSequenceNumber: 104
  },
  {
    id: 'pediatrics',
    name: 'Pediatrics Wing',
    prefix: 'PEDS',
    description: 'Neonatal, Child & Adolescent Healthcare',
    lastSequenceNumber: 202
  },
  {
    id: 'opd',
    name: 'Outpatient Department (OPD)',
    prefix: 'OPD',
    description: 'General Medicine, Family Practice & Triage',
    lastSequenceNumber: 305
  },
  {
    id: 'emergency',
    name: 'Emergency Department (ER)',
    prefix: 'EMER',
    description: 'Acute Trauma, Resuscitation & Urgent Triage',
    lastSequenceNumber: 901
  }
];

export function calculatePriorityBreakdown(
  createdAtIso: string,
  urgency: UrgencyLevel,
  hasAppointment: boolean,
  currentTime = new Date()
): PriorityBreakdown {
  const createdTime = new Date(createdAtIso);
  const waitTimeMinutes = Math.max(0, (currentTime.getTime() - createdTime.getTime()) / (1000 * 60));

  if (urgency === UrgencyLevel.Emergency) {
    return {
      waitTimeMinutes,
      waitTimeScore: waitTimeMinutes * 1.5,
      urgencyScore: 999999,
      appointmentBonus: hasAppointment ? 15 : 0,
      totalScore: 999999 + waitTimeMinutes,
      isEmergencyBypass: true
    };
  }

  const waitTimeScore = waitTimeMinutes * 1.5;
  const urgencyScore = urgency * 20;
  const appointmentBonus = hasAppointment ? 15 : 0;
  const totalScore = waitTimeScore + urgencyScore + appointmentBonus;

  return {
    waitTimeMinutes,
    waitTimeScore,
    urgencyScore,
    appointmentBonus,
    totalScore,
    isEmergencyBypass: false
  };
}

class QueueEngine {
  private departments: Department[] = [];
  private tickets: Ticket[] = [];
  private events: QueueEvent[] = [];
  private listeners: Set<() => void> = new Set();
  private timer: number | null = null;

  constructor() {
    this.loadState();
    this.startClock();
  }

  private loadState() {
    try {
      const deptsRaw = localStorage.getItem(STORAGE_KEY_DEPTS);
      const ticketsRaw = localStorage.getItem(STORAGE_KEY_TICKETS);
      const eventsRaw = localStorage.getItem(STORAGE_KEY_EVENTS);

      if (deptsRaw && ticketsRaw) {
        this.departments = JSON.parse(deptsRaw);
        this.tickets = JSON.parse(ticketsRaw);
        this.events = eventsRaw ? JSON.parse(eventsRaw) : [];
        this.recalculateAllScores();
        return;
      }
    } catch (e) {
      console.warn('Failed to load queue from storage, seeding fresh data.', e);
    }

    this.seedDefaults();
  }

  public seedDefaults() {
    this.departments = JSON.parse(JSON.stringify(INITIAL_DEPARTMENTS));
    const now = new Date();

    this.tickets = [
      // 1. Emergency Bypass Patient in ER
      {
        id: 't-seed-1',
        departmentId: 'emergency',
        ticketCode: 'EMER-901',
        patientName: 'David Vance (Acute Chest Pain)',
        urgency: UrgencyLevel.Emergency,
        hasAppointment: false,
        status: 'Waiting',
        createdAt: new Date(now.getTime() - 14 * 60 * 1000).toISOString(),
        estimatedWaitMinutes: 0,
        priorityScore: 999999,
        waitTimeMinutes: 14
      },
      // 2. Urgent + Booked in Cardiology (25 mins waiting)
      {
        id: 't-seed-2',
        departmentId: 'cardiology',
        ticketCode: 'CARD-101',
        patientName: 'Eleanor Rigby',
        urgency: UrgencyLevel.Urgent,
        hasAppointment: true,
        status: 'Waiting',
        createdAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
        estimatedWaitMinutes: 10,
        priorityScore: 0,
        waitTimeMinutes: 25,
        linkedUserId: 'usr-patient-rigby',
        linkedUserEmail: 'patient.rigby@gmail.com'
      },
      // 3. Routine Walk-in waiting 50 mins in Cardiology (Wait time escalation demonstration)
      {
        id: 't-seed-3',
        departmentId: 'cardiology',
        ticketCode: 'CARD-102',
        patientName: 'Arthur Pendelton',
        urgency: UrgencyLevel.Routine,
        hasAppointment: false,
        status: 'Waiting',
        createdAt: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
        estimatedWaitMinutes: 18,
        priorityScore: 0,
        waitTimeMinutes: 50
      },
      // 4. Priority + Appointment in Cardiology (10 mins waiting)
      {
        id: 't-seed-4',
        departmentId: 'cardiology',
        ticketCode: 'CARD-103',
        patientName: 'Sophia Martinez',
        urgency: UrgencyLevel.Priority,
        hasAppointment: true,
        status: 'Waiting',
        createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        estimatedWaitMinutes: 26,
        priorityScore: 0,
        waitTimeMinutes: 10
      },
      // 5. Urgent in Pediatrics (18 mins waiting)
      {
        id: 't-seed-5',
        departmentId: 'pediatrics',
        ticketCode: 'PEDS-201',
        patientName: 'Leo Walker (Fever 103F)',
        urgency: UrgencyLevel.Urgent,
        hasAppointment: false,
        status: 'Waiting',
        createdAt: new Date(now.getTime() - 18 * 60 * 1000).toISOString(),
        estimatedWaitMinutes: 12,
        priorityScore: 0,
        waitTimeMinutes: 18
      },
      // 6. Currently Called ticket in Cardiology for active lobby display
      {
        id: 't-seed-6',
        departmentId: 'cardiology',
        ticketCode: 'CARD-100',
        patientName: 'James Henderson',
        urgency: UrgencyLevel.Priority,
        hasAppointment: true,
        status: 'Called',
        createdAt: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
        calledAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
        roomNumber: 'Room 302 - Heart Center',
        doctorName: 'Dr. Sarah Jenkins',
        estimatedWaitMinutes: 0,
        priorityScore: 0,
        waitTimeMinutes: 35
      }
    ];

    this.events = [
      {
        id: 'ev-1',
        timestamp: new Date().toISOString(),
        type: 'PATIENT_CALLED',
        ticketCode: 'CARD-100',
        departmentId: 'cardiology',
        message: 'Patient CARD-100 called to Room 302 - Heart Center'
      }
    ];

    this.saveState();
    this.recalculateAllScores();
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY_DEPTS, JSON.stringify(this.departments));
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(this.tickets));
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.events.slice(-50)));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }

  private isNotifying = false;

  private startClock() {
    if (typeof window !== 'undefined') {
      this.timer = window.setInterval(() => {
        this.updateScoresOnly();
        this.notify();
      }, 5000); // refresh wait times and priority every 5 seconds
    }
  }

  public updateScoresOnly() {
    const now = new Date();
    for (const ticket of this.tickets) {
      if (ticket.status === 'Waiting') {
        const breakdown = calculatePriorityBreakdown(
          ticket.createdAt,
          ticket.urgency,
          ticket.hasAppointment,
          now
        );
        ticket.waitTimeMinutes = breakdown.waitTimeMinutes;
        ticket.priorityScore = breakdown.totalScore;
      }
    }
  }

  public recalculateAllScores() {
    this.updateScoresOnly();
    this.notify();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    if (this.isNotifying) return;
    this.isNotifying = true;
    try {
      const currentListeners = Array.from(this.listeners);
      for (const listener of currentListeners) {
        listener();
      }
    } finally {
      this.isNotifying = false;
    }
  }

  // --- API Methods ---

  public getDepartments(): Department[] {
    return [...this.departments];
  }

  public getDepartment(id: string): Department | undefined {
    return this.departments.find(d => d.id === id);
  }

  public getSnapshot(departmentId?: string) {
    this.updateScoresOnly();
    const active = departmentId
      ? this.tickets.filter(t => t.departmentId === departmentId)
      : this.tickets;

    // Waiting queue sorted by priority score descending, then by creation time
    const waitingQueue = active
      .filter(t => t.status === 'Waiting')
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    // Currently called / in-consultation
    const currentlyCalled = active
      .filter(t => t.status === 'Called' || t.status === 'InConsultation')
      .sort((a, b) => {
        const timeA = new Date(a.calledAt || a.createdAt).getTime();
        const timeB = new Date(b.calledAt || b.createdAt).getTime();
        return timeB - timeA;
      });

    const recentCompleted = active
      .filter(t => t.status === 'Completed' || t.status === 'NoShow')
      .slice(-10);

    return {
      departmentId,
      waitingQueue,
      currentlyCalled,
      recentCompleted,
      totalWaiting: waitingQueue.length
    };
  }

  // POST /api/queue/issue
  public issueTicket(params: {
    departmentId: string;
    patientName: string;
    urgency: UrgencyLevel;
    hasAppointment: boolean;
    linkedUserId?: string;
    linkedUserEmail?: string;
  }): { ticket: Ticket; queuePosition: number } {
    const dept = this.departments.find(d => d.id === params.departmentId);
    if (!dept) throw new Error('Invalid Department ID');

    dept.lastSequenceNumber += 1;
    const ticketCode = `${dept.prefix}-${dept.lastSequenceNumber.toString().padStart(3, '0')}`;
    const now = new Date();

    const breakdown = calculatePriorityBreakdown(
      now.toISOString(),
      params.urgency,
      params.hasAppointment,
      now
    );

    const newTicket: Ticket = {
      id: 't-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      departmentId: params.departmentId,
      ticketCode,
      patientName: params.patientName?.trim() || 'Anonymous Patient',
      urgency: params.urgency,
      hasAppointment: params.hasAppointment,
      status: 'Waiting',
      createdAt: now.toISOString(),
      estimatedWaitMinutes: params.urgency === UrgencyLevel.Emergency ? 0 : 15,
      priorityScore: breakdown.totalScore,
      waitTimeMinutes: 0,
      linkedUserId: params.linkedUserId,
      linkedUserEmail: params.linkedUserEmail ? params.linkedUserEmail.toLowerCase().trim() : undefined
    };

    this.tickets.push(newTicket);
    this.recalculateAllScores();

    // Determine position in department waiting line
    const deptWaiting = this.tickets
      .filter(t => t.departmentId === params.departmentId && t.status === 'Waiting')
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const position = deptWaiting.findIndex(t => t.id === newTicket.id) + 1;
    newTicket.estimatedWaitMinutes = params.urgency === UrgencyLevel.Emergency ? 0 : position * 12;

    this.events.unshift({
      id: 'ev-' + Date.now(),
      timestamp: now.toISOString(),
      type: 'TICKET_ISSUED',
      ticketCode,
      departmentId: params.departmentId,
      message: `Issued ticket ${ticketCode} for ${newTicket.patientName} (${dept.name})`,
      details: {
        ticket: newTicket,
        queuePosition: position
      }
    });

    this.saveState();
    this.notify();

    return { ticket: newTicket, queuePosition: position };
  }

  public getPatientQueueStatus(
    userId: string,
    userEmail?: string,
    userName?: string
  ): PatientQueueStatus {
    this.updateScoresOnly();

    const cleanEmail = userEmail ? userEmail.toLowerCase().trim() : '';
    const cleanName = userName ? userName.toLowerCase().trim() : '';

    // Find latest active ticket associated with this user
    const userTicket = this.tickets.slice().reverse().find(t => {
      if (t.linkedUserId && t.linkedUserId === userId) return true;
      if (cleanEmail && t.linkedUserEmail && t.linkedUserEmail.toLowerCase() === cleanEmail) return true;
      if (cleanName && t.patientName && t.patientName.toLowerCase() === cleanName) return true;
      return false;
    });

    if (!userTicket) {
      return {
        hasActiveTicket: false,
        ticket: null,
        department: null,
        queuePosition: 0,
        ticketsAheadCount: 0,
        estimatedWaitMinutes: 0,
        isCalled: false,
        isInConsultation: false,
        currentCallingCode: null
      };
    }

    const dept = this.departments.find(d => d.id === userTicket.departmentId) || null;
    
    // Sort department waiting tickets by priority descending
    const deptWaiting = this.tickets
      .filter(t => t.departmentId === userTicket.departmentId && t.status === 'Waiting')
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    let queuePosition = 0;
    let ticketsAheadCount = 0;
    if (userTicket.status === 'Waiting') {
      const idx = deptWaiting.findIndex(t => t.id === userTicket.id);
      queuePosition = idx !== -1 ? idx + 1 : 1;
      ticketsAheadCount = Math.max(0, queuePosition - 1);
    }

    const activeCalling = this.tickets.find(
      t => t.departmentId === userTicket.departmentId && (t.status === 'Called' || t.status === 'InConsultation')
    );

    const estimatedWaitMinutes = queuePosition > 0 ? queuePosition * 12 : 0;

    return {
      hasActiveTicket: true,
      ticket: userTicket,
      department: dept,
      queuePosition,
      ticketsAheadCount,
      estimatedWaitMinutes,
      isCalled: userTicket.status === 'Called',
      isInConsultation: userTicket.status === 'InConsultation',
      currentCallingCode: activeCalling ? activeCalling.ticketCode : null
    };
  }

  // POST /api/queue/call-next
  public callNext(params: {
    departmentId: string;
    roomNumber: string;
    doctorName: string;
  }): Ticket {
    this.recalculateAllScores();

    const waiting = this.tickets
      .filter(t => t.departmentId === params.departmentId && t.status === 'Waiting')
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    if (waiting.length === 0) {
      throw new Error('No patients currently waiting in this department.');
    }

    const nextTicket = waiting[0];
    const now = new Date();

    nextTicket.status = 'Called';
    nextTicket.calledAt = now.toISOString();
    nextTicket.roomNumber = params.roomNumber || 'Consultation Room';
    nextTicket.doctorName = params.doctorName || 'Attending Physician';

    this.events.unshift({
      id: 'ev-' + Date.now(),
      timestamp: now.toISOString(),
      type: 'PATIENT_CALLED',
      ticketCode: nextTicket.ticketCode,
      departmentId: params.departmentId,
      message: `Ticket ${nextTicket.ticketCode} called to ${nextTicket.roomNumber} by ${nextTicket.doctorName}`
    });

    this.saveState();
    this.notify();

    return nextTicket;
  }

  // POST /api/queue/update-status
  public updateStatus(ticketId: string, newStatus: TicketStatus): Ticket {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const now = new Date();
    ticket.status = newStatus;

    if (newStatus === 'InConsultation') {
      ticket.consultationStartedAt = now.toISOString();
    } else if (newStatus === 'Completed' || newStatus === 'NoShow') {
      ticket.completedAt = now.toISOString();
    }

    this.events.unshift({
      id: 'ev-' + Date.now(),
      timestamp: now.toISOString(),
      type: 'STATUS_CHANGED',
      ticketCode: ticket.ticketCode,
      departmentId: ticket.departmentId,
      message: `Ticket ${ticket.ticketCode} status updated to [${newStatus}]`
    });

    this.saveState();
    this.notify();

    return ticket;
  }

  public getRecentEvents(): QueueEvent[] {
    return [...this.events];
  }

  public findTicket(query: string): { ticket: Ticket; queuePosition: number; department: Department } | null {
    if (!query) return null;
    const clean = query.trim().toUpperCase();
    const ticket = this.tickets.find(t => 
      t.ticketCode.toUpperCase() === clean || 
      t.id.toLowerCase() === query.trim().toLowerCase()
    );
    if (!ticket) return null;

    const dept = this.departments.find(d => d.id === ticket.departmentId) || this.departments[0];
    
    let position = 0;
    if (ticket.status === 'Waiting') {
      const deptWaiting = this.tickets
        .filter(t => t.departmentId === ticket.departmentId && t.status === 'Waiting')
        .sort((a, b) => b.priorityScore - a.priorityScore);
      position = deptWaiting.findIndex(t => t.id === ticket.id) + 1;
    }

    return { ticket, queuePosition: position, department: dept };
  }

  public resetAll() {
    this.seedDefaults();
  }
}

export const queueEngine = new QueueEngine();
