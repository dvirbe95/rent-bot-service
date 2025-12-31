import { BaseFlow } from './base.flow';
import { BotResponse } from "../../../../common/interfaces/messaging.interface";

export class LandlordFlow extends BaseFlow {
    async handle(chatId: string, text: string, user: any, userName: string): Promise<BotResponse> {
        const cleanText = text.trim().toLowerCase();
        const lastApartmentId = user.metadata?.last_published_id;

        // 1. עדכון זמינות למשכיר קיים (לוגיקה מקורית)
        if (lastApartmentId && (cleanText.includes("פנוי") || cleanText.includes("זמינות"))) {
            const slots = await this.ragService.extractAvailability(text);
            await this.apartmentRepo.updateApartment(lastApartmentId, { availability: slots });
            return { text: "מעולה! הגדרתי שאתה פנוי במועדים האלו. שוכרים יכולים לתאם כעת. 📅" };
        }

        // 2. טיפול לפי שלב (State Machine)
        switch (user.current_step) {
            case 'CONFIRM_DETAILS':
                return await this.handleConfirmDetails(chatId, text, user);
            
            default:
                // זיהוי תיאור דירה חדשה (לוגיקה מקורית - מעל 40 תווים)
                if (text.length > 40) {
                    const details = await this.ragService.extractApartmentDetails(text);
                    if (details?.city) {
                        await this.userRepo.updateStep(chatId, 'CONFIRM_DETAILS', details);
                        return { 
                            text: `זיהיתי דירה ב-${details.city}:\n💰 מחיר: ${details.price}\n🏠 חדרים: ${details.rooms}\n\n📸 שלח תמונות עכשיו (אחת אחת או בבת אחת), ובסיום כתוב "כן" לאישור.`,
                        };
                    }
                }
                return { text: `היי ${userName}! שלח לי תיאור דירה לפרסום או עדכן זמינות לנכס קיים.` };
        }
    }

    private async handleConfirmDetails(chatId: string, text: string, user: any): Promise<BotResponse> {
        const cleanText = text.toLowerCase();

        // בדיקה אם המשתמש שלח זמינות תוך כדי אישור (לוגיקה מקורית)
        if (cleanText.includes("פנוי") || cleanText.includes("זמינות")) {
            const slots = await this.ragService.extractAvailability(text);
            if (slots?.length) {
                await this.userRepo.updateStep(chatId, 'CONFIRM_DETAILS', { 
                    ...user.metadata, 
                    availability: slots 
                });
                return { text: "מעולה, רשמתי את השעות! 📅\nהאם תרצה לאשר את הפרסום כעת? (כתוב 'כן')" };
            }
        }

        if (["לא", "בטל", "ביטול"].some(word => cleanText.includes(word))) {
            await this.userRepo.updateStep(chatId, 'START', {});
            return { text: "הפרסום בוטל. אפשר לשלוח תיאור חדש." };
        }

        if (["כן", "מאשר", "אוקיי"].some(word => cleanText.includes(word))) {
            return await this.finalizeApartment(chatId, user);
        }

        return { text: "זיהיתי פרטי דירה. האם לאשר את הפרסום? (כן/לא)" };
    }

    private async finalizeApartment(chatId: string, user: any): Promise<BotResponse> {
        const details = user.metadata;
        const media = details.media || [];
        
        // יצירת Embedding לחיפוש סמנטי (לוגיקה מקורית)
        const fullInfo = `${details.city} ${details.rooms} חדרים ${details.description}`;
        const embedding = await this.ragService.generateEmbedding(fullInfo);

        // שמירה ב-DB (שימוש ב-Prisma דרך ה-Repository)
        const newApartment = await this.apartmentRepo.createApartment({
            ...details,
            images: media.filter((m: any) => m.type === 'image').map((m: any) => m.fileId),
            videos: media.filter((m: any) => m.type === 'video').map((m: any) => m.fileId),
            phone_number: chatId,
            ownerId: user.id
        }, embedding);

        await this.userRepo.updateStep(chatId, 'START', { last_published_id: newApartment.id });
        
        // יצירת לינק עמוק (Deep Link)
        const shortId = newApartment.id.split('-')[0];
        const deepLink = `https://t.me/dvir_rent_bot?start=${shortId}`;
        
        return { 
            text: `הדירה פורסמה בהצלחה! 🎉\n\nמזהה: ${shortId}\nלינק לשיתוף מהיר (שלח לשוכרים):\n${deepLink}`,
            action: 'SUCCESS' 
        };
    }

    // מתודה לטיפול במדיה (נקראת מה-Controller)
    async handleMedia(chatId: string, fileId: string, type: string, user: any) {
        if (user.current_step === 'CONFIRM_DETAILS') {
            const metadata = user.metadata || {};
            if (!metadata.media) metadata.media = [];
            metadata.media.push({ fileId, type });
            await this.userRepo.updateStep(chatId, 'CONFIRM_DETAILS', metadata);
            return { text: `הקובץ נוסף למודעה! ניתן לשלוח עוד או לכתוב "כן" לסיום.` };
        }
        
        const lastId = user.metadata?.last_published_id;
        if (lastId) {
            // הוספת מדיה לדירה קיימת
            await this.apartmentRepo.updateApartmentMedia(lastId, fileId, type);
            return { text: "התמונה נוספה למודעה האחרונה שלך. ✅" };
        }
        return { text: "כדי לשלוח תמונות, שלח קודם תיאור של דירה חדשה." };
    }
}