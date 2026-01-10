import { Request, Response } from 'express';
import { UserRepository } from '../../../modules/users/user.repository';
import { ForbiddenError } from '../../../shared/errors/app.error';

export class AdminController {
    private userRepo = new UserRepository();

    private checkAdmin = (req: Request) => {
        const user = (req as any).user;
        if (!user || !user.email || user.email.trim().toUpperCase() !== 'ADMIN@GMAIL.COM') {
            console.log('Admin Access Denied for:', user?.email);
            throw new ForbiddenError('Only the super admin can access this resource');
        }
    };

    listUsers = async (req: Request, res: Response): Promise<void> => {
        try {
            this.checkAdmin(req);
            const users = await this.userRepo.getAllUsers();
            res.json({ success: true, users });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    };

    createUser = async (req: Request, res: Response): Promise<void> => {
        try {
            this.checkAdmin(req);
            const { email, password, name, role, phone } = req.body;
            
            // הצפנת סיסמה (ברירת מחדל אם לא סופקה)
            const bcrypt = await import('bcrypt');
            const hashedPassword = await bcrypt.hash(password || '123456', 10);

            const newUser = await this.userRepo.createUser({
                email,
                name,
                role,
                phone,
                password: hashedPassword
            });

            res.json({ success: true, user: newUser });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    updateUser = async (req: Request, res: Response): Promise<void> => {
        try {
            this.checkAdmin(req);
            const { id } = req.params;
            const updatedUser = await this.userRepo.updateUser(id, req.body);
            res.json({ success: true, user: updatedUser });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    };

    deleteUser = async (req: Request, res: Response): Promise<void> => {
        try {
            this.checkAdmin(req);
            const { id } = req.params;
            await this.userRepo.deleteUser(id);
            res.json({ success: true });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    };
}
