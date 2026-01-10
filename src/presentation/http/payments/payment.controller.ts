import { Request, Response } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia' as any,
});

export class PaymentController {
    async createPaymentIntent(req: Request, res: Response) {
        try {
            const { amount, currency = 'ils' } = req.body;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100, // Stripe works with cents/agorot
                currency,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.json({
                clientSecret: paymentIntent.client_secret,
            });
        } catch (error: any) {
            console.error('Stripe Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
