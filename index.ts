// index.ts
import express from 'express';
import rootRouter from './src/delivery/http/router';
import { RagService } from './src/modules/rag/rag.service';
import { mockLogin } from './src/modules/users/user.controller';
import { BotController } from './src/delivery/bot/bot.controller';
import { UserRepository } from './src/modules/users/user.repository';
import { TelegramService } from './src/delivery/telegram/telegram.service';
import { ApartmentRepository } from './src/modules/apartments/apartment.repository';

async function main() {
    console.log('🚀 Starting System...');

    const app = express();
    app.use(express.json()); // חובה כדי לקרוא JSON מ-Postman

    // 1. אתחול תשתיות
    const ragService = new RagService();
    const apartmentRepo = new ApartmentRepository();
    const userRepo = new UserRepository();

    // 2. אתחול הקונטרולר המרכזי
    const botController = new BotController(ragService, apartmentRepo, userRepo);

    // 3. אתחול הבוט
    const telegramBot = new TelegramService(process.env.TELEGRAM_BOT_TOKEN!, botController, app);

    app.use('/api', rootRouter);  // כתובות כמו /api/auth/login

    // --- 4. הגדרת ה-Route ל-Postman (חדש) ---
    app.post('/api/users/mock-login', mockLogin);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 API Server is running on http://localhost:${PORT}`);
    });

    try {
        await telegramBot.init();
        console.log('✅ Telegram Bot is Live');
    } catch (error) {
        console.error('❌ Failed to start services:', error);
    }
}

main();