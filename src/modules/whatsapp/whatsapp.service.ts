import makeWASocket, { 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    WASocket, 
    DisconnectReason 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { config } from '../../common/config/env';
import { WhatsAppController } from './whatsapp.controller';

export class WhatsAppService {
    private sock: WASocket | null = null;
    private controller: WhatsAppController;

    constructor() {
        this.controller = new WhatsAppController();
    }

    async initialize() {
        const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: [config.whatsapp.name, "Chrome", "1.0.0"]
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) qrcode.generate(qr, { small: true });

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) this.initialize();
            } else if (connection === 'open') {
                console.log('✅ WhatsApp Module Connected');
            }
        });

        this.sock.ev.on('messages.upsert', async (m) => {
            if (this.sock) await this.controller.handleIncoming(this.sock, m);
        });
    }
}