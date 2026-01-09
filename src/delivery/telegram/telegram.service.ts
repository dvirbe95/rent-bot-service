import { Telegraf } from "telegraf";
import { UserRepository } from "../../modules/users/user.repository";
import { ApartmentRepository } from "../../modules/apartments/apartment.repository";
import {
  IMessagingService,
  BotResponse,
} from "../../common/interfaces/messaging.interface";
import { CalendarService } from "../../modules/calendar/calendar.service";

export class TelegramService implements IMessagingService {
  private bot: Telegraf;
  private apartmentRepository: ApartmentRepository;
  private userRepository: UserRepository;
  private calendarService: CalendarService;

  constructor(token: string, private controller: any, private app: any) {
    this.bot = new Telegraf(token);
    this.apartmentRepository = new ApartmentRepository();
    this.userRepository = new UserRepository();
    this.calendarService = new CalendarService();
  }

  async init() {
    this.bot.on("text", async (ctx) => {
      const response = await this.controller.handleMessage(
        ctx.chat.id.toString(),
        ctx.message.text,
        ctx.from.first_name
      );

      // --- הוספת לוגיקת לידים ---
      const user = await this.userRepository.getOrCreateUser(ctx.chat.id.toString());
      const activeApartmentId = (user.metadata as any)?.active_apartment_id;
      
      if (activeApartmentId) {
          const leadRepo = new (await import("../../modules/client-leads/client-lead.repository")).ClientLeadRepository();
          const lead = await leadRepo.getOrCreateLead(activeApartmentId, ctx.chat.id.toString(), ctx.from.first_name);
          
          // שמירת ההודעה בהיסטוריית הליד
          await leadRepo.addMessage(lead.id, {
              senderType: "TENANT",
              content: ctx.message.text
          });

          // אם ה-AI החזיר תשובה, נשמור גם אותה
          if (response.text) {
              await leadRepo.addMessage(lead.id, {
                  senderType: "BOT",
                  content: response.text
              });
          }
      }
      // -------------------------

      if (response.action === 'REQUIRE_AUTH') {
          return ctx.reply(response.text, {
              reply_markup: {
                  inline_keyboard: [[{ text: "🔑 כניסה לאפליקציה", url: "https://your-app.com" }]]
              }
          });
      }

      await this.sendMessage(ctx.chat.id.toString(), response);

      const lastApartmentId = (user.metadata as any)?.active_apartment_id ;
      const apartment = (await this.apartmentRepository.getById(
        lastApartmentId
      )) as any;

      return await this.sendApartmentMenu(ctx, apartment);
    });

    this.bot.on("callback_query", async (ctx) => {
      const data = (ctx.callbackQuery as any).data;
      const chatId = ctx.chat?.id.toString();
      if (!chatId) return;

      // 1. תמיד לאשר את ה-Callback כדי לבטל את השעון החול
      await ctx.answerCbQuery();

      // 2. שליפת המשתמש
      const user = await this.userRepository.getOrCreateUser(chatId);
      const metadata = user.metadata as any;

      // --- לוגיקה חדשה: בחירת רול (Onboarding) ---

      // א. בחירה ראשונית (שוכר/קונה מול מפרסם)
      if (data === "set_role_tenant") {
        await this.userRepository.updateUserRole(chatId, "TENANT");
        return ctx.reply(
          "מעולה! הגדרתי אותך כמחפש דירה. שלח לי מזהה דירה או תיאור של מה שאתה מחפש."
        );
      }

      if (data === "set_role_provider") {
        return ctx.reply("נשמח לעזור לך לפרסם! מי אתה?", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🏠 אני משכיר דירה (פרטי)",
                  callback_data: "role_landlord",
                },
              ],
              [
                {
                  text: "💰 אני מוכר דירה (פרטי)",
                  callback_data: "role_seller",
                },
              ],
              [
                {
                  text: "💼 אני מתווך נדלן (מקצועי)",
                  callback_data: "role_agent",
                },
              ],
            ],
          },
        });
      }

      // ב. הגדרת רול ספציפי למפרסם
      if (data.startsWith("role_")) {
        const selectedRole = data.replace("role_", "").toUpperCase();
        await this.userRepository.updateUserRole(chatId, selectedRole);

        let welcomeMsg = "ברוך הבא! ";
        if (selectedRole === "AGENT")
          welcomeMsg += "כסוכן, תוכל לנהל נכסים ולידים. ";
        if (selectedRole === "SELLER")
          welcomeMsg += "כמוכר, תוכל לפרסם את הנכס שלך לקונים. ";

        return ctx.reply(
          `${welcomeMsg}\nכדי להתחיל בפרסום, שלח לי תיאור של הנכס (לפחות 40 תווים).`
        );
      }

      // --- לוגיקת הדירות הקיימת (עם התאמות) ---

      const activeId = metadata?.active_apartment_id;

      // אם המשתמש מנסה לבצע פעולת דירה בלי activeId
      if (
        !activeId &&
        ["get_media", "get_slots", "ask_question"].includes(data)
      ) {
        return ctx.reply("לא בחרת דירה. שלח שוב את לינק הדירה או המזהה שלה.");
      }

      const apartment = activeId
        ? ((await this.apartmentRepository.getById(activeId)) as any)
        : null;

      if (data === "get_media" && apartment) {
        await this.sendMedia(ctx.chat?.id.toString()!, apartment);
        return await this.sendApartmentMenu(ctx, apartment);
      }

      if (data === "get_slots" && apartment) {
        const timeButtons = this.controller.generateTimeSlots(
          apartment.availability as any[]
        );
        await ctx.reply(
          "📅 **בחר מועד לסיור בדירה:**\n(לחיצה על מועד תשלח בקשה למפרסם)",
          {
            reply_markup: { inline_keyboard: timeButtons },
          }
        );
      }

      if (data === "ask_question") {
        await ctx.reply(
          "🏠 אני מקשיב! מה תרצה לדעת על הדירה? (למשל: 'יש חניה?') "
        );
      }

      // לוגיקת תיאום סיור
      if (data.startsWith("book_slot_")) {
        const selectedDate = new Date(data.replace("book_slot_", ""));
        const timeStr = selectedDate.toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dateStr = selectedDate.toLocaleDateString("he-IL", {
          day: "numeric",
          month: "numeric",
        });

        await ctx.reply(
          `✅ בקשתך לסיור ביום ${dateStr} בשעה ${timeStr} נשלחה למפרסם לאישור!`
        );

        if (apartment) {
          // שליחה למפרסם (owner/agent)
          const agentChatId = apartment.phone_number; // בקוד שלך זה phone_number

          await this.bot.telegram.sendMessage(
            agentChatId,
            `🔔 **בקשה לסיור חדש!**\n\n` +
              `דירה: ${apartment.city}, ${apartment.id.split("-")[0]}\n` +
              `לקוח: ${ctx.from.first_name} (${chatId})\n` +
              `מועד מבוקש: ${dateStr} בשעה ${timeStr}\n\n` +
              `לחץ על הכפתור למטה כדי לאשר לו.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ אשר הגעה",
                      callback_data: `confirm_visit_${chatId}_${data.replace(
                        "book_slot_",
                        ""
                      )}`,
                    },
                  ],
                ],
              },
            }
          );

          return await this.sendApartmentMenu(ctx, apartment);
        }
      }

      // אישור הגעה מצד המתווך/משכיר ללקוח
      if (data.startsWith("confirm_visit_")) {
        const parts = data.split("_");
        const tenantChatId = parts[2];
        const dateRaw = parts[3];

        // 1. השגת נתונים מה-DB
        const tenantUser = await this.userRepository.getOrCreateUser(
          tenantChatId
        );
        const user = await this.userRepository.getOrCreateUser(chatId); // המתווך שלחץ על הכפתור
        const lastApartmentId = (user.metadata as any)?.last_published_id;
        const apartment = (await this.apartmentRepository.getById(
          lastApartmentId
        )) as any;

        const confirmedDate = new Date(dateRaw);
        const endDate = new Date(confirmedDate.getTime() + 30 * 60000); // פגישה של 30 דקות
        const timeStr = confirmedDate.toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        });

        try {
          // 2. יצירת פגישה בקלנדר לשני הצדדים
          // הערה: וודא שלמשתמשים יש שדה email ב-DB
          const emails: string[] = [];
          if (user.email) emails.push(user.email);
          if (tenantUser.email) emails.push(tenantUser.email);

          if (emails.length > 0) {
            await this.calendarService.createMeeting(
              apartment,
              {
                start: confirmedDate.toISOString(),
                end: endDate.toISOString(),
              },
              "שוכר פוטנציאלי",
              emails
            );

            // עדכון סטטוס הליד ושמירת פגישה
            const leadRepo = new (await import("../../modules/client-leads/client-lead.repository")).ClientLeadRepository();
            const lead = await leadRepo.getOrCreateLead(apartment.id, tenantChatId);
            await leadRepo.updateStatus(lead.id, "VIEWING_SCHEDULED");
            
            // שמירת הפגישה ב-DB
            await this.prisma.meeting.create({
                data: {
                    leadId: lead.id,
                    startTime: confirmedDate,
                    endTime: endDate,
                    location: apartment.city
                }
            });

            // 3. שליחת התראת אימייל נוספת (אופציונלי - הקלנדר כבר שולח)
            if (user.email) {
              await this.calendarService.sendEmailNotification(emails, {
                city: apartment.city,
                // tenantName: tenantUser.name || "שוכר",
                apartment: apartment,
                start: confirmedDate,
              });
            }
          }

          // 4. הודעות אישור בטלגרם
          await this.bot.telegram.sendMessage(
            tenantChatId,
            `🎉 **המפרסם אישר את הגעתך!**\n` +
              `נפגש בכתובת הנכס בשעה ${timeStr}.\n` +
              `זימון נשלח ליומן שלך (במייל: ${
                tenantUser.email || "לא מעודכן"
              }).`
          );

          await ctx.reply("אישרת את הסיור! הפגישה נוספה ליומן שלכם. ✅");
        } catch (error) {
          console.error("Error confirming visit:", error);
          await ctx.reply("אירעה שגיאה בעת אישור הסיור.");
        }
      }
    });

    // מאזין לכל סוגי המדיה
    this.bot.on(["photo", "video", "document"], async (ctx) => {
      const chatId = ctx.chat.id.toString();
      let fileId = "";
      let type = "";

      // שליפת ה-file_id (מתוך המערך של הטלגרם לוקחים את הגודל הגדול ביותר)
      if ("photo" in ctx.message) {
        fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        type = "image";
      } else if ("video" in ctx.message) {
        fileId = ctx.message.video.file_id;
        type = "video";
      }

      if (fileId) {
        // קריאה לקונטרולר - כאן הקשר חייב להתקיים
        const response = await this.controller.handleMedia(
          chatId,
          fileId,
          type
        );
        await ctx.reply(response.text);
      }
    });

const domain = process.env.RENDER_EXTERNAL_URL; // Render מספקת את זה אוטומטית

    if (domain) {
      // הגדרת Webhook לסביבת Production (Render)
      const webhookPath = `/telegraf/${this.bot.secretPathComponent()}`;
      await this.bot.telegram.setWebhook(`${domain}${webhookPath}`);
      this.app.use(this.bot.webhookCallback(webhookPath));
      console.log(`📡 Webhook set to: ${domain}${webhookPath}`);
    } else {
      // עבודה ב-Polling לסביבת פיתוח מקומית
      this.bot.launch();
      console.log("🤖 Bot started in Polling mode (Local)");
    }

    // this.bot.launch();
  }

  async sendMessage(chatId: string, response: BotResponse) {
    const markup = response.buttons
      ? { inline_keyboard: response.buttons }
      : undefined;
    await this.bot.telegram.sendMessage(chatId, response.text, {
      parse_mode: "HTML",
      reply_markup: markup,
    });

    if (response.action === "SEND_IMAGES") {
      await this.sendMedia(chatId, response.data);
    }
  }

  async sendMedia(chatId: string, apartment: any) {
    for (const img of apartment.images || []) {
      await this.bot.telegram.sendPhoto(chatId, img);
    }
  }

  private async sendApartmentMenu(ctx: any, apartment: any) {
    const shortId = apartment.id.split("-")[0];
    return await ctx.reply(
      `מה תרצה לעשות?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📊 פרופיל מלא (Web)",
                web_app: { url: `https://app.com/p/${apartment.id}` },
              },
            ],
            [{ text: "📸 תמונות", callback_data: "get_media" }],
            [{ text: "📅 תיאום סיור", callback_data: "get_slots" }],
            [{ text: "❓ שאל שאלה", callback_data: "ask_question" }],
          ],
        },
      }
    );
  }
}
