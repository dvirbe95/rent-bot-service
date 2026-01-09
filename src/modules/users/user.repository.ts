import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// הערה: עדיף להשתמש ב-Role של Prisma ישירות כדי למנוע כפילות
export class UserRepository {
    
    // --- מתודות קיימות (מעודכנות קלות) ---

    async getOrCreateUser(phone: string) {
        return await prisma.user.upsert({
            where: { phone },
            update: {},
            create: {
                phone,
                role: Role.TENANT, // שימוש ב-Enum של Prisma
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

        const planExpiresAt = user.planExpiresAt ? new Date(user.planExpiresAt) : null;
        const isExpired = planExpiresAt ? Date.now() > planExpiresAt.getTime() : true;
        
        return {
            isActive: user.subscriptionStatus && !isExpired,
            role: user.role
        };
    }

    async updateUserRole(phone: string, role: Role) {
        return await prisma.user.update({
            where: { phone },
            data: { 
                role: role,
                metadata: { role_selected: true }
            },
        });
    }

    // --- מתודות חדשות עבור Web App Auth ---

    async findByEmail(email: string) {
        return await prisma.user.findUnique({
            where: { email },
        });
    }

    async createUser(userData: { 
        email: string; 
        password?: string; 
        name?: string; 
        role: Role; 
        phone?: string 
    }) {
        return await prisma.user.create({
            data: {
                email: userData.email,
                password: userData.password,
                name: userData.name,
                role: userData.role,
                // אם המשתמש נרשם מה-Web ואין לו טלפון, ניצור מזהה פנימי
                phone: userData.phone || `web_${userData.email}_${Date.now()}`,
                current_step: 'COMPLETED_WEB_REG',
                subscriptionStatus: userData.role === Role.AGENT ? false : true // מתווך מתחיל ללא מנוי
            }
        });
    }

    async findById(id: string) {
        return await prisma.user.findUnique({
            where: { id }
        });
    }

    async updateLastLogin(id: string) {
        return await prisma.user.update({
            where: { id },
            data: { lastLogin: new Date() }
        });
    }

    async getAllUsers() {
        return await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: { // לא נרצה להחזיר סיסמאות בדף ניהול
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                subscriptionStatus: true,
                createdAt: true,
                lastLogin: true
            }
        });
    }

    // מחיקת משתמש
    async deleteUser(id: string) {
        return await prisma.user.delete({
            where: { id }
        });
    }

    async updateUser(id: string, data: any) {
        return await prisma.user.update({
            where: { id },
            data
        });
    }
}