// src/modules/bot/flows/bot/landlord.flow.ts
import { BaseFlow } from './base.flow';
import { BotResponse } from "../../../../common/interfaces/messaging.interface";
import { UserRole } from '@prisma/client';

export class LandlordFlow extends BaseFlow {
    async handle(chatId: string, text: string, user: any, userName: string): Promise<BotResponse> {
        const cleanText = text.trim().toLowerCase();
        const lastApartmentId = user.metadata?.last_published_id;

        // 1. עדכון זמינות (רלוונטי רק למשכירים ומתווכים)
        if (user.role !== UserRole.SELLER && lastApartmentId && (cleanText.includes("פנוי") || cleanText.includes("זמינות"))) {
            const slots = await this.ragService.extractAvailability(text);
            await this.apartmentRepo.updateApartment(lastApartmentId, { availability: slots });
            return { text: "מעולה! הגדרתי את מועדי הביקור. שוכרים יכולים לתאם כעת. 📅" };
        }

        switch (user.current_step) {
            case 'CONFIRM_DETAILS':
                return await this.handleConfirmDetails(chatId, text, user);
            
            default:
                if (text.length > 40) {
                    const details = await this.ragService.extractApartmentDetails(text);
                    if (details?.city) {
                        await this.userRepo.updateStep(chatId, 'CONFIRM_DETAILS', details);
                        const msg = user.role === UserRole.SELLER ? "דירה למכירה" : "דירה להשכרה";
                        return { 
                            text: `זיהיתי ${msg} ב-${details.city}:\n💰 מחיר: ${details.price}\n🏠 חדרים: ${details.rooms}\n\n📸 שלח תמונות עכשיו, ובסיום כתוב "כן" לאישור.`,
                        };
                    }
                }
                const welcomeLabel = user.role === UserRole.AGENT ? "הסוכן" : "המשתמש";
                return { text: `היי ${userName}! שלח לי תיאור נכס חדש לפרסום או עדכן פרטים על נכס קיים.` };
        }
    }

    private async handleConfirmDetails(chatId: string, text: string, user: any): Promise<BotResponse> {
        const cleanText = text.toLowerCase();

        // לוגיקת ה-Availability המקורית שלך
        if (cleanText.includes("פנוי") || cleanText.includes("זמינות")) {
            const slots = await this.ragService.extractAvailability(text);
            if (slots?.length) {
                await this.userRepo.updateStep(chatId, 'CONFIRM_DETAILS', { ...user.metadata, availability: slots });
                return { text: "רשמתי את השעות! 📅\nהאם תרצה לאשר את הפרסום? (כתוב 'כן')" };
            }
        }

        if (["לא", "בטל", "ביטול"].some(word => cleanText.includes(word))) {
            await this.userRepo.updateStep(chatId, 'START', {});
            return { text: "הפרסום בוטל." };
        }

        if (["כן", "מאשר", "אוקיי"].some(word => cleanText.includes(word))) {
            return await this.finalizeApartment(chatId, user);
        }

        return { text: "האם לאשר את הפרסום? (כן/לא)" };
    }

    private async finalizeApartment(chatId: string, user: any): Promise<BotResponse> {
        const details = user.metadata;
        const media = details.media || [];
        const fullInfo = `${details.city} ${details.rooms} חדרים ${details.description}`;
        const embedding = await this.ragService.generateEmbedding(fullInfo);

        const newApartment = await this.apartmentRepo.createApartment({
            ...details,
            images: media.filter((m: any) => m.type === 'image').map((m: any) => m.fileId),
            video_url: media.find((m: any) => m.type === 'video')?.fileId || null,
            userId: user.id
        }, embedding);

        await this.userRepo.updateStep(chatId, 'START', { last_published_id: newApartment.id });
        const shortId = newApartment.id.split('-')[0];
        
        return { 
            text: `🎉 הנכס פורסם בהצלחה!\nמזהה: ${shortId}\nלינק לשיתוף: https://t.me/dvir_rent_bot?start=${shortId}`,
            action: 'SUCCESS' 
        };
    }

    async handleMedia(chatId: string, fileId: string, type: string, user: any) {
        if (user.current_step === 'CONFIRM_DETAILS') {
            const metadata = user.metadata || {};
            if (!metadata.media) metadata.media = [];
            metadata.media.push({ fileId, type });
            await this.userRepo.updateStep(chatId, 'CONFIRM_DETAILS', metadata);
            return { text: `הקובץ נוסף! שלח עוד או כתוב "כן" לסיום.` };
        }
        return { text: "כדי לשלוח מדיה, התחל קודם תיאור נכס." };
    }
}