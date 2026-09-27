import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { db } from '../db/index.js';
import { updateDepartmentQueueScores } from '../utils/priority.js';
import { sseManager } from '../utils/sse.js';

export class DoctorController {
  /**
   * POST /api/doctor/call-next
   * Doctor calls next patient from priority queue. Protected with Bearer Token.
   */
  public static async callNextPatient(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { departmentId, doctorName, roomNumber } = req.body;
    const targetDeptId = departmentId || req.user?.departmentId || 'cardiology';

    const waitingList = updateDepartmentQueueScores(targetDeptId);

    // Complete any currently in-consultation ticket
    const currentActive = db
      .getAllTickets()
      .find(t => t.departmentId === targetDeptId && t.status === 'InConsultation');
    if (currentActive) {
      currentActive.status = 'Completed';
      currentActive.completedAt = new Date().toISOString();
    }

    if (waitingList.length === 0) {
      return res.status(200).json({
        message: 'Queue is empty. No patients currently waiting in this department.',
        ticket: null
      });
    }

    const nextTicket = waitingList[0];
    nextTicket.status = 'InConsultation';
    nextTicket.calledAt = new Date().toISOString();
    nextTicket.consultationStartedAt = new Date().toISOString();
    nextTicket.roomNumber = roomNumber || 'Consultation Suite 3';
    nextTicket.doctorName = doctorName || req.user?.name || 'Attending Physician';
    nextTicket.estimatedWaitMinutes = 0;

    sseManager.broadcastEvent(
      'PATIENT_CALLED',
      nextTicket.ticketCode,
      targetDeptId,
      `Ticket ${nextTicket.ticketCode} called to ${nextTicket.roomNumber} by ${nextTicket.doctorName}`,
      {
        ticketCode: nextTicket.ticketCode,
        roomNumber: nextTicket.roomNumber,
        doctorName: nextTicket.doctorName,
        patientName: nextTicket.patientName
      }
    );

    return res.json({
      success: true,
      calledTicket: nextTicket,
      message: `Patient ${nextTicket.patientName} (${nextTicket.ticketCode}) called to ${nextTicket.roomNumber}`
    });
  }

  /**
   * POST /api/doctor/complete-consultation
   * Doctor completes consultation. Protected with Bearer Token.
   */
  public static async completeConsultation(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { departmentId, ticketId } = req.body;
    const targetDeptId = departmentId || req.user?.departmentId || 'cardiology';

    const ticket = ticketId
      ? db.getTicketById(ticketId)
      : db
          .getAllTickets()
          .find(t => t.departmentId === targetDeptId && t.status === 'InConsultation');

    if (!ticket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'No active consultation ticket found to complete'
      });
    }

    ticket.status = 'Completed';
    ticket.completedAt = new Date().toISOString();

    sseManager.broadcastEvent(
      'STATUS_CHANGED',
      ticket.ticketCode,
      ticket.departmentId,
      `Consultation completed for ${ticket.ticketCode} by ${req.user?.name}`,
      {
        ticketCode: ticket.ticketCode,
        status: 'Completed'
      }
    );

    return res.json({ success: true, ticket });
  }

  /**
   * POST /api/doctor/recall
   * Re-call current patient. Protected with Bearer Token.
   */
  public static async recallPatient(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { departmentId } = req.body;
    const targetDeptId = departmentId || req.user?.departmentId || 'cardiology';

    const activeTicket = db
      .getAllTickets()
      .find(t => t.departmentId === targetDeptId && t.status === 'InConsultation');
    if (!activeTicket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'No active patient ticket to recall'
      });
    }

    sseManager.broadcastEvent(
      'PATIENT_CALLED',
      activeTicket.ticketCode,
      targetDeptId,
      `RECALL: ${activeTicket.ticketCode} please report to ${activeTicket.roomNumber}`,
      {
        ticketCode: activeTicket.ticketCode,
        roomNumber: activeTicket.roomNumber,
        isRecall: true
      }
    );

    return res.json({ success: true, ticket: activeTicket });
  }
}
