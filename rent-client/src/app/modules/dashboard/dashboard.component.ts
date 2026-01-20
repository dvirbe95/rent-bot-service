import { Component, OnInit } from '@angular/core';
import { ApartmentService } from '../../core/services/apartment.service';
import { ClientLeadService } from '../../core/services/client-lead.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  apartmentsCount: number = 0;
  leadsCount: number = 0;
  newLeadsCount: number = 0;
  loading: boolean = true;
  userRole: string = '';

  constructor(
    private apartmentService: ApartmentService,
    private clientLeadService: ClientLeadService,
    public authService: AuthService,
    private router: Router
  ) {
    this.userRole = this.authService.currentUserValue?.role;
  }

  ngOnInit() {
    if (this.userRole === 'ADMIN') {
      this.router.navigate(['/admin']);
      return;
    }

    if (this.userRole === 'TENANT') {
      this.loading = false;
      return;
    }

    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    
    // טעינת מספר נכסים
    this.apartmentService.getAll().subscribe({
      next: (res) => {
        this.apartmentsCount = res.apartments?.length || 0;
        this.checkLoading();
      },
      error: (err) => {
        console.error('Error loading apartments:', err);
        this.checkLoading();
      }
    });

    // טעינת מספר לידים
    this.clientLeadService.getAll().subscribe({
      next: (res) => {
        const leads = res.leads || [];
        this.leadsCount = leads.length;
        this.newLeadsCount = leads.filter((lead: any) => lead.status === 'NEW').length;
        this.checkLoading();
      },
      error: (err) => {
        console.error('Error loading leads:', err);
        this.checkLoading();
      }
    });
  }

  checkLoading() {
    this.loading = false;
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
