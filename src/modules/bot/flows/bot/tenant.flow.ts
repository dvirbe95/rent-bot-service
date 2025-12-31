import { BaseFlow } from './base.flow';
import { BotResponse } from '../../../../common/interfaces/messaging.interface';

export class TenantFlow extends BaseFlow {
    
    /**
     * פתיחת דירה לפי מזהה (הלוגיקה שביקשת להחזיר)
     */
    async handleApartmentLookup(chatId: string, text: string): Promise<BotResponse> {
        const shortId = text.replace('/start ', '').trim();
        
        // חיפוש הדירה (מנסה לפי ID קצר או מלא)
        const apartment = await this.apartmentRepo.findApartmentById(shortId) || 
                          await this.apartmentRepo.getById(shortId);

        if (!apartment) {
            return { text: "❌ לא מצאתי דירה עם המזהה הזה. וודא שהקוד נכון.", action: undefined };
        }

        // עדכון הסטטוס ב-DB
        await this.userRepo.updateStep(chatId, 'TALKING_ABOUT_APARTMENT', { 
            active_apartment_id: apartment.id 
        });

        // בניית התפריט האינטראקטיבי
        const menuButtons = [
            [{ 
                text: "📊 לצפייה בפרופיל נכס מלא (Web)", 
                web_app: { url: `https://your-domain.com/apartment-profile/${apartment.id}` } 
            }],
            [{ text: "📸 שלח לי תמונות וסרטונים", callback_data: "get_media" }],
            [{ text: "📅 תאם סיור בדירה", callback_data: "get_slots" }],
            [{ text: "❓ שאל שאלה על הנכס", callback_data: "ask_question" }]
        ];

        const welcomeMsg = `🏠 **מצאתי את הדירה ב-${apartment.city}!**\n\n` +
                           `${apartment.description}\n\n` +
                           `מה תרצה לעשות עכשיו?`;
        
        return { 
            text: welcomeMsg, 
            buttons: menuButtons,
            action: 'SHOW_MENU',
            data: apartment 
        };
    }

    async handle(chatId: string, text: string, user: any, userName: string): Promise<BotResponse> {
        // אם המשתמש כבר בשיחה על דירה ספציפית
        if (user.current_step === 'TALKING_ABOUT_APARTMENT') {
            return await this.handleActiveConversation(chatId, text, user, userName);
        }

        return { text: `היי ${userName}! שלח לי מזהה דירה או לינק כדי להתחיל.` };
    }

    private async handleActiveConversation(chatId: string, text: string, user: any, userName: string) {
        // כאן נכנסת הלוגיקה של ה-AI (שאילת שאלות על הנכס)
        const activeId = user.metadata?.active_apartment_id;
        const apartment = await this.apartmentRepo.getById(activeId);
        
        if (!apartment) return { text: "לא בחרת דירה לשיחה." };

        const aiResponse = await this.ragService.answerQuestionAboutApartment(text, apartment);
        return { text: aiResponse.answer, action: aiResponse.action, data: apartment };
    }

}