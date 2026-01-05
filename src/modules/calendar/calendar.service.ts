// src/modules/calendar/calendar.service.ts
import { google } from "googleapis";
import * as nodemailer from "nodemailer";

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
      .replace(/^"(.*)"$/, "$1") // מסיר מירכאות אם הן קיימות בתחילת ובסוף המחרוזת
      .replace(/\\n/g, "\n"); // הופך \n לירידת שורה אמיתית

    console.log(formattedKey.substring(0, 30));

    try {
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: formattedKey,
        scopes: ["https://www.googleapis.com/auth/calendar"],
      });

      this.calendar = google.calendar({
        version: "v3",
        auth: auth,
      });
    } catch (error) {
      console.error("❌ CalendarService: Failed to initialize auth", error);
    }
  }
  async createMeeting(
    apartment: any,
    slot: { start: string; end: string },
    tenantName: string,
    participantEmails: string[] // הוספת מיילים של המתווך והשוכר
  ) {
    if (!this.calendar) throw new Error("Calendar API not initialized");

    const event = {
      summary: `🏠 סיור בדירה: ${apartment.city}`,
      location: `${apartment.city}, ישראל`,
      description: `סיור בדירה שמזהה שלה הוא .\nתיאום בין המפרסם לשוכר ${tenantName}.`,
      start: { dateTime: slot.start, timeZone: "Israel" },
      end: { dateTime: slot.end, timeZone: "Israel" },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    return await this.calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all", // שולח הזמנה במייל למשתתפים באופן אוטומטי
    });
  }

  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // המייל ממנו תצא ההודעה
      pass: process.env.EMAIL_PASS, // "סיסמת אפליקציה" מחשבון הגוגל
    },
    tls: {
      rejectUnauthorized: false, // מאפשר עבודה גם עם self-signed certificates
    },
  });

  async sendEmailNotification(emails: string[], details: any) {
    const startTime = new Date(details.start);
    const endTime = new Date(startTime.getTime() + 30 * 60000); // פגישה של 30 דקות
    
    // חילוץ ה-ID הקצר לטובת הלינק
    const shortId = details.apartmentId ? details.apartment.phone_number.split('-')[0] : '';
    const botLink = `https://t.me/dvir_rent_bot?start=${shortId}`;

    // יצירת תוכן ה-ICS
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//RentBot//NONSGML v1.0//EN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `DTSTART:${startTime.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTEND:${endTime.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `SUMMARY:🏠 סיור בדירה: ${details.city}`,
      `DESCRIPTION:תיאום סיור עם השוכר ${details.tenantName}. לפרטים נוספים ושאלות בבוט: ${botLink}`,
      `LOCATION:${details.city}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const mailOptions = {
      from: `"RentBot" <${process.env.EMAIL_USER}>`,
      to: emails,
      subject: `תיאום סיור חדש ב-${details.city} 🏠`,
      html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h1 style="color: #2c3e50;">נקבע סיור חדש! 🎉</h1>
              <p>היי, נקבע תיאום סיור עבור הנכס שלך ב${details.city}.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-right: 5px solid #3498db;">
                  <p><strong>👤 שוכר פוטנציאלי:</strong> ${details.tenantName}</p>
                  <p><strong>📅 מועד:</strong> ${startTime.toLocaleString("he-IL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>📍 מיקום:</strong> ${details.city}</p>
              </div>

              <p style="margin-top: 20px;">יש לך שאלות נוספות? רוצה לנהל את הדירה בבוט?</p>
              <a href="${botLink}" 
                 style="display: inline-block; padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                 💬 פתיחת הדירה בטלגרם
              </a>

              <p style="font-size: 0.9em; color: #7f8c8d; margin-top: 30px;">
                  * זימון ליומן צורף למייל זה.
              </p>
          </div>
      `,
      icalEvent: {
        filename: "invite.ics",
        method: "REQUEST",
        content: icsContent,
      },
    };

    return await this.transporter.sendMail(mailOptions);
}
}
