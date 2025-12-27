import { PrismaService } from '../../common/database/prisma.client';

export class ApartmentRepository {
    private prisma = PrismaService.getClient();

async createApartment(data: any, embedding: number[]): Promise<any> {
    const { city, price, rooms, description, address, phone_number, calendar_link, images } = data;
    
    // השתמש ב-$queryRaw כדי לקבל את הנתונים חזרה מה-DB
    const result = await this.prisma.$queryRaw<any[]>`
        INSERT INTO apartments (
            id, city, price, rooms, description, address, 
            phone_number, calendar_link, images, embedding
        )
        VALUES (
            gen_random_uuid(), 
            ${city}, 
            ${price}::float, 
            ${rooms}::float, 
            ${description}, 
            ${address}, 
            ${phone_number}, 
            ${calendar_link}, 
            ${images || []}, 
            ${embedding}::vector
        )
        RETURNING id, city, price, rooms; -- אנחנו מבקשים את השדות חזרה
        `;
        
        // result הוא מערך, אנחנו רוצים את האיבר הראשון (הדירה שנוצרה)
        return result[0]; 
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

    // שליפת דירה לפי ID מלא
    async getById(id: string) {
        return await this.prisma.apartment.findUnique({
            where: { id }
        });
    }
}