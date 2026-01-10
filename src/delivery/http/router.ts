// src/delivery/http/router.ts
import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import adminRoutes from './admin/admin.routes';
import apartmentRoutes from '../../presentation/http/apartments/apartment.routes';
import clientLeadRoutes from '../../presentation/http/client-leads/client-lead.routes';
import postRoutes from '../../presentation/http/posts/post.routes';
import meetingRoutes from '../../presentation/http/meetings/meeting.routes';
import uploadRoutes from '../../presentation/http/upload/upload.routes';

const rootRouter = Router();

// ריכוז כל הנתיבים תחת ה-Prefix של ה-API
rootRouter.use('/auth', authRoutes);
rootRouter.use('/admin', adminRoutes);
rootRouter.use('/apartments', apartmentRoutes);
rootRouter.use('/client-leads', clientLeadRoutes);
rootRouter.use('/posts', postRoutes);
rootRouter.use('/meetings', meetingRoutes);
rootRouter.use('/upload', uploadRoutes);

export default rootRouter;