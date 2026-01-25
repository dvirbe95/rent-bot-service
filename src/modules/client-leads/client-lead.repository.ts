import { PrismaClient, LeadStatus, SenderType } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.client';

export class ClientLeadRepository {
  private prisma = PrismaService.getClient();

  async create(data: {
    apartmentId: string;
    tenantChatId: string;
    tenantName?: string;
    tenantPhone?: string;
    tenantEmail?: string;
  }) {
    return await this.prisma.clientLead.create({
      data: {
        ...data,
        status: 'NEW' as LeadStatus,
      },
      include: {
        apartment: true,
      },
    });
  }

  async findById(id: string) {
    return await this.prisma.clientLead.findUnique({
      where: { id },
      include: {
        apartment: true,
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  async findByApartmentId(apartmentId: string) {
    return await this.prisma.clientLead.findMany({
      where: { apartmentId },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1, // רק ההודעה האחרונה
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findByUserId(userId: string, filters: any = {}) {
    const { search, status, apartmentId } = filters;

    const apartments = await this.prisma.apartment.findMany({
      where: { userId },
      select: { id: true },
    });

    const apartmentIds = apartments.map((apt) => apt.id);

    return await this.prisma.clientLead.findMany({
      where: {
        apartmentId: apartmentId ? apartmentId : { in: apartmentIds },
        status: status ? status : undefined,
        OR: search ? [
          { tenantName: { contains: search, mode: 'insensitive' } },
          { tenantPhone: { contains: search, mode: 'insensitive' } },
          { tenantEmail: { contains: search, mode: 'insensitive' } },
        ] : undefined
      },
      include: {
        apartment: true,
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: LeadStatus) {
    return await this.prisma.clientLead.update({
      where: { id },
      data: { status },
    });
  }

  async addMessage(leadId: string, data: {
    senderType: SenderType;
    content: string;
  }) {
    // מוסיף הודעה ועדכן את lastMessageAt
    const [message] = await Promise.all([
      this.prisma.leadMessage.create({
        data: {
          leadId,
          ...data,
        },
      }),
      this.prisma.clientLead.update({
        where: { id: leadId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return message;
  }

  async getOrCreateLead(apartmentId: string, tenantChatId: string, tenantName?: string) {
    // מחפש ליד קיים
    const existing = await this.prisma.clientLead.findFirst({
      where: {
        apartmentId,
        tenantChatId,
      },
    });

    if (existing) {
      return existing;
    }

    // יוצר ליד חדש
    return await this.create({
      apartmentId,
      tenantChatId,
      tenantName,
    });
  }

  async findByApartmentAndTenant(apartmentId: string, tenantChatId: string) {
    return await this.prisma.clientLead.findFirst({
      where: {
        apartmentId,
        tenantChatId,
      },
    });
  }
}
