// import { OpenAI } from 'openai';
// import { RagRepository } from './rag.repository';

export class RagService {
    // private openai = new OpenAI();
    // private repo = new RagRepository();

    async getRelevantApartments(query: string) {
        // 1. הפיכת השאלה לוקטור (Embedding)
        const embedding = await this.generateEmbedding(query);

        // 2. חיפוש סמנטי ב-Repository
        // const results = await this.repo.searchSimilar(embedding);

        // 3. יצירת תשובה מבוססת הקשר (Contextual Response)
        // return this.generateAnswer(query, results);
    }

    private async generateEmbedding(text: string) {
        // const response = await this.openai.embeddings.create({
        //     model: "text-embedding-3-small",
        //     input: text,
        // });
        // return response.data[0].embedding;
    }
}