import { UserRepository } from "../../../modules/users/user.repository";

export class AdminService {
    private userRepo = new UserRepository();

    async listAllUsers() {
        // כאן אפשר להוסיף פילטורים בעתיד
        return await this.userRepo.getAllUsers();
    }

    async removeUser(userId: string) {
        // בדיקה לדוגמה: שלא ימחקו את עצמם
        return await this.userRepo.deleteUser(userId);
    }

    async updateUserDetails(userId: string, updateData: any) {
        return await this.userRepo.updateUser(userId, updateData);
    }
}