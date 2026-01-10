import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  loading = false;
  displayedColumns: string[] = ['name', 'email', 'role', 'subscription', 'actions'];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.adminService.getAllUsers().subscribe({
      next: (res) => {
        this.users = res.users;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('שגיאה בטעינת משתמשים', 'סגור', { duration: 3000 });
      }
    });
  }

  addUser() {
    const name = prompt('שם מלא:');
    const email = prompt('אימייל:');
    const phone = prompt('טלפון:');
    const role = prompt('תפקיד (AGENT/LANDLORD/SELLER):', 'AGENT');

    if (name && email && role) {
      this.adminService.createUser({ name, email, phone, role }).subscribe({
        next: () => {
          this.loadUsers();
          this.snackBar.open('משתמש נוסף בהצלחה', 'סגור', { duration: 2000 });
        },
        error: (err) => this.snackBar.open('שגיאה בהוספת משתמש: ' + (err.error?.error || 'שגיאה לא ידועה'), 'סגור', { duration: 3000 })
      });
    }
  }

  toggleSubscription(user: any) {
    const newStatus = !user.subscriptionStatus;
    this.adminService.updateUser(user.id, { subscriptionStatus: newStatus }).subscribe({
      next: () => {
        user.subscriptionStatus = newStatus;
        this.snackBar.open('סטטוס מנוי עודכן', 'סגור', { duration: 2000 });
      },
      error: () => this.snackBar.open('שגיאה בעדכון מנוי', 'סגור', { duration: 3000 })
    });
  }

  deleteUser(id: string) {
    if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      this.adminService.deleteUser(id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== id);
          this.snackBar.open('משתמש נמחק', 'סגור', { duration: 2000 });
        },
        error: () => this.snackBar.open('שגיאה במחיקת משתמש', 'סגור', { duration: 3000 })
      });
    }
  }
}
