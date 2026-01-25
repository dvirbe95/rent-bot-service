import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationController {
    /**
     * מקבל את כל ההתראות של המשתמש המחובר
     */
    static async getMyNotifications(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            
            const notifications = await prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 50 // מחזירים את ה-50 האחרונות
            });

            const unreadCount = await prisma.notification.count({
                where: { userId, isRead: false }
            });

            res.json({ notifications, unreadCount });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    /**
     * מסמן התראה כנקראה
     */
    static async markAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { id } = req.params;

            await prisma.notification.update({
                where: { id, userId },
                data: { isRead: true }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }

    /**
     * מסמן את כל ההתראות כנקראו
     */
    static async markAllAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;

            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({ error: 'Failed to mark all as read' });
        }
    }

    /**
     * יוצר התראת בדיקה למשתמש המחובר
     */
    static async createTestNotification(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type: 'SYSTEM_ALERT',
                    title: '🚀 התראת בדיקה!',
                    message: 'אם אתה רואה את זה, מנגנון ההתראות שלך עובד מעולה.',
                    status: 'PENDING'
                }
            });

            res.json({ success: true, notification });
        } catch (error) {
            console.error('Error creating test notification:', error);
            res.status(500).json({ error: 'Failed to create test notification' });
        }
    }
}
