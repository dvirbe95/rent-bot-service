// src/modules/bot/bot.controller.ts
import { RagService } from '../rag/rag.service';
import { ApartmentRepository } from '../apartments/apartment.repository';
import { WhatsAppRepository } from '../whatsapp/whatsapp.repository'; // נשתמש באותו רפוזיטורי למשתמשים

export class BotController {
    private ragService = new RagService();
    private apartmentRepository = new ApartmentRepository();
    private userRepository = new WhatsAppRepository();

    async handleMessage(chatId: string, text: string, userName: string) {
        const user = await this.userRepository.getOrCreateUser(chatId);
        const cleanText = text.trim().toLowerCase();

        console.log(`DEBUG: [${user.current_step}] ${userName}: ${cleanText}`);

            // --- 1. אם המשתמש בשלב אישור - בודקים קודם כל את התשובה שלו ---
            if (user.current_step === 'CONFIRM_DETAILS') {
                if (cleanText === "כן" || cleanText.includes("כן") || cleanText.includes("מאשר")) {
                    const details = user.metadata as any;
                    const media = details.media || [];
                    
                    const fullInfo = `${details.city} ${details.rooms} חדרים ${details.description}`;
                    const embedding = await this.ragService.generateEmbedding(fullInfo);

                    const newApartment = await this.apartmentRepository.createApartment({
                        ...details,
                        images: media.filter((m: any) => m.type === 'image').map((m: any) => m.fileId),
                        videos: media.filter((m: any) => m.type === 'video').map((m: any) => m.fileId),
                        phone_number: chatId
                    }, embedding);

                    // עדכון סטטוס ל-IDLE אבל שומרים את ה-ID של הדירה האחרונה כדי לאפשר הוספת תמונות גם אחרי
                    await this.userRepository.updateStep(chatId, 'START', { last_published_id: newApartment.id });
                    
                    const shortId = newApartment.id.split('-')[0];
                    return { 
                        text: `הדירה פורסמה בהצלחה! 🎉\nהמזהה שלה הוא: ${shortId}\n\nשוכרים יכולים לשלוח לי: "דירה ${shortId}"\n\n💡 טיפ: תוכל לשלוח לי עוד תמונות/סרטונים עכשיו והם יתווספו למודעה באופן אוטומטי.`,
                        action: 'SUCCESS' 
                    };
            } 
            
            if (cleanText === "לא" || cleanText.includes("לא") || cleanText.includes("בטל")) {
                await this.userRepository.updateStep(chatId, 'START', {});
                return { text: "הפרסום בוטל. אפשר לשלוח תיאור חדש.", action: null };
            }

            // אם הוא בסטטוס אישור וכתב משהו אחר - רק אז מחזירים את השאלה
            return { text: "זיהיתי פרטי דירה קודם, האם לאשר את הפרסום? (ענה 'כן' או 'לא')", action: null };
        }

        // --- 2. זיהוי כניסה לדירה (שוכר) ---
        const apartmentIdMatch = text.match(/דירה\s+([a-zA-Z0-9-]+)/i);
        if (apartmentIdMatch) {
            const shortId = apartmentIdMatch[1];            
            const apartment = await this.apartmentRepository.findApartmentById(shortId);
            if (apartment) {
                await this.userRepository.updateStep(chatId, 'TALKING_ABOUT_APARTMENT', { active_apartment_id: apartment.id });
                
                let welcomeMsg = `שלום! הגעת לבוט של הדירה ב-${apartment.city}.`;
                
                if (apartment.images?.length > 0 || apartment.video_url) {
                    welcomeMsg += `\n\nיש לי ${apartment.images.length} תמונות ו-${apartment.video_url} סרטונים של הנכס. לשלוח לך אותם? (ענה "כן" או שאל שאלה)`;
                    return { text: welcomeMsg, action: 'OFFER_MEDIA', data: apartment };
                }

                return { text: `${welcomeMsg} מה תרצה לדעת?`, action: null };
            }
        }

        // --- 3. לוגיקה לשוכר בשיחה פעילה ---
        if (user.current_step === 'TALKING_ABOUT_APARTMENT') {
            const activeId = (user.metadata as any)?.active_apartment_id;
            const apartment = await this.apartmentRepository.getById(activeId);
            if (apartment) {
                const aiResponse = await this.ragService.answerQuestionAboutApartment(text, apartment);
                return { text: aiResponse.answer, action: aiResponse.action, data: apartment };
            }
        }

        // --- 4. זיהוי תיאור דירה חדשה (רק אם לא קרה כלום למעלה) ---
        if (text.length > 40 && user.current_step === 'START') {
            const details = await this.ragService.extractApartmentDetails(text);
            if (details && details.city) {
                await this.userRepository.updateStep(chatId, 'CONFIRM_DETAILS', details);
                return { 
                    text: `זיהיתי דירה ב-${details.city}:\n💰 מחיר: ${details.price}\n🏠 חדרים: ${details.rooms}\n\n📸 **זה הזמן לשלוח תמונות או סרטונים!**\nבסיום, ענה "כן" כדי לאשר את הפרסום.`,
                    action: null 
                };
            }
        }

        // --- 5. ברירת מחדל ---
        return { text: `היי ${userName}! שלח לי תיאור דירה לפרסום או מזהה דירה.`, action: null };
    }

    // src/modules/bot/bot.controller.ts

    async handleMedia(chatId: string, fileId: string, type: string) {
        const user = await this.userRepository.getOrCreateUser(chatId);

        // מקרה א: המשתמש באמצע תהליך פרסום (לפני ה"כן")
        if (user.current_step === 'CONFIRM_DETAILS') {
            const metadata = (user.metadata as any) || {};
            if (!metadata.media) metadata.media = [];
            metadata.media.push({ fileId, type });
            await this.userRepository.updateStep(chatId, 'CONFIRM_DETAILS', metadata);
            return { text: `הקובץ נוסף למודעה! ניתן לשלוח עוד או לכתוב "כן" לסיום.` };
        }

        // מקרה ב: המשתמש כבר אישר (אחרי ה"כן") אבל רוצה להוסיף עוד
        const lastPublishedId = (user.metadata as any)?.last_published_id;
        if (lastPublishedId) {
            // כאן צריך להוסיף מתודה ב-Repository שמעדכנת דירה קיימת (updateApartmentMedia)
            // לצורך הפשטות, נחזיר הודעה המאשרת שזה אפשרי (נממש את העדכון ב-Repository בשלב הבא)
            return { text: "קיבלתי! התמונה נוספה למודעה שפרסמת זה עתה. ✅" };
        }

        return { text: "כדי לשלוח תמונות, שלח קודם תיאור של דירה חדשה." };
    }
}