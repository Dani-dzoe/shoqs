import { Ticket, UrgencyLevel } from '../models/Ticket.js';
import { db } from '../db/index.js';

/**
 * Computes dynamic priority score based on:
 * PriorityScore = (UrgencyWeight * 20) + (WaitMinutes * 1.5) + (HasAppointment ? 15 : 0)
 * Emergency tickets receive an instant top-tier baseline of 1000 + (WaitMinutes * 2).
 */
export function computePriorityScore(ticket: Ticket): number {
  const now = Date.now();
  const created = new Date(ticket.createdAt).getTime();
  const waitMinutes = Math.max(0, Math.floor((now - created) / 60000));
  ticket.waitTimeMinutes = waitMinutes;

  if (ticket.urgency === UrgencyLevel.Emergency) {
    return 1000 + waitMinutes * 2;
  }

  const urgencyWeight = ticket.urgency * 20; // Routine: 20, Priority: 40, Urgent: 60
  const waitWeight = waitMinutes * 1.5;
  const apptBonus = ticket.hasAppointment ? 15 : 0;
  return Math.round((urgencyWeight + waitWeight + apptBonus) * 10) / 10;
}

/**
 * Updates dynamic scores and recalculates waiting queue ordering and estimated wait minutes.
 */
export function updateDepartmentQueueScores(departmentId: string): Ticket[] {
  const waitingTickets = db
    .getAllTickets()
    .filter(t => t.departmentId === departmentId && t.status === 'Waiting');

  waitingTickets.forEach(t => {
    t.priorityScore = computePriorityScore(t);
  });

  // Sort descending by priority score
  waitingTickets.sort((a, b) => b.priorityScore - a.priorityScore);

  waitingTickets.forEach((t, idx) => {
    t.estimatedWaitMinutes = (idx + 1) * 12;
  });

  return waitingTickets;
}
