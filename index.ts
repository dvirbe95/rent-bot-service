// main.ts
import { TelegramService } from './src/modules/telegram/telegram.service';
import { BotController } from './src/modules/bot/bot.controller';
import { RagService } from './src/modules/rag/rag.service';
import { ApartmentRepository } from './src/modules/apartments/apartment.repository';
import { UserRepository } from './src/modules/users/user.repository';

async function main() {
    console.log('🚀 Starting System...');

    // 1. אתחול תשתיות (Services & Repos)
    const ragService = new RagService();
    const apartmentRepo = new ApartmentRepository();
    const userRepo = new UserRepository();

    // 2. אתחול הקונטרולר המרכזי (המוח)
    const botController = new BotController(ragService, apartmentRepo, userRepo);

    // 3. אתחול הערוצים (Telegram / WhatsApp)
    // שניהם מקבלים את אותו botController בדיוק!
    const telegramBot = new TelegramService(process.env.TELEGRAM_BOT_TOKEN!, botController);
    // const whatsappBot = new WhatsAppService(botController); 

    try {
        await telegramBot.init();
        console.log('✅ Telegram Bot is Live');
        
        // await whatsappBot.init();
    } catch (error) {
        console.error('❌ Failed to start services:', error);
    }
}

main();