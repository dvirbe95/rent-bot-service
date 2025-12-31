import { TenantFlow } from './flows/bot/tenant.flow';
import { LandlordFlow } from './flows/bot/landlord.flow';

export class BotController {
    private tenantFlow: TenantFlow;
    private landlordFlow: LandlordFlow;

    constructor(
        private ragService: any,
        private apartmentRepo: any,
        private userRepo: any
    ) {
        this.tenantFlow = new TenantFlow(ragService, apartmentRepo, userRepo);
        this.landlordFlow = new LandlordFlow(ragService, apartmentRepo, userRepo);
    }

    async handleMessage(chatId: string, text: string, userName: string) {
        const user = await this.userRepo.getOrCreateUser(chatId);
        
        // בדיקה אם הטקסט הוא מזהה דירה או פקודת "דירה X"
        const isSearch = text.startsWith('/start ') || /^[a-f0-9-]{6,15}$/i.test(text);
        
        if (isSearch) {
            // קריאה למתודה שייצרנו ב-TenantFlow
            return await this.tenantFlow.handleApartmentLookup(chatId, text);
        }        
        // זיהוי תפקיד המשתמש - כאן נכנסת הלוגיקה של ההרשאות
        if (user.role === 'LANDLORD' || user.role === 'AGENT') {
            return await this.landlordFlow.handle(chatId, text, user, userName);
        } else {
            return await this.tenantFlow.handle(chatId, text, user, userName);
        }
    }

    async handleMedia(chatId: string, fileId: string, type: string) {
        const user = await this.userRepo.getOrCreateUser(chatId);
        
        // רק מוכרים/מתווכים יכולים להעלות מדיה
        if (user.role === 'AGENT' || user.role === 'LANDLORD') {
            return await this.landlordFlow.handleMedia(chatId, fileId, type, user);
        }
        return { text: "מצטער, רק מפרסמים יכולים לשלוח מדיה למערכת." };
    }

    private generateTimeSlots(availability: any[]): any[][] {
        const buttons: any[][] = [];
        const SLOT_DURATION = 15; // דקות

        availability.forEach((slot: any) => {
            let current = new Date(slot.start);
            const end = new Date(slot.end);
            const dayName = new Date(slot.start).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });

            // כותרת ליום (שורה חדשה של כפתור לא לחיץ או פשוט טקסט)
            // כאן אנחנו פשוט נכין את הכפתורים עם התאריך עליהם
            while (current <= end) {
                const timeStr = current.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
                const fullDateStr = current.toISOString(); // נשמור את התאריך המלא ב-callback_data

                buttons.push([{ 
                    text: `${dayName} בשעה ${timeStr}`, 
                    callback_data: `book_slot_${fullDateStr}` 
                }]);

                // הוספת 15 דקות
                current = new Date(current.getTime() + SLOT_DURATION * 60000);
            }
        });

        // הוספת כפתור חזרה לתפריט בסוף
        buttons.push([{ text: "🔙 חזרה לתפריט הראשי", callback_data: "show_main_menu" }]);

        return buttons;
    }

    formatAvailability(availability: any): string {
        if (!availability || !Array.isArray(availability) || availability.length === 0) {
            return "כרגע לא הוגדרו שעות ביקור. תרצה שאשאיר הודעה למפרסם?";
        }

        const options = availability.map((slot: any, index: number) => {
            const date = new Date(slot.start).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
            const time = new Date(slot.start).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
            return `${index + 1}. ${date} בשעה ${time}`;
        }).join('\n');

        return `📅 **שעות ביקור זמינות:**\n${options}\n\nכתוב לי את מספר המועד או "תאם לי למחר ב-10"`;
    }
}