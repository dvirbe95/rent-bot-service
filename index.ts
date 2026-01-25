// index.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import rootRouter from './src/delivery/http/router';
import { RagService } from './src/modules/rag/rag.service';
import { mockLogin } from './src/modules/users/user.controller';
import { BotController } from './src/delivery/bot/bot.controller';
import { UserRepository } from './src/modules/users/user.repository';
import { TelegramService } from './src/delivery/telegram/telegram.service';
import { ApartmentRepository } from './src/modules/apartments/apartment.repository';
import { NotificationService } from './src/modules/notifications/notification.service';
import { CalendarService } from './src/modules/calendar/calendar.service';

async function main() {
    console.log('🚀 Starting System...');

    const app = express();
    
    app.use(cors({
        origin: ['http://localhost:4200', 'http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    app.use(express.json());
    app.use('/uploads', express.static('uploads'));

    // 1. אתחול תשתיות בסיס
    const apartmentRepo = new ApartmentRepository();
    const userRepo = new UserRepository();
    const ragService = new RagService();
    const calendarService = new CalendarService();

    // 2. אתחול בוט וקונטרולר
    const botController = new BotController(ragService, apartmentRepo, userRepo);
    const telegramBot = new TelegramService(process.env.TELEGRAM_BOT_TOKEN!, botController, app);

    // 3. אתחול שירות התראות (מחובר לבוט)
    const notificationService = new NotificationService(telegramBot, calendarService);
    telegramBot.setNotificationService(notificationService);

    // 4. הגדרת נתיבי API
    app.use('/api', rootRouter);
    app.post('/api/users/mock-login', mockLogin);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 API Server is running on http://localhost:${PORT}`);
    });

    try {
        // אתחול הבוט (Launch)
        await telegramBot.init();
        console.log('✅ Telegram Bot is Live and Polling...');
    } catch (error) {
        console.error('❌ Failed to start Telegram Bot:', error);
    }
}

main().catch(err => {
    console.error('💥 Fatal error during system startup:', err);
});
