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
    participantEmails: string[]
  ) {
    // בגלל מגבלות Service Account של גוגל (Domain-Wide Delegation), 
    // אנחנו מסתמכים על שליחת זימון ICS במייל (Nodemailer) שמאפשר למשתמש להוסיף ליומן שלו.
    // הפונקציה הזו כרגע רק רושמת לוג, בעתיד ניתן להוסיף כאן רישום ליומן מרכזי של המערכת.
    console.log(`📅 Meeting request logged: ${tenantName} for apartment ${apartment.city} at ${slot.start}`);
    return { id: 'logged-only' };
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

  async sendEmailNotification(emails: string | string[], details: any) {
    const emailList = Array.isArray(emails) ? emails : [emails];
    
    if (!emailList || emailList.length === 0 || !emailList.some(e => !!e)) {
        console.warn('⚠️ No valid emails provided for notification');
        return;
    }

    // אם זו התראה כללית ולא פגישה
    if (details.type !== 'NEW_MEETING' && !details.start) {
        const mailOptions = {
            from: `"RentBot" <${process.env.EMAIL_USER}>`,
            to: emailList,
            subject: details.title || 'התראה חדשה מ-RentBot 🔔',
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">${details.title}</h1>
                    <p style="font-size: 1.1em; white-space: pre-wrap;">${details.message}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8em; color: #7f8c8d;">נשלח באופן אוטומטי על ידי RentBot</p>
                </div>
            `
        };
        return await this.transporter.sendMail(mailOptions);
    }
    
    // לוגיקה קיימת עבור פגישות
    const rawStart = details.start || details.payload?.meetingTime;
    const startTime = new Date(rawStart);

    if (!rawStart || isNaN(startTime.getTime())) {
        // אם זה NEW_MEETING אבל אין תאריך תקין, נהפוך את זה להתראה רגילה כדי למנוע לולאה אינסופית
        const backupDetails = {
            ...details,
            type: 'SYSTEM_ALERT',
            start: null
        };
        return this.sendEmailNotification(emails, backupDetails);
    }

    const endTime = new Date(startTime.getTime() + 30 * 60000); // פגישה של 30 דקות
    
    const apartment = details.apartment || details.payload?.apartment;
    const fullAddress = apartment?.address ? `${apartment.address}, ${apartment.city}` : apartment?.city;
    const wazeLink = `https://waze.com/ul?q=${encodeURIComponent(fullAddress || '')}`;
    
    // חילוץ המזהה לטובת הלינק
    const shortId = apartment?.id?.substring(0, 8) || details.apartmentId?.substring(0, 8) || '';
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
      `DESCRIPTION:תיאום סיור עם השוכר ${details.tenantName}.\nניווט ב-Waze: ${wazeLink}\nלפרטים נוספים בבוט: ${botLink}`,
      `LOCATION:${fullAddress}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const mailOptions = {
      from: `"RentBot" <${process.env.EMAIL_USER}>`,
      to: emails,
      subject: `תיאום סיור חדש ב-${details.city} 🏠`,
      html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">נקבע סיור חדש! 🎉</h1>
              <p style="font-size: 1.1em;">היי, נקבע תיאום סיור עבור הנכס ב${details.city}.</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-right: 5px solid #3498db; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>👤 שוכר פוטנציאלי:</strong> ${details.tenantName}</p>
                  <p style="margin: 5px 0;"><strong>📅 מועד:</strong> ${startTime.toLocaleString("he-IL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p style="margin: 5px 0;"><strong>📍 מיקום:</strong> ${fullAddress}</p>
              </div>

              <div style="display: flex; gap: 10px; margin-top: 25px;">
                  <a href="${wazeLink}" 
                     style="display: inline-block; padding: 12px 25px; background-color: #33ccff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-left: 10px;">
                     🚗 ניווט ב-Waze
                  </a>
                  
                  <a href="${botLink}" 
                     style="display: inline-block; padding: 12px 25px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                     💬 פתיחה בטלגרם
                  </a>
              </div>

              <p style="margin-top: 30px; font-size: 0.9em; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 15px;">
                  * זימון ליומן (Add to Calendar) צורף למייל זה כקובץ invite.ics.<br>
                  * מומלץ לוודא הגעה לפני המועד.
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
