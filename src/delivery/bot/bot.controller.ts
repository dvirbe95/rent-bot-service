// src/modules/bot/bot.controller.ts
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { TenantFlow } from './flows/bot/tenant.flow';
import { LandlordFlow } from './flows/bot/landlord.flow';
import { AuthService } from '../../core/auth/auth.service';
import { BotAuthMiddleware } from '../../middlewares/bot-auth.middleware';

export class BotController {
    private tenantFlow: TenantFlow;
    private landlordFlow: LandlordFlow;
    private authService: AuthService; 

    constructor(
        private ragService: any,
        private apartmentRepo: any,
        private userRepo: any
    ) {
        this.authService = new AuthService();
        this.tenantFlow = new TenantFlow(ragService, apartmentRepo, userRepo);
        this.landlordFlow = new LandlordFlow(ragService, apartmentRepo, userRepo);
    }

    async handleMessage(chatId: string, text: string, userName: string) {
        const user = await this.userRepo.getOrCreateUser(chatId);

        // --- שלב 0: טיפול בלינק עמוק (Deep Linking) ---
        if (text.startsWith('/start link_')) {
            const userId = text.replace('/start link_', '').trim();
            if (userId) {
                try {
                    const webUser = await this.userRepo.findById(userId);
                    if (webUser) {
                        // אם יש כבר יוזר אחר עם ה-chatId הזה (היוזר הזמני של הבוט), נמחק אותו כדי שנוכל לקשר
                        if (user.id !== webUser.id) {
                            await this.userRepo.deleteUser(user.id);
                        }
                        await this.userRepo.updateUser(userId, { chatId });
                        return {
                            text: `🎉 החשבון שלך קושר בהצלחה! ברוך הבא ${webUser.name || userName}.\nעכשיו תוכל לקבל עדכונים ולידים ישירות לכאן.`,
                        };
                    }
                } catch (err) {
                    console.error('Error linking user:', err);
                }
            }
        }

        // --- שלב 0.1: טיפול בפקודת קישור ידנית ---
        if (text.startsWith('/link ')) {
            const email = text.replace('/link ', '').trim().toLowerCase();
            const webUser = await this.userRepo.findByEmail(email);
            if (webUser) {
                if (user.id !== webUser.id) {
                    await this.userRepo.deleteUser(user.id);
                }
                await this.userRepo.updateUser(webUser.id, { chatId });
                return { text: `✅ החשבון של ${email} קושר לטלגרם שלך בהצלחה!` };
            }
            return { text: "❌ לא מצאתי משתמש עם המייל הזה במערכת." };
        }
        const professionalRoles = ['AGENT', 'LANDLORD', 'SELLER'];
        if (professionalRoles.includes(user.role)) {
            return { 
                text: "היי! ניהול הנכסים שלך מתבצע כעת דרך האפליקציה החדשה שלנו.",
                action: 'REQUIRE_AUTH' // ה-Service יתרגם זאת לכפתור לינק לאפליקציה
            };
        }
        
        // --- שלב א: זיהוי תפקיד ראשוני למשתמשים חדשים ---
        if (user.current_step === 'START' && !user.metadata?.role_selected) {
             if (text.startsWith('/start') && text.length > 7) {
                 // דלג על בחירת רול אם הגיע מלינק עמוק
             } else {
                return {
                    text: `ברוך הבא ${userName}! איך אוכל לעזור היום?`,
                    buttons: [
                        [{ text: "🔍 אני מחפש דירה", callback_data: "set_role_tenant" }],
                        [{ text: "🏠 אני מפרסם (משכיר/מוכר)", callback_data: "set_role_provider" }]
                    ]
                };
             }
        }

        // --- שלב ב: בדיקת אבטחה ומנוי (הכנה למזגן) ---
        const authError = await BotAuthMiddleware.checkBotAccess(user);
        if (authError) {
            const fastToken = jwt.sign(
                { id: user.id, role: user.role, phone: user.phone }, 
                process.env.JWT_SECRET!, 
                { expiresIn: '5m' }
            );
            
            // מעדכנים את הכפתור ב-authError שהתקבל מה-Middleware
            authError.buttons = [[{ 
                text: "🔑 כניסה מהירה לאפליקציה", 
                web_app: { url: `https://your-app.com/login?token=${fastToken}` } 
            }]];
            return authError;
        }
        // --- שלב ג: ניתוב לוגיקה ---
        const isSearch = text.startsWith('/start ') || text.startsWith('דירה ') || /^[a-f0-9-]{6,15}$/i.test(text);
        
        if (isSearch) {
            return await this.tenantFlow.handleApartmentLookup(chatId, text);
        }

        // הפרדה גנרית: AGENT/LANDLORD/SELLER הולכים ל-Publisher Flow
        const isPublisher = [UserRole.AGENT, UserRole.LANDLORD, UserRole.SELLER].includes(user.role);
        
        if (isPublisher) {
            return await this.landlordFlow.handle(chatId, text, user, userName);
        } else {
            // TENANT / BUYER
            return await this.tenantFlow.handle(chatId, text, user, userName);
        }
    }

    // שאר המתודות (handleMedia, formatAvailability) נשארות כפי שהיו בקוד המקורי שלך
    async handleMedia(chatId: string, fileId: string, type: string) {
        const user = await this.userRepo.getOrCreateUser(chatId);
        const isPublisher = [UserRole.AGENT, UserRole.LANDLORD, UserRole.SELLER].includes(user.role);

        if (isPublisher) {
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
                    callback_data: `book_slot_${current.toISOString()}` 
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