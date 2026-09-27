import { Ticket } from './Ticket.js';

export interface Department {
  id: string;
  name: string;
  prefix: string;
  description: string;
  lastSequenceNumber: number;
}

export interface DepartmentStats extends Department {
  waitingCount: number;
  estimatedWaitMinutes: number;
  currentCallingCode: string | null;
  currentDoctor: string | null;
}

export interface DepartmentQueueOverview {
  department: Department;
  waitingQueue: Ticket[];
  inConsultation: Ticket | null;
  completedTickets: Ticket[];
  waitingCount: number;
  estimatedWaitMinutes: number;
}

export interface QueueEvent {
  id: string;
  timestamp: string;
  type: 'TICKET_ISSUED' | 'PATIENT_CALLED' | 'STATUS_CHANGED' | 'EMERGENCY_OVERRIDE';
  ticketCode: string;
  departmentId: string;
  message: string;
  details?: any;
}
