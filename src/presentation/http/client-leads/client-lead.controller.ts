// src/presentation/http/client-leads/client-lead.controller.ts
import { Request, Response } from 'express';
import { ClientLeadRepository } from '../../../modules/client-leads/client-lead.repository';
import { UpdateLeadStatusDto, SendMessageToLeadDto } from '../dto/client-lead.dto';
import { NotFoundError, ValidationError } from '../../../shared/errors/app.error';
import { LeadStatus, SenderType } from '@prisma/client';

export class ClientLeadController {
    private leadRepo = new ClientLeadRepository();

    // רשימת כל הלידים של המשתמש
    list = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const leads = await this.leadRepo.findByUserId(userId);
            res.json({ success: true, leads });
        } catch (error: any) {
            console.error('Error listing client leads:', error);
            res.status(500).json({ error: error.message || 'Failed to list client leads' });
        }
    };

    // קבלת ליד ספציפי
    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const lead = await this.leadRepo.findById(id);
            if (!lead) {
                throw new NotFoundError('Client Lead');
            }

            // בדיקת הרשאות - שהמשתמש הוא הבעלים של הנכס
            if (lead.apartment.userId !== userId) {
                const userRole = (req as any).user?.role;
                if (userRole !== 'AGENT') {
                    res.status(403).json({ error: 'Forbidden' });
                    return;
                }
            }

            res.json({ success: true, lead });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error getting client lead:', error);
                res.status(500).json({ error: error.message || 'Failed to get client lead' });
            }
        }
    };

    // קבלת היסטוריית שיחה של ליד
    getConversation = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const lead = await this.leadRepo.findById(id);
            if (!lead) {
                throw new NotFoundError('Client Lead');
            }

            // בדיקת הרשאות
            if (lead.apartment.userId !== userId) {
                const userRole = (req as any).user?.role;
                if (userRole !== 'AGENT') {
                    res.status(403).json({ error: 'Forbidden' });
                    return;
                }
            }

            res.json({ 
                success: true, 
                lead: {
                    id: lead.id,
                    apartmentId: lead.apartmentId,
                    tenantChatId: lead.tenantChatId,
                    tenantName: lead.tenantName,
                    status: lead.status,
                    lastMessageAt: lead.lastMessageAt,
                },
                messages: lead.messages 
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error getting conversation:', error);
                res.status(500).json({ error: error.message || 'Failed to get conversation' });
            }
        }
    };

    // עדכון סטטוס ליד
    updateStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;
            const data: UpdateLeadStatusDto = req.body;

            const lead = await this.leadRepo.findById(id);
            if (!lead) {
                throw new NotFoundError('Client Lead');
            }

            // בדיקת הרשאות
            if (lead.apartment.userId !== userId) {
                const userRole = (req as any).user?.role;
                if (userRole !== 'AGENT') {
                    res.status(403).json({ error: 'Forbidden' });
                    return;
                }
            }

            const updated = await this.leadRepo.updateStatus(id, data.status);
            res.json({ success: true, lead: updated });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error updating lead status:', error);
                res.status(500).json({ error: error.message || 'Failed to update lead status' });
            }
        }
    };

    // שליחת הודעה ללקוח דרך הבוט (מהמתווך/משכיר)
    sendMessage = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;
            const data: SendMessageToLeadDto = req.body;

            if (!data.content) {
                throw new ValidationError('content is required');
            }

            const lead = await this.leadRepo.findById(id);
            if (!lead) {
                throw new NotFoundError('Client Lead');
            }

            // בדיקת הרשאות
            if (lead.apartment.userId !== userId) {
                const userRole = (req as any).user?.role;
                if (userRole !== 'AGENT') {
                    res.status(403).json({ error: 'Forbidden' });
                    return;
                }
            }

            // קביעת סוג שולח לפי רול המשתמש
            const userRole = (req as any).user?.role;
            let senderType: SenderType;
            if (userRole === 'AGENT') {
                senderType = SenderType.AGENT;
            } else if (userRole === 'LANDLORD') {
                senderType = SenderType.LANDLORD;
            } else if (userRole === 'SELLER') {
                senderType = SenderType.SELLER;
            } else {
                senderType = SenderType.AGENT; // default
            }

            // הוספת ההודעה להיסטוריה
            const message = await this.leadRepo.addMessage(id, {
                senderType,
                content: data.content,
            });

            // כאן צריך להוסיף לוגיקה לשליחת ההודעה בפועל דרך הטלגרם בוט
            // (צריך גישה ל-TelegramService או BotController)

            res.json({ success: true, message });
        } catch (error: any) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                console.error('Error sending message:', error);
                res.status(500).json({ error: error.message || 'Failed to send message' });
            }
        }
    };
}
