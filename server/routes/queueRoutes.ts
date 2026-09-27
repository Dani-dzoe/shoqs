import { Router } from 'express';
import { QueueController } from '../controllers/queueController.js';

export const queueRouter = Router();

queueRouter.get('/departments', QueueController.getDepartments);
queueRouter.get('/queue/overview', QueueController.getQueueOverview);
queueRouter.get('/queue/patient/:userId', QueueController.getPatientTicket);
queueRouter.get('/queue/:deptId', QueueController.getDepartmentQueue);
queueRouter.post('/tickets', QueueController.issueTicket);
queueRouter.get('/tickets/:code', QueueController.getTicketByCode);
