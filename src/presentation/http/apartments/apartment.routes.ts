// src/presentation/http/apartments/apartment.routes.ts
import { Router } from 'express';
import { ApartmentController } from './apartment.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();
const apartmentController = new ApartmentController();

// נתיב ציבורי לצפייה בפרופיל נכס (ללא התחברות)
router.get('/public/:id', apartmentController.getPublicById);

// כל שאר ה-Routes מוגנים ב-webAuth
router.use(webAuth);

router.post('/', apartmentController.create);
router.get('/', apartmentController.list);
router.get('/:id', apartmentController.getById);
router.put('/:id', apartmentController.update);
router.delete('/:id', apartmentController.delete);

export default router;
