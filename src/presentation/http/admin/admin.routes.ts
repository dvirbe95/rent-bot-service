import { Router } from 'express';
import { AdminController } from './admin.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();
const controller = new AdminController();

router.use(webAuth);

router.get('/users', controller.listUsers);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);

export default router;
