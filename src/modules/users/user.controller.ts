// src/modules/users/user.controller.ts (או קובץ דומה)
import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export const mockLogin = async (req: Request, res: Response) => {
    const { phone, role, subscriptionStatus, planExpiresAt, lastLogin } = req.body;

    try {
        const user = await prisma.user.upsert({
            where: { phone: phone.toString() },
            update: {
                role: role as Role,
                subscriptionStatus: subscriptionStatus ?? true,
                planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
                lastLogin: lastLogin ? new Date(lastLogin) : new Date(),
                current_step: 'START'
            },
            create: {
                phone: phone.toString(),
                role: role as Role,
                subscriptionStatus: subscriptionStatus ?? true,
                planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
                lastLogin: lastLogin ? new Date(lastLogin) : new Date(),
                current_step: 'START'
            }
        });

        res.json({ message: "User updated successfully for testing", user });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};