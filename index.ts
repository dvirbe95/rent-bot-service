import { WhatsAppService } from './src/modules/whatsapp/whatsapp.service';
import { TelegramService } from './src/modules/chats/telegram.service';

async function main() {
    console.log('🚀 Starting System...');

    // אתחול מודול וואטסאפ בלבד
    // const whatsapp = new WhatsAppService();
    const telegramBot = new TelegramService(process.env.TELEGRAM_BOT_TOKEN!);

    try {
        // await whatsapp.initialize();
        telegramBot.init();

    } catch (error) {
        console.error('❌ Failed to start WhatsApp service:', error);
    }
}

main();