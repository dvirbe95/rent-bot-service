// src/presentation/http/router.ts
import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import adminRoutes from './../http/admin/admin.routes';
// כאן תוסיף בעתיד: import apartmentRoutes from './apartment.routes';

const rootRouter = Router();

// ריכוז כל הנתיבים תחת ה-Prefix של ה-API
rootRouter.use('/auth', authRoutes);
rootRouter.use('/admin', adminRoutes);

export default rootRouter;