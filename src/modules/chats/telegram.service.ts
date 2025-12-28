// src/modules/telegram/telegram.service.ts
import { Telegraf } from 'telegraf';
import { BotController } from '../chats/bot.controller';

export class TelegramService {
    private bot: Telegraf;
    private controller: BotController;

    constructor(token: string) {
        this.bot = new Telegraf(token);
        this.controller = new BotController();
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

        this.bot.launch();
    }

    // פונקציית עזר לשליחת תגובות מורכבות
    private async sendResponse(ctx: any, response: any) {
        if (response.action === 'OFFER_MEDIA' || response.action === 'SEND_IMAGES') {
            const apartment = response.data;
            if (apartment.images) {
                for (const fileId of apartment.images) {
                    await ctx.replyWithPhoto(fileId);
                }
            }
            if (apartment.videos) {
                for (const fileId of apartment.videos) {
                    await ctx.replyWithVideo(fileId);
                }
            }
        }
        await ctx.reply(response.text);
    }
}