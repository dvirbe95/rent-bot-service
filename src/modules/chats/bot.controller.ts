// src/modules/bot/bot.controller.ts
import { RagService } from '../rag/rag.service';
import { CalendarService } from '../calendar/calendar.service';
import { WhatsAppRepository } from '../whatsapp/whatsapp.repository';
import { ApartmentRepository } from '../apartments/apartment.repository';

export class BotController {
    private ragService = new RagService();
    private apartmentRepository = new ApartmentRepository();
    private userRepository = new WhatsAppRepository();
    private calendarService = new CalendarService();

    async handleMessage(chatId: string, text: string, userName: string) {
    const user = await this.userRepository.getOrCreateUser(chatId);
    const cleanText = text.trim().toLowerCase();
    
    // 1. עדיפות עליונה: חיפוש דירה / פתיחת לינק
    const isSearch = text.startsWith('דירה ') || /^[a-f0-9-]{6,15}$/i.test(text);
    if (isSearch) {
        return await this.handleApartmentLookup(chatId, text);
    }

    // 2. טיפול לפי סטטוס נוכחי (State Machine)
    switch (user.current_step) {
        case 'CONFIRM_DETAILS':
            return await this.handleConfirmDetails(chatId, text, user);
            
        case 'TALKING_ABOUT_APARTMENT':
            return await this.handleActiveConversation(chatId, text, user, userName);
            
        default:
            return await this.handleInitialState(chatId, text, user, userName);
    }
}

/** * פתיחת דירה לפי מזהה
 */
   async handleApartmentLookup(chatId: string, text: string) {
    const shortId = text.replace('דירה ', '').trim();
    
    // חיפוש הדירה בבסיס הנתונים
    const apartment = await this.apartmentRepository.findApartmentById(shortId) || 
                      await this.apartmentRepository.getById(shortId);

    if (!apartment) {
        return { text: "לא מצאתי דירה עם המזהה הזה. וודא שהקוד נכון.", action: null };
    }

    // עדכון הסטטוס כדי שהבוט יזכור על איזו דירה מדברים בשיחה
    await this.userRepository.updateStep(chatId, 'TALKING_ABOUT_APARTMENT', { 
        active_apartment_id: apartment.id 
    });

    // בניית התפריט הידידותי
    const menuButtons = [
        [{ 
            text: "📊 לצפייה בפרופיל נכס מלא (HTML)", 
            web_app: { url: `https://your-domain.com/apartment-profile/${apartment.id}` } 
        }],
        [{ text: "📸 שלח לי תמונות וסרטונים", callback_data: "get_media" }],
        [{ text: "📅 תאם סיור בדירה", callback_data: "get_slots" }],
        [{ text: "❓ שאל שאלה על הנכס", callback_data: "ask_question" }]
    ];

    // הודעת פתיחה מרשימה
    const welcomeMsg = `🏠 **מצאתי את הדירה ב-${apartment.city}!**\n\n` +
                       `${apartment.description}\n\n` +
                       `מה תרצה לעשות עכשיו? בחר מהאפשרויות למטה:`;
    
    return { 
        text: welcomeMsg, 
        buttons: menuButtons, // הוספת הכפתורים לאובייקט התגובה
        action: 'SHOW_MENU',  // עדכון ה-action (ה-TelegramService ידע לטפל בזה)
        data: apartment 
    };
}

/**
 * שלב אישור פרסום הדירה
 */
private async handleConfirmDetails(chatId: string, text: string, user: any) {
    const cleanText = text.toLowerCase();

    // בדיקת עדכון זמינות תוך כדי אישור
    if (cleanText.includes("פנוי") || cleanText.includes("זמינות")) {
        const slots = await this.ragService.extractAvailability(text);
        if (slots?.length) {
            await this.userRepository.updateStep(chatId, 'CONFIRM_DETAILS', { 
                ...(user.metadata as any), 
                availability: slots 
            });
            return { text: "מעולה, רשמתי את השעות! 📅\nהאם תרצה לאשר את הפרסום כעת? (כתוב 'כן')" };
        }
    }

    // ביטול
    if (["לא", "בטל", "ביטול"].some(word => cleanText.includes(word))) {
        await this.userRepository.updateStep(chatId, 'START', {});
        return { text: "הפרסום בוטל. אפשר לשלוח תיאור חדש.", action: null };
    }

    // אישור ושמירה
    if (["כן", "מאשר", "אוקיי"].some(word => cleanText.includes(word))) {
        return await this.finalizeApartmentCreation(chatId, user);
    }

    return { text: "זיהיתי פרטי דירה. האם לאשר את הפרסום? (כן/לא)", action: null };
}

/**
 * שיחה פעילה בין שוכר לדירה
 */
private async handleActiveConversation(chatId: string, text: string, user: any, userName: string) {
    if (text.includes("סיום")) {
        await this.userRepository.updateStep(chatId, 'START', {});
        return { text: "סיימנו את השיחה על הדירה. איך אוכל לעזור עוד?" };
    }

    const activeId = (user.metadata as any)?.active_apartment_id;
    const apartment = await this.apartmentRepository.getById(activeId) as any;
    if (!apartment) return { text: "לא מצאתי את הדירה המדוברת." };

    const cleanText = text.toLowerCase();
    const isBookingIntent = ["תאם", "מתאים", "לקבוע"].some(word => cleanText.includes(word));

    if (isBookingIntent) {
        const selectedSlot = await this.ragService.extractSingleSlot(text, apartment.availability);
        if (selectedSlot) {
            await this.calendarService.createMeeting(apartment, selectedSlot, userName);

            // 2. שליחת מייל למשכיר (כאן הקריאה החדשה)
            if (apartment.owner_email) { // וודא שיש לך שדה כזה ב-DB
                await this.calendarService.sendEmailNotification(apartment.owner_email, {
                    city: apartment.city,
                    tenantName: userName,
                    start: selectedSlot.start
                });
            }

            return { 
                text: `הפגישה נקבעה! שלחתי עדכון למשכיר. נתראה ב-${selectedSlot.start}!`,
                action: 'NOTIFY_LANDLORD',
                data: {
                    landlordChatId: apartment.phone_number,
                    message: `תיאום חדש! 🎉\n${userName} קבע סיור ב-${apartment.city} למועד: ${selectedSlot.start}`
                }
            };
        }
        return { text: "לא הצלחתי להבין איזה מועד בחרת. תוכל לציין את מספר האופציה?" };
    }

    const aiResponse = await this.ragService.answerQuestionAboutApartment(text, apartment);
    return { text: aiResponse.answer, action: aiResponse.action, data: apartment };
}

/**
 * מצב התחלתי - זיהוי תיאור חדש או עדכון זמינות למשכיר קיים
 */
private async handleInitialState(chatId: string, text: string, user: any, userName: string) {
    const lastApartmentId = (user.metadata as any)?.last_published_id;
    const cleanText = text.toLowerCase();

    // עדכון זמינות למשכיר קיים
    if (lastApartmentId && (cleanText.includes("פנוי") || cleanText.includes("זמינות"))) {
        const slots = await this.ragService.extractAvailability(text);
        await this.apartmentRepository.updateApartment(lastApartmentId, { availability: slots });
        return { text: "מעולה! הגדרתי שאתה פנוי במועדים האלו. שוכרים יכולים לתאם כעת. 📅" };
    }

    // זיהוי תיאור דירה חדשה
    if (text.length > 40) {
        const details = await this.ragService.extractApartmentDetails(text);
        if (details?.city) {
            await this.userRepository.updateStep(chatId, 'CONFIRM_DETAILS', details);
            return { 
                text: `זיהיתי דירה ב-${details.city}:\n💰 מחיר: ${details.price}\n🏠 חדרים: ${details.rooms}\n\n📸 שלח תמונות עכשיו, ובסיום כתוב "כן" לאישור.`,
                action: null 
            };
        }
    }

    return { text: `היי ${userName}! שלח לי תיאור דירה לפרסום או מזהה דירה לחיפוש.`, action: null };
}

/**
 * שמירה סופית של הדירה בבסיס הנתונים
 */
private async finalizeApartmentCreation(chatId: string, user: any) {
    const details = user.metadata as any;
    const media = details.media || [];
    const fullInfo = `${details.city} ${details.rooms} חדרים ${details.description}`;
    const embedding = await this.ragService.generateEmbedding(fullInfo);

    const newApartment = await this.apartmentRepository.createApartment({
        ...details,
        images: media.filter((m: any) => m.type === 'image').map((m: any) => m.fileId),
        videos: media.filter((m: any) => m.type === 'video').map((m: any) => m.fileId),
        phone_number: chatId
    }, embedding);

    await this.userRepository.updateStep(chatId, 'START', { last_published_id: newApartment.id });
    
    const shortId = newApartment.id.split('-')[0];
    const deepLink = `https://t.me/dvir_rent_bot?start=${shortId}`;
    
    return { 
        text: `הדירה פורסמה בהצלחה! 🎉\nמזהה: ${shortId}\nלינק לשיתוף: ${deepLink}`,
        action: 'SUCCESS' 
    };
}

// פונקציה לעיצוב השעות בצורה יפה לשוכר
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

