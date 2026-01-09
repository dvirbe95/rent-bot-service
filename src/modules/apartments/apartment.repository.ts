import { PrismaService } from '../../common/database/prisma.client';

export class ApartmentRepository {
    private prisma = PrismaService.getClient();

    async createApartment(data: any, embedding: number[]): Promise<any> {
        const { city, price, rooms, description, address, images, availability, userId, video_url } = data;
        
        return await this.prisma.apartment.create({
            data: {
                city,
                price: parseFloat(price),
                rooms: parseFloat(rooms),
                description,
                address,
                images: images || [],
                availability: availability || [],
                video_url: video_url || null,
                embeddings: embedding, // שים לב: ב-Schema השדה נקרא embeddings
                userId: userId
            }
        });
    }

    async findApartmentById(shortId: string) {
        return await this.prisma.apartment.findFirst({
            where: {
                id: {
                    startsWith: shortId
                }
            }
        });
    }

    async getById(idOrShortId: string) {
        let apartment = await this.prisma.apartment.findUnique({
            where: { id: idOrShortId }
        });

        if (!apartment) {
            apartment = await this.prisma.apartment.findFirst({
                where: {
                    id: {
                        startsWith: idOrShortId
                    }
                }
            });
        }

        return apartment;
    }

    async updateApartment(id: string, data: any) {
        return await this.prisma.apartment.update({
            where: { id },
            data: data
        });
    }

    async addMedia(id: string, fileId: string, type: string) {
        // ב-Schema החדשה יש לנו רק images ו-video_url (String)
        if (type === 'image') {
            return await this.prisma.apartment.update({
                where: { id },
                data: {
                    images: {
                        push: fileId
                    }
                }
            });
        } else {
            return await this.prisma.apartment.update({
                where: { id },
                data: {
                    video_url: fileId
                }
            });
        }
    }

    async findByUserId(userId: string) {
        return await this.prisma.apartment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async delete(id: string) {
        return await this.prisma.apartment.delete({
            where: { id },
        });
    }
}
