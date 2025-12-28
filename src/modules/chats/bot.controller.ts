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
        const lastApartmentId = (user.metadata as any)?.last_published_id;
        const isSearch = text.startsWith('דירה ') || /^[a-f0-9-]{6,15}$/i.test(text);
        // בתוך handleMessage
        if (isSearch) {
            const shortId = text.replace('דירה ', '').trim();
            const apartment = await this.apartmentRepository.findApartmentById(shortId) || 
                              await this.apartmentRepository.getById(shortId);

            if (apartment) {
                // עדכון הסטטוס ב-DB - זה השלב הקריטי!
                await this.userRepository.updateStep(chatId, 'TALKING_ABOUT_APARTMENT', {
                    active_apartment_id: apartment.id // שומרים את ה-ID כדי שה-AI ידע על מה מדברים
                });

                const availability = (apartment as any).availability;

                // החזרת פרטי הדירה + השעות הזמינות
                const availabilityText = this.formatAvailability(availability);
                return { 
                    text: `מצאתי את הדירה ב-${apartment.city}!\n${apartment.description}\n\n${availabilityText}`,
                    action: 'OFFER_TOUR' 
                };
            }
        }

            // --- תרחיש עדכון נכס קיים (למשכיר) ---
            if (lastApartmentId && (cleanText.includes("עדכן") || cleanText.includes("שנה"))) {
                const updates = await this.ragService.extractPropertyUpdates(text);
                await this.apartmentRepository.updateApartment(lastApartmentId, updates);
                return { text: "הפרטים עודכנו בהצלחה! 📝" };
            }

            // --- תרחיש הגדרת זמינות לסיורים ---
            if (lastApartmentId && (cleanText.includes("פנוי") || cleanText.includes("זמינות"))) {
                const slots = await this.ragService.extractAvailability(text);
                await this.apartmentRepository.updateApartment(lastApartmentId, { availability: slots });
                return { text: `מעולה! הגדרתי שאתה פנוי במועדים האלו. שוכרים יוכלו לתאם איתך עכשיו. 📅` };
            }
        console.log(`DEBUG: [${user.current_step}] ${userName}: ${cleanText}`);

            // --- 1. אם המשתמש בשלב אישור - בודקים קודם כל את התשובה שלו ---
            if (user.current_step === 'CONFIRM_DETAILS') {
                 // בדיקה אם המשתמש שלח זמינות לפני שהוא אמר "כן"
                if (cleanText.includes("פנוי") || cleanText.includes("זמינות") || cleanText.includes("שעות")) {
                    const slots = await this.ragService.extractAvailability(text);
                    if (slots && slots.length > 0) {
                        const currentMetadata = (user.metadata as any) || {};
                        await this.userRepository.updateStep(chatId, 'CONFIRM_DETAILS', {
                            ...currentMetadata,
                            availability: slots // שמירת השעות ב-Metadata זמני
                        });
                        return { text: `מעולה, רשמתי את השעות! 📅\nהאם תרצה לאשר את פרסום המודעה עכשיו? (כתוב "כן")` };
                    }
                }

                if (cleanText === "כן" || cleanText.includes("כן") || cleanText.includes("מאשר")) {
                    const details = user.metadata as any;
                    const media = details.media || [];
                    
                    const fullInfo = `${details.city} ${details.rooms} חדרים ${details.description}`;
                    const embedding = await this.ragService.generateEmbedding(fullInfo);

                    const newApartment = await this.apartmentRepository.createApartment({
                        ...details,
                        images: media.filter((m: any) => m.type === 'image').map((m: any) => m.fileId),
                        availability: details.availability, // <--- כאן מוודאים שזה עובר
                        videos: media.filter((m: any) => m.type === 'video').map((m: any) => m.fileId),
                        phone_number: chatId
                    }, embedding);

                    // עדכון סטטוס ל-IDLE אבל שומרים את ה-ID של הדירה האחרונה כדי לאפשר הוספת תמונות גם אחרי
                    await this.userRepository.updateStep(chatId, 'START', { last_published_id: newApartment.id });
                    
                    const shortId = newApartment.id.split('-')[0];
                    const botUsername = "dvir_rent_bot"; // TODO - להחליף לשם המשתמש האמיתי של הבוט
                    const deepLink = `https://t.me/${botUsername}?start=${shortId}`;
                    return { 
                        text: `הדירה פורסמה בהצלחה! 🎉\n\n` +
                                `🏠 מזהה דירה: ${shortId}\n` +
                                `🔗 **לינק ישיר לשיתוף (שלח לשוכרים):**\n${deepLink}\n\n` +
                                `💡 טיפ: תוכל לשלוח לי עוד תמונות/סרטונים עכשיו והם יתווספו למודעה באופן אוטומטי.`,
                        action: 'SUCCESS' 
                    };
            } 
            
            if (cleanText === "לא" || cleanText.includes("לא") || cleanText.includes("בטל")) {
                await this.userRepository.updateStep(chatId, 'START', {});
                return { text: "הפרסום בוטל. אפשר לשלוח תיאור חדש.", action: null };
            }

            // אם הוא בסטטוס אישור וכתב משהו אחר - רק אז מחזירים את השאלה
            return { text: "זיהיתי פרטי דירה קודם, האם לאשר את הפרסום? (ענה 'כן' או 'לא')", action: null };
        }

        // --- 2. זיהוי כניסה לדירה (שוכר) ---
        const apartmentIdMatch = text.match(/דירה\s+([a-zA-Z0-9-]+)/i);
        if (apartmentIdMatch) {
            const shortId = apartmentIdMatch[1];            
            const apartment = await this.apartmentRepository.findApartmentById(shortId);
            if (apartment) {
                await this.userRepository.updateStep(chatId, 'TALKING_ABOUT_APARTMENT', { active_apartment_id: apartment.id });
                
                let welcomeMsg = `שלום! הגעת לבוט של הדירה ב-${apartment.city}.`;
                
                if (apartment.images?.length > 0 || apartment.video_url) {
                    welcomeMsg += `\n\nיש לי ${apartment.images.length} תמונות ו-${apartment.video_url} סרטונים של הנכס. לשלוח לך אותם? (ענה "כן" או שאל שאלה)`;
                    return { text: welcomeMsg, action: 'OFFER_MEDIA', data: apartment };
                }

                return { text: `${welcomeMsg} מה תרצה לדעת?`, action: null };
            }
        }

        // --- 3. לוגיקה לשוכר בשיחה פעילה ---
        if (user.current_step === 'TALKING_ABOUT_APARTMENT') { //&& (cleanText.includes("תאם") || cleanText.includes("מתאים לי"))
           const activeId = (user.metadata as any)?.active_apartment_id;
            const apartment = await this.apartmentRepository.getById(activeId);
            if (!apartment) return { text: "לא מצאתי את הדירה המדוברת." };

            if(text.includes("סיום")) {
                await this.userRepository.updateStep(chatId, 'START', {});
                return { text: "סיימנו את השיחה על הדירה. איך אוכל לעזור עוד?" };
            }

            // א. בדיקה אם המשתמש רוצה לתאם (לפי מילות מפתח)
            const isBookingIntent = (cleanText.includes("תאם") || cleanText.includes("מתאים לי") || cleanText.includes("לקבוע"));

            if (isBookingIntent) {
                const availability = (apartment as any).availability;
                const selectedSlot = await this.ragService.extractSingleSlot(text, availability);
                
                if (selectedSlot) {
                    await this.calendarService.createMeeting(apartment, selectedSlot, userName);
                    return { 
                        text: `הפגישה נקבעה! שלחתי עדכון למשכיר. נתראה ב-${selectedSlot.start}!`,
                        action: 'NOTIFY_LANDLORD',
                        data: {
                            landlordChatId: apartment.phone_number,
                            message: `תיאום חדש! 🎉\n${userName} קבע סיור ב-${apartment.city} למועד: ${selectedSlot.start}`
                        }
                    };
                } else {
                    return { text: "לא הצלחתי להבין איזה מועד בחרת. תוכל לכתוב למשל 'אני רוצה את האופציה הראשונה'?" };
                }
            }

            // ב. אם זה לא תיאום - זו שאלה על הנכס (שימוש ב-AI)
            const aiResponse = await this.ragService.answerQuestionAboutApartment(text, apartment);
            return { 
                text: aiResponse.answer, 
                action: aiResponse.action, 
                data: apartment // מחזיר את הדירה למקרה שצריך לשלוח תמונות (SEND_IMAGES)
            };
        }

        // --- 4. זיהוי תיאור דירה חדשה (רק אם לא קרה כלום למעלה) ---
        if (text.length > 40 && user.current_step === 'START') {
            const details = await this.ragService.extractApartmentDetails(text);
            if (details && details.city) {
                await this.userRepository.updateStep(chatId, 'CONFIRM_DETAILS', details);
                return { 
                    text: `זיהיתי דירה ב-${details.city}:\n💰 מחיר: ${details.price}\n🏠 חדרים: ${details.rooms}\n\n📸 **זה הזמן לשלוח תמונות או סרטונים!**\nבסיום, ענה "כן" כדי לאשר את הפרסום.`,
                    action: null 
                };
            }
        }

        // --- 5. ברירת מחדל ---
        return { text: `היי ${userName}! שלח לי תיאור דירה לפרסום או מזהה דירה.`, action: null };
    }

// פונקציה לעיצוב השעות בצורה יפה לשוכר
    private formatAvailability(availability: any): string {
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