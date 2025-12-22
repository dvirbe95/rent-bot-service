import { WhatsAppRepository } from './whatsapp.repository';
import { WASocket } from '@whiskeysockets/baileys';

export class WhatsAppController {
    private repository = new WhatsAppRepository();

    async handleIncoming(sock: WASocket, m: any) {
        const msg = m.messages[0];
        if (!msg.message) // || msg.key.fromMe) 
            return;

        const sender = msg.key.remoteJid!;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();

        if (!text) return;

        // שליפת/יצירת משתמש מה-DB
        const user = await this.repository.getOrCreateUser(sender);

        console.log(`📩 [WA] ${sender} (${user.current_step}): ${text}`);

        // ניהול Flow פשוט לצורך בדיקה
        if (text.toLowerCase() === 'שלום' || user.current_step === 'START') {
            await this.repository.updateStep(sender, 'CHOOSE_ROLE');
            return await sock.sendMessage(sender, { 
                text: "אהלן! אני הבוט של Rent-Bot. 🏠\nבחר את תפקידך:\n1. משכיר\n2. שוכר" 
            });
        }

        if (user.current_step === 'CHOOSE_ROLE') {
            const role = text === '1' ? 'landlord' : 'tenant';
            await this.repository.updateStep(sender, 'IDLE', { role });
            return await sock.sendMessage(sender, { 
                text: `נרשמת בהצלחה כ-${role === 'landlord' ? 'משכיר' : 'שוכר'}. איך אוכל לעזור?` 
            });
        }
    }
}