import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();
const paymentController = new PaymentController();

// אנחנו לא שמים webAuth כאן כי זה קורה בזמן הרשמה, כשהמשתמש עוד לא מחובר
router.post('/create-intent', (req, res) => paymentController.createPaymentIntent(req, res));

export default router;
