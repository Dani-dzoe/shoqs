import { Router } from 'express';
import { DoctorController } from '../controllers/doctorController.js';
import { authenticateToken, requireRoles } from '../middlewares/authMiddleware.js';

export const doctorRouter = Router();

doctorRouter.use(authenticateToken);
doctorRouter.use(requireRoles(['Doctor', 'Admin']));

doctorRouter.post('/call-next', DoctorController.callNextPatient);
doctorRouter.post('/complete-consultation', DoctorController.completeConsultation);
doctorRouter.post('/recall', DoctorController.recallPatient);
