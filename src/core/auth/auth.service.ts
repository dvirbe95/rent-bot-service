// src/core/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../modules/users/user.repository';

export class AuthService {
    private userRepo = new UserRepository();
    private readonly JWT_SECRET = process.env.JWT_SECRET || 'super-secret';

    // הרשמה דרך האפליקציה (מתווך/משכיר)
    async register(data: any) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.userRepo.createUser({
            ...data,
            password: hashedPassword
        });
    }

    // לוגין רגיל לאפליקציה
    async login(email: string, pass: string) {
        const user = await this.userRepo.findByEmail(email);
        if (!user || !user.password){
            throw new Error("User not found");
        } 
        
        const isValid = await bcrypt.compare(pass, user.password);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }
        
        return this.generateToken(user);
    }

    // יצירת Token לגישה מהירה מתוך הטלגרם (Magic Link)
    async generateFastLoginToken(chatId: string) {
        const user = await this.userRepo.getOrCreateUser(chatId);
        return this.generateToken(user);
    }

    private generateToken(user: any) {
        return jwt.sign(
            { id: user.id, role: user.role, phone: user.phone },
            this.JWT_SECRET,
            { expiresIn: '30d' }
        );
    }
}