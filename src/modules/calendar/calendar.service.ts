// src/modules/calendar/calendar.service.ts
import { google } from "googleapis";
import * as nodemailer from 'nodemailer';

export class CalendarService {
  private calendar: any;

  constructor() {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!privateKey || !clientEmail) {
      console.warn("⚠️ CalendarService: Credentials missing in .env");
      return;
    }

    // תיקון: הסרת מירכאות מיותרות וטיפול נכון בירידות שורה
    const formattedKey = privateKey
      .replace(/^"(.*)"$/, '$1') // מסיר מירכאות אם הן קיימות בתחילת ובסוף המחרוזת
      .replace(/\\n/g, '\n');    // הופך \n לירידת שורה אמיתית

      console.log(formattedKey.substring(0, 30))

    try {
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: formattedKey,
        scopes: ["https://www.googleapis.com/auth/calendar"],
      });

      this.calendar = google.calendar({
        version: "v3",
        auth: auth
      });
    } catch (error) {
      console.error("❌ CalendarService: Failed to initialize auth", error);
    }
  }
async createMeeting(
  apartment: any, 
  slot: { start: string, end: string }, 
  tenantName: string,
  participantEmails: string[] // הוספת מיילים של המתווך והשוכר
) {
  if (!this.calendar) throw new Error("Calendar API not initialized");

  const event = {
    summary: `🏠 סיור בדירה: ${ 'aaa'}`,
    location: `${'aaa'}, ישראל`,
    description: `סיור בדירה שמזהה שלה הוא .\nתיאום בין המפרסם לשוכר ${tenantName}.`,
    start: { dateTime: slot.start, timeZone: 'Israel' },
    end: { dateTime: slot.end, timeZone: 'Israel' },
    // attendees: participantEmails.map(email => ({ email })), // הוספת המשתתפים
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    return await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // שולח הזמנה במייל למשתתפים באופן אוטומטי
    });
  }

  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // המייל ממנו תצא ההודעה
        pass: process.env.EMAIL_PASS  // "סיסמת אפליקציה" מחשבון הגוגל
    },
    tls: {
        rejectUnauthorized: false // מאפשר עבודה גם עם self-signed certificates
    }
  });

  async sendEmailNotification(landlordEmail: string, details: any) {
      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: landlordEmail,
          subject: `תיאום חדש לדירה ב 🏠`,
          html: `
              <h1>נקבע סיור חדש!</h1>
              <p><strong>השוכר:</strong> ${details.tenantName}</p>
              <p><strong>מועד:</strong> ${new Date(details.start).toLocaleString('he-IL')}</p>
              <p>הפגישה נרשמה אוטומטית ביומן שלך.</p>
          `
      };
      return await this.transporter.sendMail(mailOptions);
  }
}