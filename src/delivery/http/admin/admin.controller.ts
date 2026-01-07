// src/presentation/http/admin.controller.ts
import { Request, Response } from 'express';
import { AdminService } from './admin.service';

export class AdminController {
    private adminService = new AdminService();

    getAllUsers = async (req: Request, res: Response): Promise<void> => {
        try {
            const users = await this.adminService.listAllUsers();
            res.json(users);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    deleteUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            await this.adminService.removeUser(id);
            res.json({ success: true, message: "User deleted successfully" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}