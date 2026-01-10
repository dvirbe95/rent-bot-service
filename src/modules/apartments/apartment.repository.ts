import { PrismaService } from '../../common/database/prisma.client';

export class ApartmentRepository {
    private prisma = PrismaService.getClient();

    async createApartment(data: any, embedding: number[]): Promise<any> {
        const { 
            city, price, rooms, description, address, images, availability, userId, video_url,
            floor, sqm, arnona, vaadBayit, collateral, priceFlexibility, entryDate,
            balcony, shelter, mamad, furnished, petsAllowed, parking, elevator,
            nearbyConstruction, neighbors, commercialCenter, schools, entertainmentAreas,
            contactPhone, documents
        } = data;
        
        return await this.prisma.apartment.create({
            data: {
                city,
                price: parseFloat(price),
                rooms: parseFloat(rooms),
                description,
                address,
                floor: floor ? parseInt(floor) : null,
                sqm: sqm ? parseInt(sqm) : null,
                arnona: arnona ? parseFloat(arnona) : null,
                vaadBayit: vaadBayit ? parseFloat(vaadBayit) : null,
                collateral,
                priceFlexibility: !!priceFlexibility,
                entryDate: entryDate ? new Date(entryDate) : null,
                balcony: !!balcony,
                shelter: !!shelter,
                mamad: !!mamad,
                furnished: !!furnished,
                petsAllowed: petsAllowed !== undefined ? !!petsAllowed : true,
                parking: !!parking,
                elevator: !!elevator,
                nearbyConstruction: !!nearbyConstruction,
                neighbors,
                commercialCenter,
                schools,
                entertainmentAreas,
                contactPhone,
                images: images || [],
                documents: documents || [],
                availability: availability || [],
                video_url: video_url || null,
                embeddings: embedding,
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
        // רשימת השדות המותרים לעדכון ב-Prisma
        const allowedFields = [
            'city', 'price', 'rooms', 'description', 'address', 'floor', 'sqm',
            'arnona', 'vaadBayit', 'collateral', 'priceFlexibility', 'entryDate',
            'balcony', 'shelter', 'mamad', 'furnished', 'petsAllowed', 'parking',
            'elevator', 'nearbyConstruction', 'neighbors', 'commercialCenter',
            'schools', 'entertainmentAreas', 'contactPhone', 'images', 'documents',
            'availability', 'video_url', 'embeddings'
        ];

        const formattedData: any = {};
        
        // העתקה רק של שדות קיימים ומותרים
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                formattedData[field] = data[field];
            }
        }

        // המרות טיפוסים
        if (formattedData.price !== undefined) formattedData.price = parseFloat(formattedData.price);
        if (formattedData.rooms !== undefined) formattedData.rooms = parseFloat(formattedData.rooms);
        if (formattedData.floor !== undefined) formattedData.floor = formattedData.floor ? parseInt(formattedData.floor) : null;
        if (formattedData.sqm !== undefined) formattedData.sqm = formattedData.sqm ? parseInt(formattedData.sqm) : null;
        if (formattedData.arnona !== undefined) formattedData.arnona = formattedData.arnona ? parseFloat(formattedData.arnona) : null;
        if (formattedData.vaadBayit !== undefined) formattedData.vaadBayit = formattedData.vaadBayit ? parseFloat(formattedData.vaadBayit) : null;
        if (formattedData.entryDate !== undefined) formattedData.entryDate = formattedData.entryDate ? new Date(formattedData.entryDate) : null;
        if (formattedData.priceFlexibility !== undefined) formattedData.priceFlexibility = !!formattedData.priceFlexibility;
        if (formattedData.balcony !== undefined) formattedData.balcony = !!formattedData.balcony;
        if (formattedData.shelter !== undefined) formattedData.shelter = !!formattedData.shelter;
        if (formattedData.mamad !== undefined) formattedData.mamad = !!formattedData.mamad;
        if (formattedData.furnished !== undefined) formattedData.furnished = !!formattedData.furnished;
        if (formattedData.petsAllowed !== undefined) formattedData.petsAllowed = !!formattedData.petsAllowed;
        if (formattedData.parking !== undefined) formattedData.parking = !!formattedData.parking;
        if (formattedData.elevator !== undefined) formattedData.elevator = !!formattedData.elevator;
        if (formattedData.nearbyConstruction !== undefined) formattedData.nearbyConstruction = !!formattedData.nearbyConstruction;

        return await this.prisma.apartment.update({
            where: { id },
            data: formattedData
        });
    }

    async addMedia(id: string, fileId: string, type: string) {
        if (type === 'image') {
            return await this.prisma.apartment.update({
                where: { id },
                data: {
                    images: {
                        push: fileId
                    }
                }
            });
        } else if (type === 'document') {
            return await this.prisma.apartment.update({
                where: { id },
                data: {
                    documents: {
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

    async findByUserId(userId: string, filters: any = {}) {
        const { search, city, minPrice, maxPrice } = filters;
        
        return await this.prisma.apartment.findMany({
            where: {
                userId,
                AND: [
                    city ? { city: { contains: city, mode: 'insensitive' } } : {},
                    minPrice ? { price: { gte: parseFloat(minPrice) } } : {},
                    maxPrice ? { price: { lte: parseFloat(maxPrice) } } : {},
                    search ? {
                        OR: [
                            { address: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                            { city: { contains: search, mode: 'insensitive' } }
                        ]
                    } : {}
                ]
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async delete(id: string) {
        return await this.prisma.apartment.delete({
            where: { id },
        });
    }
}
