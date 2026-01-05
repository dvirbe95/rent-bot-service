import { PrismaClient } from '@prisma/client';

export class PrismaService {
    private static instance: PrismaClient;

    public static getClient(): PrismaClient {
        if (!PrismaService.instance) {
            PrismaService.instance = new PrismaClient();
        }
        return PrismaService.instance;
    }
}