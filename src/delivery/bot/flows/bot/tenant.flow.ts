// src/modules/bot/flows/bot/tenant.flow.ts
import { BaseFlow } from './base.flow';
import { UserRole } from '@prisma/client';

export class TenantFlow extends BaseFlow {
    async handleApartmentLookup(chatId: string, text: string) {
        const shortId = text.replace('/start ', '').replace('דירה ', '').trim();
        const apartment = await this.apartmentRepo.findApartmentById(shortId) || await this.apartmentRepo.getById(shortId);

        if (!apartment) return { text: "❌ הנכס לא נמצא." };

        await this.userRepo.updateStep(chatId, 'TALKING_ABOUT_APARTMENT', { active_apartment_id: apartment.id });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const publicUrl = `${frontendUrl}/p/${apartment.id}`;
        
        // טלגרם חוסם localhost בכפתורים. בזמן פיתוח, אם זה localhost, נשלח את זה כטקסט במקום כפתור
        const isLocal = frontendUrl.includes('localhost');

        const buttons: any[] = [
            [{ text: "📸 תמונות בבוט", callback_data: "get_media" }],
            [{ text: "📅 תיאום סיור", callback_data: "get_slots" }],
            [{ text: "❓ שאל שאלה", callback_data: "ask_question" }]
        ];

        if (!isLocal) {
            buttons.unshift([{ text: "📊 פרופיל מלא ותמונות (Web)", url: publicUrl }]);
        }

        const textResponse = isLocal 
            ? `🏠 **נכס ב-${apartment.city}**\n${apartment.description}\n\n🔗 **לינק לפרופיל:** ${publicUrl}\n\nמה תרצה לעשות?`
            : `🏠 **נכס ב-${apartment.city}**\n${apartment.description}\n\nמה תרצה לעשות?`;

        return { 
            text: textResponse, 
            buttons: buttons,
            action: 'SHOW_MENU',
            data: apartment 
        };
    }

    async handle(chatId: string, text: string, user: any, userName: string) {
        const activeId = user.metadata?.active_apartment_id;
        const apartment = activeId ? await this.apartmentRepo.getById(activeId) : null;

        if (text === 'get_slots' && apartment) {
            if (!apartment.availability || (apartment.availability as any[]).length === 0) {
                return { text: "המפרסם עדיין לא הגדיר שעות לתיאום. תרצה להשאיר לו הודעה?" };
            }

            const buttons = (apartment.availability as any[]).map((slot: any) => {
                const date = new Date(slot.start).toLocaleDateString('he-IL');
                const start = new Date(slot.start).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                const end = new Date(slot.end).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                // משתמשים ב-ISO string כדי שה-TelegramService יוכל לפענח את התאריך
                return [{ text: `${date} | ${start}-${end}`, callback_data: `book_slot_${slot.start}` }];
            });

            return { text: "בחר מועד לתיאום סיור:", buttons };
        }

        if (text === 'get_media' && apartment) {
            return { text: "שולח תמונות...", action: 'SEND_IMAGES', data: apartment.images };
        }

        if (user.current_step === 'TALKING_ABOUT_APARTMENT' && apartment) {
            const aiResponse = await this.ragService.answerQuestionAboutApartment(text, apartment);
            return { text: aiResponse.answer, action: aiResponse.action, data: apartment };
        }

        return { text: `שלום ${userName}, שלח מזהה נכס כדי להתחיל.` };
    }
}
