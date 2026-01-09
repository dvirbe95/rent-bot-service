import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export class RagService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing in .env");
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async extractApartmentDetails(text: string) {
        try {
            // שימוש בגרסה הספציפית ביותר של המודל
            const model = this.genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash" 
            });

            const prompt = `
                Analyze this Hebrew text about an apartment and extract details into JSON.
                JSON Structure:
                {
                    "city": "string",
                    "price": number,
                    "rooms": number,
                    "description": "string",
                    "suggest_media": true
                }
                Text: "${text}"
                Return ONLY JSON.
            `;

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    // הכרחי כדי למנוע את שגיאת ה-404 בחלק מהאזורים
                    responseMimeType: "application/json",
                },
            });

            const response = await result.response;
            const responseText = response.text();
            
            console.log("🤖 Gemini Response:", responseText);
            
            return JSON.parse(responseText);
        } catch (error: any) {
            // אם עדיין יש 404, ננסה לוג מפורט יותר
            console.error("❌ Gemini Service Error:", error.message);
            if (error.message.includes("404")) {
                console.log("💡 Tip: Try checking if your API Key is restricted to a specific project or region.");
            }
            return null;
        }
    }

    async answerQuestionAboutApartment(question: string, apartment: any) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
                You are a real estate assistant for this apartment:
                City: ${apartment.city}, Price: ${apartment.price}, Details: ${apartment.description}.
                
                User Question: "${question}"

                Instructions:
                1. Answer the question in Hebrew based ONLY on the details provided.
                2. Action logic:
                   - If the user explicitly asks for photos/images, set action to "SEND_IMAGES".
                   - If the user expresses clear interest (e.g., "I want it", "How do I see it?", "Can we meet?") OR if you have finished answering all their technical questions and they seem satisfied, set action to "BOOK_TOUR".
                   - Otherwise, set action to "NONE".

                Return ONLY JSON:
                {
                    "answer": "Friendly Hebrew answer",
                    "action": "SEND_IMAGES" | "BOOK_TOUR" | "NONE"
                }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().replace(/```json|```/g, "").trim();
            return JSON.parse(responseText);
        } catch (error) {
            return { answer: "חלה שגיאה בחיבור לבינה המלאכותית.", action: "NONE" };
        }
    }

    // src/modules/rag/rag.service.ts

    async extractAvailability(text: string) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
            Analyze the following Hebrew text and extract specific available time slots for an apartment viewing.
            Convert relative dates (like "tomorrow" or "Friday") to actual dates based on today's date: ${new Date().toLocaleDateString()}.
            
            Text: "${text}"
            
            Return ONLY a JSON array of objects:
            [{"start": "YYYY-MM-DDTHH:mm:00", "end": "YYYY-MM-DDTHH:mm:00"}]
        `;
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text().replace(/```json|```/g, ""));
    }

    async extractPropertyUpdates(text: string) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
            The user wants to update their apartment details. Extract the changes from this text: "${text}"
            Map them to these fields: price (number), description (string), rooms (number).
            Return ONLY JSON of the changed fields. Example: {"price": 5500}
        `;
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text().replace(/```json|```/g, ""));
    }

    async extractSingleSlot(userText: string, availability: any[]) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `
            You are a scheduling assistant. 
            Available slots for the apartment: ${JSON.stringify(availability)}
            User message: "${userText}"
            Today's date: ${new Date().toISOString()}

            Task:
            1. Identify which available slot the user is choosing.
            2. If the user mentions a specific time from the list, return that object.
            3. If the user is vague but it matches one slot (e.g., "Sunday" when there's only one Sunday), return it.
            
            Return ONLY the JSON object of the chosen slot from the list. 
            If no match is found, return "null".
        `;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().replace(/```json|```/g, "").trim();
            if (text === "null") return null;
            return JSON.parse(text);
        } catch (error) {
            console.error("Error extracting single slot:", error);
            return null;
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
            
            const toneDescription = {
                professional: 'מקצועי, ענייני, פורמלי',
                casual: 'קליל, לא פורמלי, ידידותי',
                friendly: 'חם, מזמין, אישי'
            }[options.tone || 'professional'];

            const emojiInstruction = options.includeEmojis !== false 
                ? `הוסף אימוג'יים רלוונטיים (🏠, 📍, 💰 וכו')` 
                : `אל תוסיף אימוג'יים`;

            const platformGuidelines = {
                TELEGRAM: 'עבור טלגרם - טקסט שיווקי חזק, מובנה עם נקודות (bullets), שימוש נדיב באימוג\'יים, והדגשות.',
                WHATSAPP: 'עבור וואטסאפ - טקסט קצר, קולע, מתאים להעברה בקבוצות, עם פרטים ליצירת קשר.',
                FACEBOOK: 'עבור פייסבוק - פוסט ארוך ומפורט, סיפורי, מזמין תגובות, כולל פרטים על הסביבה (גנים, תחבורה וכו\').',
                INSTAGRAM: 'עבור אינסטגרם - טקסט קליל, צעיר, ממוקד ב"לייף סטייל" וחוויית המגורים.'
            }[options.platform];

            const shortId = apartment.id.split('-')[0];
            const botDeepLink = `https://t.me/dvir_rent_bot?start=${shortId}`;

            // הכנת נתונים מפורטים עבור ה-AI
            const availabilityText = apartment.availability ? 
                (Array.isArray(apartment.availability) ? `זמין לביקורים במועדים הבאים: ${JSON.stringify(apartment.availability)}` : 'יש זמינות גמישה לביקורים') : 
                'תאום ביקורים מול הבוט';
            
            const mediaInfo = `${apartment.images?.length || 0} תמונות ${apartment.video_url ? 'וסרטון וידאו' : ''}`;

            const prompt = `
אתה מומחה קופירייטינג לנדל"ן מהשורה הראשונה. המשימה שלך היא ליצור פוסט שיווקי עוצמתי, אינפורמטיבי ומפתה.
השתמש בכל הנתונים הבאים על הנכס כדי לבנות את המודעה:

--- נתוני הנכס ---
📍 עיר: ${apartment.city}
🏠 חדרים: ${apartment.rooms}
💰 מחיר: ${apartment.price} ₪
📍 כתובת: ${apartment.address || 'לא צוין'}
📝 תיאור חופשי: "${apartment.description || ''}"
📅 זמינות לביקורים: ${availabilityText}
📸 מדיה קיימת: ${mediaInfo}
🔗 לינק ישיר לתיאום בבוט: ${botDeepLink}
------------------

הוראות כתיבה מחייבות:
1. כותרת: צור כותרת "מפוצצת" שתגרום לאנשים לעצור את הגלילה.
2. מבנה: השתמש בנקודות (bullets) כדי להציג את היתרונות של הדירה בצורה נקייה ומקצועית.
3. פירוט מקסימלי: אל תחסיר אף פרט. אם צוין שיש מקרר, מעלית, או שהמיקום קרוב לרכבת - תהפוך את זה ליתרון שיווקי בולט.
4. טון: ${toneDescription}.
5. ${emojiInstruction}.
6. ${platformGuidelines}.
7. סיומת וקריאה לפעולה (CTA):
   הפוסט חייב להסתיים בדיוק בנוסח הזה (כולל האימוג'י):
   
   👇 לפרטים נוספים, צפייה בכל התמונות והסרטונים, ותיאום סיור מיידי ביומן שלי - לחצו כאן:
   ${botDeepLink}

פורמט הפלט:
- רק את טקסט הפוסט עצמו.
- רווח כפול בין פסקאות.
`;

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                },
            });

            let responseText = result.response.text().trim();
            
            // הבטחה שהלינק מופיע - הזרקה ידנית בסוף במידה וה-AI שכח או לתוספת ביטחון
            if (!responseText.includes(botDeepLink)) {
                responseText += `\n\n👇 לפרטים נוספים, צפייה בכל התמונות והסרטונים, ותיאום סיור מיידי בבוט החכם שלי - לחצו כאן:\n${botDeepLink}`;
            }

            return responseText;
        } catch (error: any) {
            console.error("❌ Post Generation Error:", error.message);
            // יצירת פוסט פשוט חלופי במקרה של שגיאה
            return this.createFallbackPost(apartment, options);
        }
    }

    private createFallbackPost(apartment: any, options: any): string {
        const shortId = apartment.id.split('-')[0];
        const botDeepLink = `https://t.me/dvir_rent_bot?start=${shortId}`;
        const emoji = options.includeEmojis !== false ? '🏠' : '';
        
        return `🌟 הזדמנות חדשה ב${apartment.city}! 🌟\n\n${emoji} דירת ${apartment.rooms} חדרים\n💰 מחיר: ${apartment.price} ש"ח\n📍 כתובת: ${apartment.address || 'צרו קשר לפרטים'}\n\n${apartment.description ? `📝 תיאור: ${apartment.description}\n\n` : ''}לפרטים נוספים, תמונות ותיאום סיור בבוט שלנו:\n${botDeepLink}`;
    }
}