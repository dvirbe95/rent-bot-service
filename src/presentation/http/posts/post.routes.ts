// src/presentation/http/posts/post.routes.ts
import { Router } from 'express';
import { PostController } from './post.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();
const postController = new PostController();

// כל ה-Routes מוגנים ב-webAuth
router.use(webAuth);

router.post('/generate', postController.generatePost);
router.get('/', postController.list);
router.get('/:id', postController.getById);
router.post('/:id/publish', postController.publish);
router.delete('/:id', postController.delete);

export default router;
