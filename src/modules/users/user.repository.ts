import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export enum UserRole {
    TENANT = 'TENANT',
    LANDLORD = 'LANDLORD',
    AGENT = 'AGENT'
}

export class UserRepository {
    async getOrCreateUser(phone: string) {
        return await prisma.user.upsert({
            where: { phone },
            update: {},
            create: {
                phone,
                role: UserRole.TENANT, // ברירת מחדל
                current_step: 'START',
                subscriptionStatus: false
            },
        });
    }

    async updateStep(phone: string, step: string, metadata: any = {}) {
        return await prisma.user.update({
            where: { phone },
            data: { current_step: step, metadata },
        });
    }

    // פונקציה לבדיקת סטטוס מנוי
    async checkSubscription(phone: string) {
        const user = await prisma.user.findUnique({
            where: { phone },
            select: {
                subscriptionStatus: true,
                planExpiresAt: true,
                role: true
            }
        });
        
        if (!user) return null;

        // Normalize planExpiresAt to a Date and compare timestamps to avoid type errors
        const planExpiresAt = user.planExpiresAt ? new Date(user.planExpiresAt) : null;
        const isExpired = planExpiresAt ? Date.now() > planExpiresAt.getTime() : true;
        
        return {
            isActive: user.subscriptionStatus && !isExpired,
            role: user.role
        };
    }
}