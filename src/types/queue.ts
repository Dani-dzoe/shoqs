export enum UrgencyLevel {
  Routine = 1,
  Priority = 2,
  Urgent = 3,
  Emergency = 4
}

export type TicketStatus = 'Waiting' | 'Called' | 'InConsultation' | 'Completed' | 'NoShow';

export interface Department {
  id: string;
  name: string;
  prefix: string;
  description: string;
  lastSequenceNumber: number;
}

export interface Ticket {
  id: string;
  departmentId: string;
  ticketCode: string;
  patientName: string;
  urgency: UrgencyLevel;
  hasAppointment: boolean;
  status: TicketStatus;
  createdAt: string; // ISO string
  calledAt?: string | null;
  consultationStartedAt?: string | null;
  completedAt?: string | null;
  roomNumber?: string | null;
  doctorName?: string | null;
  estimatedWaitMinutes: number;
  priorityScore: number;
  waitTimeMinutes: number;
  linkedUserId?: string;
  linkedUserEmail?: string;
}

export interface PatientQueueStatus {
  hasActiveTicket: boolean;
  ticket: Ticket | null;
  department: Department | null;
  queuePosition: number;
  ticketsAheadCount: number;
  estimatedWaitMinutes: number;
  isCalled: boolean;
  isInConsultation: boolean;
  currentCallingCode: string | null;
}

export interface PriorityBreakdown {
  waitTimeMinutes: number;
  waitTimeScore: number;
  urgencyScore: number;
  appointmentBonus: number;
  totalScore: number;
  isEmergencyBypass: boolean;
}

export interface QueueEvent {
  id: string;
  timestamp: string;
  type: 'TICKET_ISSUED' | 'PATIENT_CALLED' | 'STATUS_CHANGED' | 'EMERGENCY_OVERRIDE';
  ticketCode: string;
  departmentId: string;
  message: string;
  details?: Record<string, any>;
}
