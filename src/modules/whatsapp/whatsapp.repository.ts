import { PrismaService } from '../../common/database/prisma.client';

export class WhatsAppRepository {
    private prisma = PrismaService.getClient();

    async getOrCreateUser(phone: string) {
        return await this.prisma.user.upsert({
            where: { phone: phone },
            update: {}, // אם קיים, אל תשנה כלום
            create: { 
                phone: phone, 
                current_step: 'START' 
            }
        });
    }

    async updateStep(phone: string, step: string, metadata: any = {}) {
        return await this.prisma.user.update({
            where: { phone: phone },
            data: { 
                current_step: step,
                metadata: metadata 
            }
        });
    }
}