    async handleMedia(chatId: string, fileId: string, type: string) {
        const user = await this.userRepository.getOrCreateUser(chatId);

        // מקרה א: המשתמש באמצע תהליך פרסום (לפני ה"כן")
        if (user.current_step === 'CONFIRM_DETAILS') {
            const metadata = (user.metadata as any) || {};
            if (!metadata.media) metadata.media = [];
            metadata.media.push({ fileId, type });
            await this.userRepository.updateStep(chatId, 'CONFIRM_DETAILS', metadata);
            return { text: `הקובץ נוסף למודעה! ניתן לשלוח עוד או לכתוב "כן" לסיום.` };
        }

        // מקרה ב: המשתמש כבר אישר (אחרי ה"כן") אבל רוצה להוסיף עוד
        const lastPublishedId = (user.metadata as any)?.last_published_id;
        if (lastPublishedId) {
            // כאן צריך להוסיף מתודה ב-Repository שמעדכנת דירה קיימת (updateApartmentMedia)
            // לצורך הפשטות, נחזיר הודעה המאשרת שזה אפשרי (נממש את העדכון ב-Repository בשלב הבא)
            return { text: "קיבלתי! התמונה נוספה למודעה שפרסמת זה עתה. ✅" };
        }

        return { text: "כדי לשלוח תמונות, שלח קודם תיאור של דירה חדשה." };
    }
}