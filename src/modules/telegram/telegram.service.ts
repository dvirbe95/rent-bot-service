import { Telegraf } from 'telegraf';
import { UserRepository } from '../users/user.repository';
import { ApartmentRepository } from '../apartments/apartment.repository';
import { IMessagingService, BotResponse } from '../../common/interfaces/messaging.interface';

export class TelegramService implements IMessagingService {
    private bot: Telegraf;
    private apartmentRepository: ApartmentRepository;
    private userRepository: UserRepository;

    constructor(token: string, private controller: any) {
        this.bot = new Telegraf(token);
        this.apartmentRepository = new ApartmentRepository();
        this.userRepository = new UserRepository();
    }

    async init() {
        this.bot.on('text', async (ctx) => {
            const response = await this.controller.handleMessage(
                ctx.chat.id.toString(), 
                ctx.message.text, 
                ctx.from.first_name
            );
            await this.sendMessage(ctx.chat.id.toString(), response);
        });

        this.bot.on('callback_query', async (ctx) => {
            const data = (ctx.callbackQuery as any).data;
            const chatId = ctx.chat?.id.toString();
            if (!chatId) return;

            // 1. תמיד לאשר את ה-Callback כדי לבטל את השעון החול בכפתור
            await ctx.answerCbQuery();

            // 2. שליפת המשתמש כדי לדעת על איזו דירה הוא מסתכל כרגע
            const user = await this.userRepository.getOrCreateUser(chatId);
            const metadata = user.metadata as any; 
            const activeId = metadata?.active_apartment_id;
            if (!activeId) {
                return ctx.reply("לא בחרת דירה. שלח שוב את לינק הדירה.");
            }

            // 3. ביצוע הפעולה לפי ה-data של הכפתור
            const apartment = await this.apartmentRepository.getById(metadata.active_apartment_id) as any;
            if (data === 'get_media') {
                if (apartment) {
                    // שימוש במתודה הקיימת שלך לשליחת תמונות
                    await this.sendMedia(chatId, apartment);
                }
            }

            if (data === 'get_slots') {
                // כאן תקרא לפורמט השעות שכתבת קודם
                // const res = this.controller.formatAvailability(apartment.availability);
                // await ctx.reply(res);
                const timeButtons = this.controller.generateTimeSlots(apartment.availability as any[]);
    
                await ctx.reply("📅 **בחר מועד לסיור בדירה:**\n(לחיצה על מועד תשלח בקשה למתווך)", {
                    reply_markup: { inline_keyboard: timeButtons }
                });
            }
            
            if (data === 'ask_question') {
                await ctx.reply("🏠 אני מקשיב! מה תרצה לדעת על הדירה? (למשל: 'יש ועד בית?') ");
            }

            if (data.startsWith('book_slot_')) {
                const selectedDate = new Date(data.replace('book_slot_', ''));
                const timeStr = selectedDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                const dateStr = selectedDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });

                // 1. שלח אישור ללקוח
                await ctx.reply(`✅ בקשתך לסיור ביום ${dateStr} בשעה ${timeStr} נשלחה למתווך לאישור!`);

                // 2. שלח הודעה למתווך (בעל הדירה)
                const apartment = await this.apartmentRepository.getById(activeId) as any;
                const agentChatId = apartment.owner.phone; // וודא שה-Schema מחזיר את זה ב-include

                await this.bot.telegram.sendMessage(agentChatId, 
                    `🔔 **בקשה לסיור חדש!**\n\n` +
                    `דירה: ${apartment.city}, ${apartment.id.split('-')[0]}\n` +
                    `לקוח: ${ctx.from.first_name} (${chatId})\n` +
                    `מועד מבוקש: ${dateStr} בשעה ${timeStr}\n\n` +
                    `לחץ על הכפתור למטה כדי לאשר ללקוח שאתה מחכה לו.`, {
                        reply_markup: {
                            inline_keyboard: [[{ text: "✅ אשר הגעה", callback_data: `confirm_visit_${chatId}_${data.replace('book_slot_', '')}` }]]
                        }
                    }
                );
            }
        });
        this.bot.launch();
    }

    async sendMessage(chatId: string, response: BotResponse) {
        const markup = response.buttons ? { inline_keyboard: response.buttons } : undefined;
        await this.bot.telegram.sendMessage(chatId, response.text, {
            parse_mode: 'HTML',
            reply_markup: markup
        });
        
        if (response.action === 'SEND_IMAGES') {
            await this.sendMedia(chatId, response.data);
        }
    }

    async sendMedia(chatId: string, apartment: any) {
        for (const img of apartment.images || []) {
            await this.bot.telegram.sendPhoto(chatId, img);
        }
    }
}