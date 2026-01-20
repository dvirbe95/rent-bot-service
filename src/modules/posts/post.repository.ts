import { PrismaClient, PostPlatform } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.client';

export class PostRepository {
  private prisma = PrismaService.getClient();

  async create(data: {
    apartmentId: string;
    userId: string;
    content: string;
    platform: PostPlatform;
  }) {
    return await this.prisma.post.create({
      data,
      include: {
        apartment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return await this.prisma.post.findUnique({
      where: { id },
      include: {
        apartment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return await this.prisma.post.findMany({
      where: { userId },
      include: {
        apartment: {
          select: {
            id: true,
            city: true,
            price: true,
            rooms: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByApartmentId(apartmentId: string) {
    return await this.prisma.post.findMany({
      where: { apartmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePublishedAt(id: string, publishedAt: Date) {
    return await this.prisma.post.update({
      where: { id },
      data: { publishedAt },
    });
  }

  async delete(id: string) {
    return await this.prisma.post.delete({
      where: { id },
    });
  }
}
