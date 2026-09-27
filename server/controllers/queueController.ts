import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { Ticket, UrgencyLevel } from '../models/Ticket.js';
import { updateDepartmentQueueScores, computePriorityScore } from '../utils/priority.js';
import { sseManager } from '../utils/sse.js';

export class QueueController {
  /**
   * GET /api/departments
   * Return departments with live waiting count and estimated wait times.
   */
  public static async getDepartments(_req: Request, res: Response): Promise<any> {
    const departments = db.getDepartments().map(dept => {
      updateDepartmentQueueScores(dept.id);
      const waiting = db
        .getAllTickets()
        .filter(t => t.departmentId === dept.id && t.status === 'Waiting');
      const inConsultation = db
        .getAllTickets()
        .find(t => t.departmentId === dept.id && t.status === 'InConsultation');

      return {
        ...dept,
        waitingCount: waiting.length,
        estimatedWaitMinutes: waiting.length === 0 ? 5 : waiting.length * 12,
        currentCallingCode: inConsultation ? inConsultation.ticketCode : null,
        currentDoctor: inConsultation ? inConsultation.doctorName : null
      };
    });

    return res.json({ departments });
  }

  /**
   * GET /api/queue/overview
   * Multi-department snapshot for Public Lobby Display and triage boards.
   */
  public static async getQueueOverview(_req: Request, res: Response): Promise<any> {
    const departmentsData = db.getDepartments().map(dept => {
      const waitingQueue = updateDepartmentQueueScores(dept.id);
      const inConsultation =
        db
          .getAllTickets()
          .find(t => t.departmentId === dept.id && t.status === 'InConsultation') || null;
      const completedTickets = db
        .getAllTickets()
        .filter(t => t.departmentId === dept.id && t.status === 'Completed')
        .slice(-10);

      return {
        department: dept,
        waitingQueue,
        inConsultation,
        completedTickets,
        waitingCount: waitingQueue.length,
        estimatedWaitMinutes: waitingQueue.length === 0 ? 5 : waitingQueue.length * 12
      };
    });

    return res.json({
      timestamp: new Date().toISOString(),
      departments: departmentsData,
      recentEvents: db.getRecentEvents(15)
    });
  }

  /**
   * GET /api/queue/:deptId
   * Single department queue snapshot.
   */
  public static async getDepartmentQueue(req: Request, res: Response): Promise<any> {
    const { deptId } = req.params;
    const dept = db.getDepartmentById(deptId);
    if (!dept) {
      return res.status(404).json({ error: 'NotFound', message: `Department '${deptId}' not found` });
    }

    const waitingQueue = updateDepartmentQueueScores(deptId);
    const inConsultation =
      db
        .getAllTickets()
        .find(t => t.departmentId === deptId && t.status === 'InConsultation') || null;
    const completedTickets = db
      .getAllTickets()
      .filter(t => t.departmentId === deptId && t.status === 'Completed')
      .slice(-10);

    return res.json({
      department: dept,
      waitingQueue,
      inConsultation,
      completedTickets,
      waitingCount: waitingQueue.length
    });
  }

