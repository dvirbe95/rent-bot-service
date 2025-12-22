import 'dotenv/config';

export const config = {
    port: process.env.PORT || 3000,
    whatsapp: {
        sessionPath: './auth_info_baileys',
        name: 'Rent-Bot'
    }
};