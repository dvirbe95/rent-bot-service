// src/delivery/http/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../../core/auth/auth.service';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
    try {
        const user = await authService.register(req.body);
        res.json({ success: true, user });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const token = await authService.login(email, password);
        res.json({ success: true, token });
    } catch (e: any) {
        res.status(401).json({ error: e.message });
    }
};