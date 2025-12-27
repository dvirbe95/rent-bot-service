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
}