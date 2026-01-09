// src/core/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../modules/users/user.repository';

export class AuthService {
    private userRepo = new UserRepository();
    private readonly JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET || 'super-secret';

    // הרשמה דרך האפליקציה (מתווך/משכיר)
    async register(userData: any) {
        // בדיקה אם המשתמש כבר קיים
        const existingUser = await this.userRepo.findByEmail(userData.email);
        if (existingUser) {
            throw new Error("משתמש עם אימייל זה כבר קיים במערכת");
        }

        // הצפנת סיסמה לפני שמירה
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // יצירת המשתמש ב-DB
        const user = await this.userRepo.createUser({
            ...userData,
            password: hashedPassword
        });

        // יצירת טוקן מיד לאחר ההרשמה
        const token = this.generateToken(user);

        return { 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                role: user.role,
                email: user.email
            } 
        };
    }

    // לוגין רגיל לאפליקציה (עם עדכון lastLogin)
    async login(email: string, pass: string) {
        const user = await this.userRepo.findByEmail(email);
        if (!user || !user.password) {
            throw new Error("משתמש לא נמצא או חסר סיסמה");
        }

        const isValid = await bcrypt.compare(pass, user.password);
        if (!isValid) {
            throw new Error("פרטי התחברות שגויים");
        }

        // עדכון זמן כניסה אחרון (חשוב לבוט!)
        await this.userRepo.updateLastLogin(user.id);

        const token = this.generateToken(user);
        
        return { 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                role: user.role,
                email: user.email
            } 
        };
    }

    // יצירת Token לגישה מהירה מתוך הטלגרם (Magic Link)
    async generateFastLoginToken(chatId: string) {
        const user = await this.userRepo.getOrCreateUser(chatId);
        return this.generateToken(user);
    }

    private generateToken(user: any) {
        return jwt.sign(
            { 
                id: user.id, 
                role: user.role, 
                phone: user.phone,
                email: user.email 
            },
            this.JWT_SECRET,
            { expiresIn: '30d' }
        );
    }
}