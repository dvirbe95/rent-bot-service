// src/core/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../../modules/users/user.repository';

export class AuthService {
    private userRepo = new UserRepository();
    private readonly JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';

    async register(userData: any) {
        // הצפנת סיסמה לפני שמירה
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // יצירת המשתמש ב-DB
        return await this.userRepo.createUser({
            ...userData,
            password: hashedPassword
        });
    }

    async login(email: string, pass: string) {
        const user = await this.userRepo.findByEmail(email);
        if (!user || !user.password) throw new Error("משתמש לא נמצא או חסר סיסמה");

        const isValid = await bcrypt.compare(pass, user.password);
        if (!isValid) throw new Error("פרטי התחברות שגויים");

        // עדכון זמן כניסה אחרון (חשוב לבוט!)
        await this.userRepo.updateLastLogin(user.id);

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            this.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return { token, user: { id: user.id, name: user.name, role: user.role } };
    }
}