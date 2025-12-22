import { WhatsAppService } from './src/modules/whatsapp/whatsapp.service';

async function main() {
    console.log('🚀 Starting System...');

    // אתחול מודול וואטסאפ בלבד
    const whatsapp = new WhatsAppService();
    
    try {
        await whatsapp.initialize();
    } catch (error) {
        console.error('❌ Failed to start WhatsApp service:', error);
    }
}

main();