import { Request, Response } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

export class PaymentController {
    private stripe: Stripe | null = null;

    private getStripe() {
        if (!this.stripe) {
            const apiKey = process.env.STRIPE_SECRET_KEY;
            if (!apiKey) {
                throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
            }
            this.stripe = new Stripe(apiKey, {
                apiVersion: '2024-11-20.acacia' as any,
            });
        }
        return this.stripe;
    }

    async createPaymentIntent(req: Request, res: Response) {
        try {
            const { amount, currency = 'ils' } = req.body;
            
            // בדיקה אם קיים מפתח Stripe, אם לא - נחזיר סוד פיקטיבי לצורכי פיתוח
            if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key') {
                console.log('⚠️ Stripe Key missing, using mock payment intent');
                return res.json({
                    clientSecret: 'mock_secret_' + Math.random().toString(36).substring(7),
                });
            }

            const stripe = this.getStripe();
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100,
                currency,
                automatic_payment_methods: { enabled: true },
            });

            res.json({ clientSecret: paymentIntent.client_secret });
        } catch (error: any) {
            console.error('Stripe Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
