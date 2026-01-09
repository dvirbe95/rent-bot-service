// src/presentation/http/client-leads/client-lead.routes.ts
import { Router } from 'express';
import { ClientLeadController } from './client-lead.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();
const clientLeadController = new ClientLeadController();

// כל ה-Routes מוגנים ב-webAuth
router.use(webAuth);

router.get('/', clientLeadController.list);
router.get('/:id', clientLeadController.getById);
router.get('/:id/conversation', clientLeadController.getConversation);
router.put('/:id/status', clientLeadController.updateStatus);
router.post('/:id/message', clientLeadController.sendMessage);

export default router;
