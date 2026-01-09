import { Component, OnInit } from '@angular/core';
import { ClientLeadService } from '../../../core/services/client-lead.service';

@Component({
  selector: 'app-lead-list',
  templateUrl: './lead-list.component.html',
  styleUrls: ['./lead-list.component.scss']
})
export class LeadListComponent implements OnInit {
  leads: any[] = [];
  displayedColumns: string[] = ['tenantName', 'apartment', 'status', 'lastMessageAt', 'actions'];
  loading = true;

  constructor(private leadService: ClientLeadService) {}

  ngOnInit() {
    this.loadLeads();
  }

  loadLeads() {
    this.leadService.getAll().subscribe({
      next: (res) => {
        this.leads = res.leads;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'NEW': 'חדש',
      'INTERESTED': 'מתעניין',
      'VIEWING_SCHEDULED': 'נקבעה פגישה',
      'DEAL_CLOSED': 'סגור (עסקה)',
      'LOST': 'לא רלוונטי'
    };
    return labels[status] || status;
  }

  openWaze(address: string) {
    const url = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }
}
