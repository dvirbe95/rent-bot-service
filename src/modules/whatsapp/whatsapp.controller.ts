import { WhatsAppRepository } from './whatsapp.repository';
import { RagService } from '../rag/rag.service';
import { ApartmentRepository } from '../apartments/apartment.repository';
import { WASocket } from '@whiskeysockets/baileys';

export class WhatsAppController {
    private repository = new WhatsAppRepository();
    private ragService = new RagService();
    private apartmentRepository = new ApartmentRepository();

    async handleIncoming(sock: WASocket, m: any) {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;

            const sender = msg.key.remoteJid!;
            
            // 1. חילוץ טקסט מההודעה
            const text = (msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          "").trim();

            if (!text) return;

            // 2. מניעת לופ אינסופי (סינון הודעות שהבוט עצמו שלח)
            if (msg.key.fromMe) {
                const botResponses = [
                    "אהלן!", 
                    "נרשמת בהצלחה", 
                    "שנייה, אני מנתח", 
                    "זיהיתי את הפרטים", 
                    "מעולה! הדירה פורסמה"
                ];
                const isBotAction = botResponses.some(res => text.includes(res));
                if (isBotAction) return;
            }

            // 3. שליפת/יצירת משתמש מה-DB
            const user = await this.repository.getOrCreateUser(sender);
            console.log(`📩 [WA] ${sender} (${user.current_step}): ${text}`);

            // --- שלב 0: פקודת התחלה ---
            if (text.toLowerCase() === 'שלום' || user.current_step === 'START') {
                await this.repository.updateStep(sender, 'CHOOSE_ROLE');
                return await sock.sendMessage(sender, { 
                    text: "אהלן! אני הבוט של Rent-Bot. 🏠\nבחר את תפקידך:\n1. משכיר\n2. שוכר" 
                });
            }

            // --- שלב 1: בחירת תפקיד ---
            if (user.current_step === 'CHOOSE_ROLE') {
                const role = text === '1' ? 'landlord' : 'tenant';
                await this.repository.updateStep(sender, 'IDLE', { role });
                return await sock.sendMessage(sender, { 
                    text: `נרשמת בהצלחה כ-${role === 'landlord' ? 'משכיר' : 'שוכר'}. איך אוכל לעזור? (כתוב לי פרטי דירה או מה אתה מחפש)` 
                });
            }

            // --- שלב 2: ניתוח Gemini (RAG) ---
            if (user.current_step === 'IDLE' && text.length > 5) {
                console.log(`🤖 מפעיל Gemini עבור: ${sender}`);
                await sock.sendMessage(sender, { text: "שנייה, אני מנתח את הפרטים... 🔍" });

                const details = await this.ragService.extractApartmentDetails(text);

                if (details) {
                    // שמירת הפרטים שחולצו במטא-דאטה של המשתמש זמנית
                    await this.repository.updateStep(sender, 'CONFIRM_DETAILS', details);
                    
                    const responseText = `זיהיתי את הפרטים הבאים:\n` +
                        `📍 עיר: ${details.city || '❓'}\n` +
                        `🏠 חדרים: ${details.rooms || '❓'}\n` +
                        `💰 מחיר: ${details.price || '❓'}\n\n` +
                        `האם הפרטים נכונים? (ענה "כן" לאישור או "לא" לביטול)`;
                    
                    return await sock.sendMessage(sender, { text: responseText });
                }
            }

            // --- שלב 3: אישור ושמירה בבסיס הנתונים ---
            if (user.current_step === 'CONFIRM_DETAILS') {
                if (text.includes("כן")) {
                    const details = user.metadata as any;
                    
                    await sock.sendMessage(sender, { text: "יוצר פרסום ומחשב התאמה... ⏳" });

                    // יצירת וקטור (Embedding) מהתיאור והפרטים
                    const fullText = `${details.city} ${details.rooms} חדרים ${details.description || ''}`;
                    const embedding = await this.ragService.generateEmbedding(fullText);

                    // שמירת הדירה בטבלת apartments
                    await this.apartmentRepository.createApartment(
                        { ...details, phone_number: sender }, 
                        embedding
                    );

                    await this.repository.updateStep(sender, 'IDLE');
                    return await sock.sendMessage(sender, { text: "מעולה! הדירה פורסמה בהצלחה במערכת. 🚀" });
                } else if (!text.includes("לא")) {
                    await this.repository.updateStep(sender, 'IDLE');
                    return await sock.sendMessage(sender, { text: "פרטי הדירה נשמרו בהצלחה." });
                } else {
                    await this.repository.updateStep(sender, 'IDLE');
                    return await sock.sendMessage(sender, { text: "אין בעיה, ביטלתי את הפרסום. תוכל לשלוח פרטים חדשים מתי שתרצה." });
                }
            }

        } catch (error) {
            console.error('❌ Controller Error:', error);
        }
    }
}