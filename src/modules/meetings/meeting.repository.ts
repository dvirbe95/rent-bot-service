import { PrismaClient, MeetingStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.client';

export class MeetingRepository {
  private prisma = PrismaService.getClient();

  async findByUserId(userId: string) {
    // מוצא את כל הפגישות שקשורות ללידים של הנכסים של המשתמש
    return await this.prisma.meeting.findMany({
      where: {
        lead: {
          apartment: {
            userId: userId
          }
        }
      },
      include: {
        lead: {
          include: {
            apartment: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });
  }

  async findById(id: string) {
    return await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            apartment: true
          }
        }
      }
    });
  }

  async updateStatus(id: string, status: MeetingStatus) {
    return await this.prisma.meeting.update({
      where: { id },
      data: { status }
    });
  }

  async delete(id: string) {
    return await this.prisma.meeting.delete({
      where: { id }
    });
  }
}
