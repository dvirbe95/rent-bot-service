// src/presentation/http/posts/post.controller.ts
import { Request, Response } from 'express';
import { PostRepository } from '../../../modules/posts/post.repository';
import { RagService } from '../../../modules/rag/rag.service';
import { ApartmentRepository } from '../../../modules/apartments/apartment.repository';
import { GeneratePostDto, PublishPostDto } from '../dto/post.dto';
import { NotFoundError, ValidationError } from '../../../shared/errors/app.error';
import { PostPlatform } from '@prisma/client';

export class PostController {
    private postRepo = new PostRepository();
    private apartmentRepo = new ApartmentRepository();
    private ragService = new RagService();

    // יצירת פוסט חדש באמצעות AI
    generatePost = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const data: GeneratePostDto = req.body;
            
            // Validation
            if (!data.apartmentId) {
                throw new ValidationError('apartmentId is required');
            }

            // שליפת הנכס
            const apartment = await this.apartmentRepo.getById(data.apartmentId);
            if (!apartment) {
                throw new NotFoundError('Apartment');
            }

            // בדיקת הרשאות
            if (apartment.userId && apartment.userId !== userId) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            // יצירת הפוסט באמצעות AI
            const postContent = await this.ragService.generatePost(apartment, {
                platform: data.platform || PostPlatform.TELEGRAM,
                tone: data.tone || 'professional',
                includeEmojis: data.includeEmojis !== false,
            });

            // שמירת הפוסט ב-DB
            const post = await this.postRepo.create({
                apartmentId: data.apartmentId,
                userId,
                content: postContent,
                platform: data.platform || PostPlatform.TELEGRAM,
            });

            res.status(201).json({ success: true, post });
        } catch (error: any) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                console.error('Error generating post:', error);
                res.status(500).json({ error: error.message || 'Failed to generate post' });
            }
        }
    };

    // רשימת פוסטים של המשתמש
    list = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const posts = await this.postRepo.findByUserId(userId);
            res.json({ success: true, posts });
        } catch (error: any) {
            console.error('Error listing posts:', error);
            res.status(500).json({ error: error.message || 'Failed to list posts' });
        }
    };

    // קבלת פוסט ספציפי
    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const post = await this.postRepo.findById(id);
            if (!post) {
                throw new NotFoundError('Post');
            }

            // בדיקת הרשאות
            if (post.userId !== userId) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            res.json({ success: true, post });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error getting post:', error);
                res.status(500).json({ error: error.message || 'Failed to get post' });
            }
        }
    };

    // פרסום פוסט (עדכון publishedAt)
    publish = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;
            const data: PublishPostDto = req.body;

            const post = await this.postRepo.findById(id);
            if (!post) {
                throw new NotFoundError('Post');
            }

            // בדיקת הרשאות
            if (post.userId !== userId) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            // עדכון publishedAt
            const updated = await this.postRepo.updatePublishedAt(id, new Date());

            // כאן אפשר להוסיף לוגיקה לפרסום בפלטפורמה בפועל
            // (שליחה לטלגרם/פייסבוק/וכו')

            res.json({ success: true, post: updated, message: 'Post published successfully' });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error publishing post:', error);
                res.status(500).json({ error: error.message || 'Failed to publish post' });
            }
        }
    };

    // מחיקת פוסט
    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const post = await this.postRepo.findById(id);
            if (!post) {
                throw new NotFoundError('Post');
            }

            // בדיקת הרשאות
            if (post.userId !== userId) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            await this.postRepo.delete(id);
            res.json({ success: true, message: 'Post deleted successfully' });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error deleting post:', error);
                res.status(500).json({ error: error.message || 'Failed to delete post' });
            }
        }
    };
}
