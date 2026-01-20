// src/modules/bot/auth.middleware.ts
import { UserRole } from "@prisma/client";
import { BotResponse } from "../common/interfaces/messaging.interface";

export class AuthMiddleware {
    static async checkAccess(user: any): Promise<BotResponse | null> {
        const now = new Date();
        
        // 1. רולים שחייבים אימות גוגל (JWT) פעם ב-30 יום
        const professionalRoles = [UserRole.AGENT, UserRole.LANDLORD, UserRole.SELLER];
        if (professionalRoles.includes(user.role)) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (!user.lastLogin || new Date(user.lastLogin) < thirtyDaysAgo) {
                return {
                    text: `🔒 **נדרש אימות זהות**\nהיי ${user.phone}, לצורך אבטחה (ומכיוון שאתה מפרסם נכסים), עליך להתחבר עם גוגל פעם ב-30 יום.`,
                    buttons: [[{ 
                        text: "🔑 התחברות מהירה (Google)", 
                        web_app: { url: `https://your-app.com/login?tid=${user.phone}` } 
                    }]]
                };
            }
        }

        // 2. בדיקת מנוי (ספציפית למתווכים בלבד - AGENT)
        if (user.role === UserRole.AGENT) {
            const isExpired = user.planExpiresAt ? now > new Date(user.planExpiresAt) : true;
            if (!user.subscriptionStatus || isExpired) {
                return {
                    text: `💳 **המנוי אינו בתוקף**\nמתווכים נדרשים למנוי פעיל כדי לנהל נכסים ולצפות בלידים.`,
                    buttons: [[{ text: "🛍️ לחידוש מנוי", web_app: { url: "https://your-app.com/pay" } }]]
                };
            }
        }

        return null; // מאושר
    }
}