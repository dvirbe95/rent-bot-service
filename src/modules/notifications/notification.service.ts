import { PrismaClient, NotificationType, NotificationStatus } from '@prisma/client';
import { TelegramService } from '../../delivery/telegram/telegram.service';
import { CalendarService } from '../calendar/calendar.service';

export class NotificationService {
    private prisma = new PrismaClient();
    private isProcessing = false;

    constructor(
        private telegramService: TelegramService,
        private calendarService: CalendarService
    ) {
        // התחלת ה-Worker שבודק את התור כל 30 שניות
        setInterval(() => this.processQueue(), 30000);
    }

    /**
     * מוסיף התראה חדשה לתור
     */
    async queueNotification(params: {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        payload?: any;
    }) {
        try {
            return await this.prisma.notification.create({
                data: {
                    userId: params.userId,
                    type: params.type,
                    title: params.title,
                    message: params.message,
                    payload: params.payload || {},
                    status: NotificationStatus.PENDING
                }
            });
        } catch (error) {
            console.error('Error queuing notification:', error);
        }
    }

    /**
     * מעבד את התור ושולח התראות שממתינות
     */
    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const pendingNotifications = await this.prisma.notification.findMany({
                where: {
                    status: NotificationStatus.PENDING,
                    attempts: { lt: 3 } // מקסימום 3 ניסיונות
                },
                include: {
                    user: true
                },
                take: 10, // מעבד 10 בכל פעם כדי לא להעמיס
                orderBy: { createdAt: 'asc' }
            });

            for (const notification of pendingNotifications) {
                try {
                    await this.sendNotification(notification);
                    
                    await this.prisma.notification.update({
                        where: { id: notification.id },
                        data: { status: NotificationStatus.SENT }
                    });
                } catch (error) {
                    console.error(`Failed to send notification ${notification.id}:`, error);
                    
                    await this.prisma.notification.update({
                        where: { id: notification.id },
                        data: { 
                            attempts: { increment: 1 },
                            error: error.message,
                            status: notification.attempts >= 2 ? NotificationStatus.FAILED : NotificationStatus.PENDING
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error processing notification queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * שולח את ההתראה בערוצים הרלוונטיים
     */
    private async sendNotification(notification: any) {
        const { user, title, message, type } = notification;
        const promises = [];

        // 1. שליחה בטלגרם אם יש chatId
        if (user.chatId) {
            const telegramMessage = `🔔 *${title}*\n\n${message}`;
            promises.push(this.telegramService.sendMessage(user.chatId, telegramMessage));
        }

        // 2. שליחה במייל אם יש אימייל
        if (user.email) {
            promises.push(this.calendarService.sendEmailNotification(
                user.email,
                notification
            ));
        }

        await Promise.all(promises);
    }
}
