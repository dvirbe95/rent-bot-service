import 'dotenv/config';
import express from 'express';
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

const app = express();
const PORT = process.env.PORT || 3000;
// ניהול מצבי שיחה זמני (בשלב הבא נעבור למסד נתונים)
const userState: { [key: string]: { step: string; data: any } } = {};

const STEPS = {
    START: 'START',
    CHOOSE_ROLE: 'CHOOSE_ROLE',
    // שלבי המשכיר
    LANDLORD_LOCATION: 'LANDLORD_LOCATION',
    LANDLORD_PRICE: 'LANDLORD_PRICE',
    // שלבי השוכר
    TENANT_BUDGET: 'TENANT_BUDGET'
};

async function connectToWhatsApp() {
    // שמירת מצב ההתחברות בתיקייה מקומית (כדי שלא נצטרך לסרוק QR כל פעם מחדש)
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: true, // זה יציג את ה-QR בטרמינל שלך
        auth: state,
        logger: pino({ level: 'silent' }) // מוריד רעש של לוגים מיותרים
    });

    // שמירת עדכוני הרשאות
    sock.ev.on('creds.update', saveCreds);

    // ניהול מצבי חיבור
sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // אם יש קוד QR חדש, נדפיס אותו ידנית לטרמינל
        if (qr) {
            console.log('סרוק את קוד ה-QR הבא כדי להתחבר:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('החיבור נסגר, מנסה להתחבר מחדש:', shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ הבוט מחובר לוואטסאפ בהצלחה!');
        }
    });

    // האזנה להודעות נכנסות
sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    // 1. קבלת זמן ההודעה (בשניות)
    const messageTimestamp = msg.messageTimestamp as number;
    const now = Math.floor(Date.now() / 1000);

    // 2. התעלמות מהודעות שנשלחו לפני יותר מ-60 שניות (מסנן היסטוריה)
    if (now - messageTimestamp > 60) {
        console.log(`⏳ התעלמתי מהודעה ישנה מ-${msg.key.remoteJid}`);
        return;
    }

    const sender = msg.key.remoteJid!;
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();

    // 3. מסנן מספרים (אופציונלי - רק מספרים ספציפיים יקבלו מענה בשלב הפיתוח)
    // אם אתה רוצה שהבוט יענה לכולם, פשוט תמחק את החלק הזה
    /*
    const allowedNumbers = ['972528406351@s.whatsapp.net']; 
    if (!allowedNumbers.includes(sender)) {
        console.log(`🚫 התעלמתי מהודעה ממספר לא מורשה: ${sender}`);
        return;
    }
    */

    console.log(`📩 הודעה רלוונטית מ-${sender}: ${text}`);

    // כאן ממשיך ה-switch(currentState.step) שלך...
});
}

// הפעלת השרת והבוט
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectToWhatsApp();
});