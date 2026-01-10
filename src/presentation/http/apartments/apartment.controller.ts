// src/presentation/http/apartments/apartment.controller.ts
import { Request, Response } from 'express';
import { ApartmentRepository } from '../../../modules/apartments/apartment.repository';
import { RagService } from '../../../modules/rag/rag.service';
import { CreateApartmentDto, UpdateApartmentDto, ApartmentResponseDto } from '../dto/apartment.dto';
import { NotFoundError, ValidationError } from '../../../shared/errors/app.error';

export class ApartmentController {
    private apartmentRepo = new ApartmentRepository();
    private ragService = new RagService();

    // יצירת נכס חדש
    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: No user ID found in token' });
                return;
            }

            // Verify user exists to prevent foreign key violation
            const userRepo = new (await import('../../../modules/users/user.repository')).UserRepository();
            const user = await userRepo.findById(userId);
            if (!user) {
                res.status(401).json({ error: 'Unauthorized: User no longer exists in database' });
                return;
            }

            const data: CreateApartmentDto = req.body;
            
            // Validation
            if (!data.city || !data.price || !data.rooms) {
                throw new ValidationError('Missing required fields: city, price, rooms');
            }

            // יצירת embedding מהתיאור
            const descriptionText = `${data.city} ${data.rooms} חדרים ${data.description || ''}`;
            const embedding = await this.ragService.generateEmbedding(descriptionText);

            // יצירת הנכס
            const apartment = await this.apartmentRepo.createApartment({
                ...data,
                userId,
                video_url: data.videoUrl,
            }, embedding);

            res.status(201).json({ success: true, apartment });
        } catch (error: any) {
            if (error instanceof ValidationError) {
                res.status(400).json({ error: error.message });
            } else {
                console.error('Error creating apartment:', error);
                res.status(500).json({ error: error.message || 'Failed to create apartment' });
            }
        }
    };

    // קבלת רשימת נכסים של המשתמש
    list = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const filters = {
                search: req.query.search as string,
                city: req.query.city as string,
                minPrice: req.query.minPrice as string,
                maxPrice: req.query.maxPrice as string
            };

            const apartments = await this.apartmentRepo.findByUserId(userId, filters);
            
            res.json({ success: true, apartments });
        } catch (error: any) {
            console.error('Error listing apartments:', error);
            res.status(500).json({ error: error.message || 'Failed to list apartments' });
        }
    };

    // קבלת נכס ספציפי (ציבורי - ללא צורך בטוקן)
    getPublicById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const apartment = await this.apartmentRepo.getById(id);
            
            if (!apartment) {
                throw new NotFoundError('Apartment');
            }

            // החזרת פרטים חלקיים/ציבוריים במידת הצורך
            res.json({ success: true, apartment });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    };

    // קבלת נכס ספציפי (פרטי - עם בדיקת בעלות)
    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const apartment = await this.apartmentRepo.getById(id);
            
            if (!apartment) {
                throw new NotFoundError('Apartment');
            }

            // בדיקה שהמשתמש הוא הבעלים (או אם הוא admin/agent)
            if (apartment.userId && apartment.userId !== userId) {
                const userRole = (req as any).user?.role;
                if (userRole !== 'AGENT') {
                    res.status(403).json({ error: 'Forbidden' });
                    return;
                }
            }

            res.json({ success: true, apartment });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error getting apartment:', error);
                res.status(500).json({ error: error.message || 'Failed to get apartment' });
            }
        }
    };

    // עדכון נכס
    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;
            const data: UpdateApartmentDto = req.body;

            const apartment = await this.apartmentRepo.getById(id);
            
            if (!apartment) {
                throw new NotFoundError('Apartment');
            }

            // בדיקת הרשאות
            if (apartment.userId && apartment.userId !== userId) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            // עדכון embedding אם התיאור השתנה
            if (data.description) {
                const descriptionText = `${apartment.city} ${apartment.rooms} חדרים ${data.description}`;
                const embedding = await this.ragService.generateEmbedding(descriptionText);
                
                // עדכון עם embedding - Prisma לא תומך ב-vector ישירות, נשתמש ב-queryRaw אם צריך
                await this.apartmentRepo.updateApartment(id, {
                    ...data,
                    // embedding צריך לעדכן דרך queryRaw אם צריך
                });
            } else {
                await this.apartmentRepo.updateApartment(id, data);
            }

            const updated = await this.apartmentRepo.getById(id);
            res.json({ success: true, apartment: updated });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error updating apartment:', error);
                res.status(500).json({ error: error.message || 'Failed to update apartment' });
            }
        }
    };

    // מחיקת נכס
    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const apartment = await this.apartmentRepo.getById(id);
            
            if (!apartment) {
                throw new NotFoundError('Apartment');
            }

            // בדיקת הרשאות
            if (apartment.userId && apartment.userId !== userId) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            // מחיקה
            await this.apartmentRepo.delete(id);
            
            res.json({ success: true, message: 'Apartment deleted successfully' });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error deleting apartment:', error);
                res.status(500).json({ error: error.message || 'Failed to delete apartment' });
            }
        }
    };
}
