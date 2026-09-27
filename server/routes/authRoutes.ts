import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken, requireRoles } from '../middlewares/authMiddleware.js';

export const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/signup', AuthController.signup);
authRouter.post('/google', AuthController.googleAuth);
authRouter.get('/me', authenticateToken, AuthController.getMe);
authRouter.post('/logout', authenticateToken, AuthController.logout);
authRouter.get('/sessions', authenticateToken, requireRoles(['Admin', 'Doctor']), AuthController.getSessions);
authRouter.get('/audit-logs', AuthController.getAuditLogs);
authRouter.post('/audit-logs', AuthController.postAuditLog);
