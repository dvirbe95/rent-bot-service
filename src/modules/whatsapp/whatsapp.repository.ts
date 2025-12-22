import { PrismaService } from '../../common/database/prisma.client';

export class WhatsAppRepository {
    private prisma = PrismaService.getClient();

    async getOrCreateUser(phone: string) {
        return await this.prisma.user.upsert({
            where: { phone_number: phone },
            update: {}, // אם קיים, אל תשנה כלום
            create: { 
                phone_number: phone, 
                current_step: 'START' 
            }
        });
    }

    async updateStep(phone: string, step: string, metadata: any = {}) {
        return await this.prisma.user.update({
            where: { phone_number: phone },
            data: { 
                current_step: step,
                metadata: metadata 
            }
        });
    }
}