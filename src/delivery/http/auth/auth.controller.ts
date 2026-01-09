// src/presentation/http/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
    private authService = new AuthService();

    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = await this.authService.register(req.body);
            res.status(201).json({ success: true, user });
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);
            res.json({ success: true, ...result });
        } catch (e: any) {
            res.status(401).json({ error: e.message });
        }
    };
}