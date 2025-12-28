// src/modules/telegram/telegram.service.ts
import { Telegraf } from 'telegraf';
import { BotController } from '../chats/bot.controller';
import { WhatsAppRepository } from '../whatsapp/whatsapp.repository';
import { ApartmentRepository } from '../apartments/apartment.repository';
import { CalendarService } from '../calendar/calendar.service';

export class TelegramService {
    private bot: Telegraf;
    private controller: BotController;
    private calendarService: CalendarService;
    private userRepository: WhatsAppRepository;
    private apartmentRepository = new ApartmentRepository();
    

    constructor(token: string) {
        this.bot = new Telegraf(token);
        this.controller = new BotController();
        this.userRepository = new WhatsAppRepository();
        this.calendarService = new CalendarService();
    }

// src/modules/telegram/telegram.service.ts

    async init() {
    // 1. טיפול בלינקים עמוקים (Deep Links) - t.me/bot?start=ID
        this.bot.start(async (ctx) => {
            const chatId = ctx.chat.id.toString();
            const payload = ctx.startPayload; // מחלץ את ה-shortId מהלינק

            if (payload) {
                // שולחים ל-controller הודעה מדומה כדי שיפתח את הדירה
                const response = await this.controller.handleMessage(chatId, `דירה ${payload}`, ctx.from.first_name);
                await this.sendResponse(ctx, response);
            } else {
                await ctx.reply(`היי ${ctx.from.first_name}! שלח לי תיאור דירה לפרסום או מזהה דירה לחיפוש.`);
            }
        });

        // 2. טיפול בטקסט חופשי (חיפוש, שאלות, תיאום)
        this.bot.on('text', async (ctx) => {
            const chatId = ctx.chat.id.toString();
            // מוודא שזה לא פקודת סטארט שכבר טופלה
            if (ctx.message.text.startsWith('/start')) return;

            const response = await this.controller.handleMessage(chatId, ctx.message.text, ctx.from.first_name);
            await this.sendResponse(ctx, response);
        });

        // 3. טיפול במדיה
        this.bot.on(['photo', 'video', 'document'], async (ctx) => {
            const chatId = ctx.chat.id.toString();
            let fileId = '';
            let type = '';

            if ('photo' in ctx.message) {
                fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                type = 'image';
            } else if ('video' in ctx.message) {
                fileId = ctx.message.video.file_id;
                type = 'video';
            } else if ('document' in ctx.message) {
                fileId = ctx.message.document.file_id;
                type = 'document';
            }

            const response = await this.controller.handleMedia(chatId, fileId, type);
            await ctx.reply(response.text);
        });

        this.bot.on('callback_query', async (ctx) => {
                const data = (ctx.callbackQuery as any).data;
                const chatId = ctx.chat?.id.toString();
                if (!chatId) return;

                await ctx.answerCbQuery(); // מעלים את ה"שעון חול" מהכפתור בטלגרם
                const user = await this.userRepository.getOrCreateUser(chatId);
                const activeId = (user.metadata as any)?.active_apartment_id;
                const apartment = await this.apartmentRepository.getById(activeId) as any;

                if (data === 'get_slots') {
                    
                    // שימוש בפורמט החדש שמחזיר טקסט וכפתורים
                    const availability = this.controller.formatAvailability(apartment.availability) as any;
                    await ctx.reply(availability.text, { 
                        reply_markup: { inline_keyboard: availability.buttons } 
                    });
                }
                
                if (data === 'get_media') {
                    const activeId = (user.metadata as any)?.active_apartment_id;
                    
                    // שליחת המדיה באופן יזום
                    await this.sendMedia(ctx, apartment);
                }

                // 3. מעבר למצב שאילתה (זה החלק שביקשת)
                else if (data === 'ask_question') {
                    // אנחנו לא צריכים לשנות סטטוס ב-DB כי הוא כבר ב-TALKING_ABOUT_APARTMENT
                    // פשוט נותנים הנחיה למשתמש
                    await ctx.reply("🏠 אני מקשיב! מה תרצה לדעת על הדירה?\n\nלמשל:\n- 'האם המחיר כולל ארנונה?'\n- 'יש חניה בבניין?'\n- 'מתי אפשר להיכנס?'");
                }

                // 4. חזרה לתפריט הראשי של הדירה
                else if (data === 'back_to_menu') {
                    const res = await this.controller.handleApartmentLookup(chatId, apartment.id);
                    await ctx.reply(res.text, { reply_markup: { inline_keyboard: res.buttons || [] } });
                }

                // 5. תיאום סלוט ספציפי מתוך רשימת השעות
                else if (data.startsWith('book_slot_')) {
                    const index = parseInt(data.replace('book_slot_', ''));
                    const selectedSlot = apartment.availability[index];

                    if (selectedSlot) {
                        // קריאה לשירות הקלנדר והודעה למשכיר
                        await this.calendarService.createMeeting(apartment, selectedSlot, ctx.from.first_name);
                        
                        // הודעה לשוכר
                        await ctx.reply(`✅ נקבע! הפגישה נרשמה ביומן ליום ${new Date(selectedSlot.start).toLocaleDateString('he-IL')} בשעה ${new Date(selectedSlot.start).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})}.`);
                        
                        // הודעה למשכיר (דרך הבוט)
                        await this.bot.telegram.sendMessage(apartment.phone_number, 
                            `תיאום חדש! 📅\n${ctx.from.first_name} קבע/ה לראות את הדירה ב-${apartment.city}\nבמועד: ${new Date(selectedSlot.start).toLocaleString('he-IL')}`
                        );
                    }
                }
            });

            this.bot.launch();
        }

    /**
     * פונקציית העזר המאוחדת לשליחת תגובות
     */
    private async sendResponse(ctx: any, response: any) {
        // 1. אם יש מדיה לשלוח (תמונות/סרטונים)
        if (response.action === 'OFFER_MEDIA' || response.action === 'SEND_IMAGES') {
            await this.sendMedia(ctx, response.data);
        }

        // 2. בניית כפתורים (אם קיימים)
        const markup = response.buttons ? { inline_keyboard: response.buttons } : undefined;

        // 3. שליחת הודעת הטקסט המרכזית (כולל כפתורי Inline)
        await ctx.reply(response.text, { 
            parse_mode: 'Markdown',
            reply_markup: markup
        });

        // 4. התראה למשכיר (במידה ובוצע תיאום)
        if (response.action === 'NOTIFY_LANDLORD' && response.data) {
            await this.bot.telegram.sendMessage(response.data.landlordChatId, response.data.message);
        }
    }

    /**
     * פונקציית עזר נפרדת לשליחת מדיה כדי למנוע כפל קוד
     */
    private async sendMedia(ctx: any, apartment: any) {
        if (!apartment) return;

        if (apartment.images && Array.isArray(apartment.images)) {
            for (const fileId of apartment.images) {
                await ctx.replyWithPhoto(fileId).catch(() => {});
            }
        }
        
        // תמיכה ב-videos (בקוד שלך מופיע לפעמים כ-videos ולפעמים כ-video_url)
        const videos = apartment.videos || (apartment.video_url ? [apartment.video_url] : []);
        for (const fileId of videos) {
            await ctx.replyWithVideo(fileId).catch(() => {});
        }
    }
}