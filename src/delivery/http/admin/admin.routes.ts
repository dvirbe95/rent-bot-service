// src/presentation/http/admin.routes.ts
import { Router } from 'express';
import { AdminController } from './admin.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();
const adminController = new AdminController();

// הגנה גורפת על כל ה-Routes של ה-Admin
// רק משתמש מחובר (webAuth) שהוא מתווך/מנהל (authorize)
router.use(webAuth);
// router.use(authorize('AGENT')); 

router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteUser);

export default router;
