// src/modules/bot/flows/bot/tenant.flow.ts
import { BaseFlow } from './base.flow';
import { Role } from '@prisma/client';

export class TenantFlow extends BaseFlow {
    async handleApartmentLookup(chatId: string, text: string) {
        const shortId = text.replace('/start ', '').replace('דירה ', '').trim();
        const apartment = await this.apartmentRepo.findApartmentById(shortId) || await this.apartmentRepo.getById(shortId);

        if (!apartment) return { text: "❌ הנכס לא נמצא." };

        await this.userRepo.updateStep(chatId, 'TALKING_ABOUT_APARTMENT', { active_apartment_id: apartment.id });

        return { 
            text: `🏠 **נכס ב-${apartment.city}**\n${apartment.description}\n\nמה תרצה לעשות?`, 
            buttons: [
                [{ text: "📊 פרופיל מלא (Web)", web_app: { url: `https://app.com/p/${apartment.id}` } }],
                [{ text: "📸 תמונות", callback_data: "get_media" }],
                [{ text: "📅 תיאום סיור", callback_data: "get_slots" }],
                [{ text: "❓ שאל שאלה", callback_data: "ask_question" }]
            ],
            action: 'SHOW_MENU',
            data: apartment 
        };
    }

    async handle(chatId: string, text: string, user: any, userName: string) {
        if (user.current_step === 'TALKING_ABOUT_APARTMENT') {
            const activeId = user.metadata?.active_apartment_id;
            const apartment = await this.apartmentRepo.getById(activeId);
            
            // לוגיקת AI קיימת
            const aiResponse = await this.ragService.answerQuestionAboutApartment(text, apartment);
            
            // כאן אפשר להוסיף בעתיד: אם user.role === 'BUYER', ה-AI ייתן תשובות על תשואה.
            return { text: aiResponse.answer, action: aiResponse.action, data: apartment };
        }
        return { text: `שלום ${userName}, שלח מזהה נכס כדי להתחיל.` };
    }
}