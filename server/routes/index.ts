import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { queueRouter } from './queueRoutes.js';
import { doctorRouter } from './doctorRoutes.js';
import { systemRouter } from './systemRoutes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/doctor', doctorRouter);
apiRouter.use(queueRouter);
apiRouter.use(systemRouter);
