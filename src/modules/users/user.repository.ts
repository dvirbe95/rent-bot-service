import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.client';

export class UserRepository {
    private prisma = PrismaService.getClient();

    async getOrCreateUser(chatId: string, name?: string) {
        return await this.prisma.user.upsert({
            where: { chatId },
            update: { name: name },
            create: {
                chatId,
                name,
                role: UserRole.TENANT,
                current_step: 'START',
                subscriptionStatus: false
            },
        });
    }

    async findByPhone(phone: string) {
        return await this.prisma.user.findUnique({
            where: { phone }
        });
    }

    async linkChatIdToPhone(phone: string, chatId: string) {
        return await this.prisma.user.update({
            where: { phone },
            data: { chatId }
        });
    }

    async updateStep(chatId: string, step: string, metadata: any = {}) {
        return await this.prisma.user.update({
            where: { chatId },
            data: { 
                current_step: step, 
                metadata: metadata 
            },
        });
    }

    async checkSubscription(phone: string) {
        const user = await this.prisma.user.findUnique({
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

    async updateUserRole(phone: string, role: UserRole) {
        return await this.prisma.user.update({
            where: { phone },
            data: { 
                role: role,
                metadata: { role_selected: true }
            },
        });
    }

    async findByEmail(email: string) {
        return await this.prisma.user.findUnique({
            where: { email },
        });
    }

    async createUser(userData: { 
        email: string; 
        password?: string; 
        name?: string; 
        role: UserRole; 
        phone?: string 
    }) {
        return await this.prisma.user.create({
            data: {
                email: userData.email,
                password: userData.password,
                name: userData.name,
                role: userData.role,
                phone: userData.phone || `web_${userData.email}_${Date.now()}`,
                current_step: 'COMPLETED_WEB_REG',
                subscriptionStatus: userData.role === UserRole.AGENT ? false : true 
            }
        });
    }

    async findById(id: string) {
        return await this.prisma.user.findUnique({
            where: { id }
        });
    }

    async updateLastLogin(id: string) {
        return await this.prisma.user.update({
            where: { id },
            data: { lastLogin: new Date() }
        });
    }

    async getAllUsers() {
        return await this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
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

    async deleteUser(id: string) {
        return await this.prisma.user.delete({
            where: { id }
        });
    }

    async updateUser(id: string, data: any) {
        return await this.prisma.user.update({
            where: { id },
            data
        });
    }
}
