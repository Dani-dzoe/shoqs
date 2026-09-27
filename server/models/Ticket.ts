export enum UrgencyLevel {
  Routine = 1,
  Priority = 2,
  Urgent = 3,
  Emergency = 4
}

export type TicketStatus =
  | 'Waiting'
  | 'Called'
  | 'InConsultation'
  | 'Completed'
  | 'NoShow'
  | 'Transferred';

export interface Ticket {
  id: string;
  departmentId: string;
  ticketCode: string;
  patientName: string;
  urgency: UrgencyLevel;
  hasAppointment: boolean;
  status: TicketStatus;
  createdAt: string;
  calledAt?: string;
  consultationStartedAt?: string;
  completedAt?: string;
  roomNumber?: string;
  doctorName?: string;
  estimatedWaitMinutes: number;
  priorityScore: number;
  waitTimeMinutes: number;
  qrPayload?: string;
  linkedUserId?: string;
  linkedUserEmail?: string;
}

export interface IssueTicketInput {
  departmentId: string;
  patientName?: string;
  urgency?: UrgencyLevel;
  hasAppointment?: boolean;
  linkedUserId?: string;
  linkedUserEmail?: string;
}
