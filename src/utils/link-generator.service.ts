export class LinkGeneratorService {
    /**
     * יוצר לינק וואטסאפ ששוכר לוחץ עליו כדי להתחיל שיחה על דירה ספציפית
     */
    static generateApartmentLink(botNumber: string, apartmentShortId: string): string {
        // ניקוי מספר הטלפון מתווים מיותרים
        const cleanNumber = botNumber.split(':')[0].replace(/\D/g, '');
        const text = encodeURIComponent(`היי, אשמח לפרטים על דירה ${apartmentShortId}`);
        return `https://wa.me/${cleanNumber}?text=${text}`;
    }
}