  /**
   * POST /api/tickets
   * Issue a new digital QR ticket via REST API.
   */
  public static async issueTicket(req: Request, res: Response): Promise<any> {
    const { 
      departmentId, 
      patientName, 
      urgency = UrgencyLevel.Routine, 
      hasAppointment = false,
      linkedUserId,
      linkedUserEmail
    } = req.body;

    const dept = db.getDepartmentById(departmentId);
    if (!dept) {
      return res.status(400).json({ error: 'BadRequest', message: `Invalid departmentId: '${departmentId}'` });
    }

    const nextSeq = db.incrementDepartmentSequence(departmentId);
    const ticketCode = `${dept.prefix}-${nextSeq}`;

    const newTicket: Ticket = {
      id: 't-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      departmentId,
      ticketCode,
      patientName: patientName ? patientName.trim() : 'Walk-in Patient',
      urgency: Number(urgency) as UrgencyLevel,
      hasAppointment: Boolean(hasAppointment),
      status: 'Waiting',
      createdAt: new Date().toISOString(),
      estimatedWaitMinutes: 15,
      priorityScore: 0,
      waitTimeMinutes: 0,
      linkedUserId: linkedUserId || undefined,
      linkedUserEmail: linkedUserEmail ? linkedUserEmail.toLowerCase().trim() : undefined
    };

    newTicket.priorityScore = computePriorityScore(newTicket);
    db.addTicket(newTicket);

    const waitingList = updateDepartmentQueueScores(departmentId);
    const queuePosition = waitingList.findIndex(t => t.id === newTicket.id) + 1;
    newTicket.estimatedWaitMinutes = queuePosition * 12;

    sseManager.broadcastEvent(
      'TICKET_ISSUED',
      ticketCode,
      departmentId,
      `New ticket ${ticketCode} issued for ${newTicket.patientName}`,
      {
        ticketCode,
        urgency: newTicket.urgency,
        hasAppointment: newTicket.hasAppointment,
        queuePosition,
        linkedUserId: newTicket.linkedUserId
      }
    );

    return res.status(201).json({
      ticket: newTicket,
      department: dept,
      queuePosition,
      estimatedWaitMinutes: newTicket.estimatedWaitMinutes
    });
  }

  /**
   * GET /api/queue/patient/:userId
   * Query ticket status, queue position, and estimated wait time based on patient's logged-in ID.
   */
  public static async getPatientTicket(req: Request, res: Response): Promise<any> {
    const { userId } = req.params;
    const userEmail = (req.query.email as string)?.toLowerCase().trim();

    // Check all tickets for matches on linkedUserId or linkedUserEmail or patient profile
    const allTickets = db.getAllTickets();
    const userTicket = allTickets.slice().reverse().find(t => {
      if (t.linkedUserId && t.linkedUserId === userId) return true;
      if (userEmail && t.linkedUserEmail && t.linkedUserEmail.toLowerCase() === userEmail) return true;
      return false;
    });

    if (!userTicket) {
      return res.json({
        hasActiveTicket: false,
        ticket: null,
        department: null,
        queuePosition: 0,
        ticketsAheadCount: 0,
        estimatedWaitMinutes: 0,
        isCalled: false,
        isInConsultation: false,
        currentCallingCode: null
      });
    }

    const dept = db.getDepartmentById(userTicket.departmentId);
    const waitingList = updateDepartmentQueueScores(userTicket.departmentId);

    let queuePosition = 0;
    let ticketsAheadCount = 0;
    if (userTicket.status === 'Waiting') {
      const idx = waitingList.findIndex(t => t.id === userTicket.id);
      queuePosition = idx !== -1 ? idx + 1 : 1;
      ticketsAheadCount = Math.max(0, queuePosition - 1);
    }

    const inConsultation = allTickets.find(
      t => t.departmentId === userTicket.departmentId && (t.status === 'InConsultation' || t.status === 'Called')
    );

    const estimatedWaitMinutes = queuePosition > 0 ? queuePosition * 12 : 0;

    return res.json({
      hasActiveTicket: true,
      ticket: userTicket,
      department: dept,
      queuePosition,
      ticketsAheadCount,
      estimatedWaitMinutes,
      isCalled: userTicket.status === 'Called',
      isInConsultation: userTicket.status === 'InConsultation',
      currentCallingCode: inConsultation ? inConsultation.ticketCode : null
    });
  }

  /**
   * GET /api/tickets/:code
   * Query ticket status by ticketCode (e.g., CARD-101) with live queue position.
   */
  public static async getTicketByCode(req: Request, res: Response): Promise<any> {
    const code = req.params.code.trim().toUpperCase();
    const ticket = db.getTicketByCode(code);
    if (!ticket) {
      return res.status(404).json({ error: 'NotFound', message: `Ticket with code '${code}' not found` });
    }

    const dept = db.getDepartmentById(ticket.departmentId);
    const waitingList = updateDepartmentQueueScores(ticket.departmentId);

    let queuePosition = 0;
    if (ticket.status === 'Waiting') {
      queuePosition = waitingList.findIndex(t => t.id === ticket.id) + 1;
    }

    return res.json({
      ticket,
      department: dept,
      queuePosition,
      inConsultation: ticket.status === 'InConsultation'
    });
  }
}
