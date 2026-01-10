import { GoogleGenerativeAI } from "@google/generative-ai";

export class RagService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing in .env");
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    private formatApartmentContext(apartment: any): string {
        const booleanFields = [
            { key: 'balcony', label: 'מרפסת' },
            { key: 'shelter', label: 'מקלט' },
            { key: 'mamad', label: 'ממ"ד' },
            { key: 'furnished', label: 'מרוהטת' },
            { key: 'petsAllowed', label: 'מותר בעלי חיים' },
            { key: 'parking', label: 'חניה' },
            { key: 'elevator', label: 'מעלית' },
            { key: 'nearbyConstruction', label: 'בניה בקרבת מקום' },
            { key: 'priceFlexibility', label: 'גמישות במחיר' },
        ];

        let context = `
            עיר: ${apartment.city}
            כתובת: ${apartment.address || 'לא צוין'}
            מחיר: ${apartment.price} ₪
            חדרים: ${apartment.rooms}
            קומה: ${apartment.floor || 'לא צוין'}
            מ"ר: ${apartment.sqm || 'לא צוין'}
            ארנונה: ${apartment.arnona || 'לא צוין'} ₪
            ועד בית: ${apartment.vaadBayit || 'לא צוין'} ₪
            ערבונות: ${apartment.collateral || 'לא צוין'}
            תאריך כניסה: ${apartment.entryDate ? new Date(apartment.entryDate).toLocaleDateString('he-IL') : 'מיידי/גמיש'}
            תיאור: ${apartment.description || ''}
            שכנים: ${apartment.neighbors || 'לא צוין'}
            מרכז מסחרי קרוב: ${apartment.commercialCenter || 'לא צוין'}
            בתי ספר וגנים: ${apartment.schools || 'לא צוין'}
            איזורי בילוי: ${apartment.entertainmentAreas || 'לא צוין'}
            טלפון ליצירת קשר: ${apartment.contactPhone || 'לא צוין'}
            
            מידע נוסף על הסביבה (נתונים רשמיים):
            ${apartment.neighborhoodData ? JSON.stringify(apartment.neighborhoodData) : 'אין מידע נוסף'}
        `;

        booleanFields.forEach(field => {
            if (apartment[field.key]) {
                context += `${field.label}: כן\n`;
            } else if (apartment[field.key] === false) {
                context += `${field.label}: לא\n`;
            }
        });

        return context;
    }

    async extractApartmentDetails(text: string) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
                Analyze this Hebrew text about an apartment and extract details into JSON.
                Text: "${text}"
                Return ONLY JSON following this structure:
                {
                    "city": "string",
                    "price": number,
                    "rooms": number,
                    "description": "string",
                    "address": "string",
                    "floor": number,
                    "sqm": number,
                    "arnona": number,
                    "vaadBayit": number,
                    "balcony": boolean,
                    "parking": boolean,
                    "elevator": boolean
                }
            `;

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" },
            });

            return JSON.parse(result.response.text());
        } catch (error: any) {
            console.error("❌ Gemini Service Error:", error.message);
            return null;
        }
    }

    async answerQuestionAboutApartment(question: string, apartment: any) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const apartmentContext = this.formatApartmentContext(apartment);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            const publicLink = `${frontendUrl}/p/${apartment.id}`;
            
            const prompt = `
                אתה עוזר נדל"ן אישי וחכם. ענה על השאלה של הלקוח לגבי הנכס הבא בעברית.
                השתמש אך ורק במידע שסופק כאן. אם מידע חסר, ציין שאינך יודע והצע להשאיר הודעה למפרסם.
                
                נתוני הנכס:
                ${apartmentContext}
                
                לינק לפרופיל המלא: ${publicLink}
                שאלה: "${question}"

                הוראות:
                1. ענה בצורה שירותית, אדיבה ומקצועית.
                2. בסוף התשובה, אם זה רלוונטי, הפנה את הלקוח לצפייה בתמונות ופרטים נוספים בלינק: ${publicLink}
                3. אם הלקוח שואל על תמונות, הגדר action ל-"SEND_IMAGES".
                4. אם הלקוח מביע עניין רב או רוצה לתאם, הגדר action ל-"BOOK_TOUR".
                
                החזר אך ורק JSON במבנה הבא:
                {
                    "answer": "תשובה בעברית",
                    "action": "SEND_IMAGES" | "BOOK_TOUR" | "NONE"
                }
            `;

            const result = await model.generateContent(prompt);
            return JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
        } catch (error) {
            return { answer: "מצטער, אני מתקשה לענות כרגע. תרצה שאחבר אותך למפרסם?", action: "NONE" };
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error("❌ Embedding Error:", error);
            return [];
        }
    }

    async generatePost(apartment: any, options: {
        platform: 'TELEGRAM' | 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM';
        tone?: 'professional' | 'casual' | 'friendly';
        includeEmojis?: boolean;
    }): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const apartmentContext = this.formatApartmentContext(apartment);
            const shortId = apartment.id.split('-')[0];
            const botDeepLink = `https://t.me/dvir_rent_bot?start=${shortId}`;

            const toneDescription = {
                professional: 'מקצועי, ענייני, פורמלי',
                casual: 'קליל, לא פורמלי, ידידותי',
                friendly: 'חם, מזמין, אישי'
            }[options.tone || 'professional'];

            const prompt = `
                צור פוסט שיווקי מושלם לפלטפורמה ${options.platform} בטון ${toneDescription}.
                השתמש בנתונים הבאים:
                ${apartmentContext}
                
                הוראות:
                1. כותרת מושכת.
                2. הדגש יתרונות (מרפסת, חניה, קרוב לבתי ספר וכו').
                3. הנעה לפעולה בסוף עם הלינק: ${botDeepLink}
                ${options.includeEmojis ? 'הוסף אימוג\'יים מתאימים.' : 'ללא אימוג\'יים.'}
            `;

            const result = await model.generateContent(prompt);
            let responseText = result.response.text().trim();
            if (!responseText.includes(botDeepLink)) {
                responseText += `\n\n👇 לפרטים נוספים ותיאום סיור מיידי:\n${botDeepLink}`;
            }
            return responseText;
        } catch (error) {
            return `דירה ב${apartment.city} למכירה/השכרה. לפרטים: https://t.me/dvir_rent_bot?start=${apartment.id.split('-')[0]}`;
        }
    }

    async extractAvailability(text: string) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `בצע חילוץ של זמני פנוי לביקור בפורמט JSON: [{"start": "...", "end": "..."}]. טקסט: ${text}`;
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text().replace(/```json|```/g, ""));
    }
}
