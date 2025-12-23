import { PrismaService } from '../../common/database/prisma.client';

export class ApartmentRepository {
    private prisma = PrismaService.getClient();

    async createApartment(data: any, embedding: number[]) {
        // בגלל ששדה הוקטור הוא Unsupported בפריזמה, נשתמש ב-Raw SQL לשמירה
        const { city, price, rooms, description, phone_number } = data;
        
        return await this.prisma.$executeRaw`
            INSERT INTO apartments (id, city, price, rooms, description, phone_number, embedding)
            VALUES (
                gen_random_uuid(), 
                ${city}, 
                ${price}, 
                ${rooms}, 
                ${description}, 
                ${phone_number}, 
                ${embedding}::vector
            )
        `;
    }
}