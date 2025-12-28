// src/modules/calendar/calendar.service.ts
import { google } from "googleapis";

export class CalendarService {
  private calendar: any;

  constructor() {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!privateKey || !clientEmail) {
      console.warn("⚠️ CalendarService: Credentials missing in .env");
      return;
    }

    // יצירת ה-Auth עם הגדרות טיפוסים תקינות
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    this.calendar = google.calendar({
         version: "v3",
         auth: auth
        });
    }
  
    async createMeeting(apartment: any, slot: { start: string, end: string }, tenantName: string) {
        const event = {
            summary: `סיור בדירה: ${apartment.city}`,
            description: `תיאום עם השוכר ${tenantName} עבור דירה ${apartment.id.split('-')[0]}`,
            start: { dateTime: slot.start, timeZone: 'Israel' },
            end: { dateTime: slot.end, timeZone: 'Israel' },
        };

        // הוספת האירוע ליומן של המשכיר (במידה ויש לו ID) או ליומן המערכת
        return await this.calendar.events.insert({
            calendarId: apartment.calendar_id || 'primary',
            requestBody: event,
        });
    }
}