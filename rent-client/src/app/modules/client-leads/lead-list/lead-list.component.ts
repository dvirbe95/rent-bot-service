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
      'CONTACTED': 'נוצר קשר',
      'VIEWING_SCHEDULED': 'נקבע סיור',
      'VIEWING_COMPLETED': 'בוצע סיור',
      'CLOSED': 'סגור',
      'REJECTED': 'לא רלוונטי'
    };
    return labels[status] || status;
  }
}
