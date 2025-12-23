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
                Extract apartment details from the following Hebrew text into a JSON object.
                Fields: 
                "city" (string, city name in Hebrew), 
                "price" (number, monthly rent in NIS), 
                "rooms" (number, number of rooms), 
                "description" (string, short summary).
                If a field is missing, use null.
                
                Text: "${text}"
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