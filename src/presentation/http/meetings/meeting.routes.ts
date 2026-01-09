import { Router } from 'express';
import { MeetingController } from './meeting.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();
const controller = new MeetingController();

router.use(webAuth);

router.get('/', controller.list);
router.patch('/:id/status', controller.updateStatus);
router.delete('/:id', controller.delete);

export default router;
