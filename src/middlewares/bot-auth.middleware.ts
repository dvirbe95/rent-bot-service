// src/middlewares/bot-auth.middleware.ts
import { Role } from "@prisma/client";
import { BotResponse } from "../common/interfaces/messaging.interface";

export class BotAuthMiddleware {
    static async checkBotAccess(user: any): Promise<BotResponse | null> {
        // כאן נשארת הלוגיקה של ה-30 יום והמנוי שכתבת קודם
        // זו לוגיקה שבודקת שדות ב-DB (כמו lastLogin) ולא טוקנים של JWT
        // ... (הקוד המקורי שלך) ...
        return null;
    }
}