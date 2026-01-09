// src/middlewares/web-auth.middleware.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const webAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: "Unauthorized" });
        return; // מחזירים void
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        (req as any).user = decoded;
        next(); // ממשיך הלאה ללא החזרת ערך
    } catch (e) {
        res.status(403).json({ error: "Invalid Token" });
        return;
    }
};