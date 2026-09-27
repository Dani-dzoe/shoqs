import { Router } from 'express';
import { SystemController } from '../controllers/systemController.js';

export const systemRouter = Router();

systemRouter.post('/simulation/reset', SystemController.resetSimulation);
systemRouter.get('/events/stream', SystemController.handleSseStream);
