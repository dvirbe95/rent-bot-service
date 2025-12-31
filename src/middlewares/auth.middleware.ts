import { BotResponse } from "../common/interfaces/messaging.interface";

const runAuthMiddleware = (user: any): BotResponse | null => {
        // שוכרים (TENANTS) תמיד יכולים להשתמש בבוט בחינם
        if (user.role === 'TENANT') return null;

        // בדיקת תוקף מנוי למתווכים ומוכרים
        const now = new Date();
        const isExpired = user.planExpiresAt ? now > new Date(user.planExpiresAt) : true;

        if (!user.subscriptionStatus || isExpired) {
            return {
                text: `🔒 **הגישה חסומה**\n\nהיי ${user.phone}, נראה שאין לך מנוי פעיל למערכת הניהול.\n\nכדי לפרסם נכסים חדשים, להשתמש ב-AI או לקבל לידים, עליך להסדיר תשלום.`,
                buttons: [
                    [{ text: "💳 לתשלום וחידוש המנוי", web_app: { url: "https://your-domain.com/pay" } }],
                    [{ text: "📞 דיבור עם נציג", callback_data: "contact_support" }]
                ]
            };
        }

        return null;
    }