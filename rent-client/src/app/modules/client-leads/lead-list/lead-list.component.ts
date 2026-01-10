import { Component, OnInit } from '@angular/core';
import { ClientLeadService, LeadFilters } from '../../../core/services/client-lead.service';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApartmentService } from '../../../core/services/apartment.service';

@Component({
  selector: 'app-lead-list',
  templateUrl: './lead-list.component.html',
  styleUrls: ['./lead-list.component.scss']
})
export class LeadListComponent implements OnInit {
  leads: any[] = [];
  apartments: any[] = [];
  displayedColumns: string[] = ['tenantName', 'contact', 'apartment', 'status', 'lastMessageAt', 'actions'];
  loading = true;

  // Filters
  searchControl = new FormControl('');
  statusControl = new FormControl('');
  apartmentControl = new FormControl('');
  filters: LeadFilters = {};

  constructor(
    private leadService: ClientLeadService,
    private apartmentService: ApartmentService
  ) {}

  ngOnInit() {
    this.loadLeads();
    this.loadApartments();

    // Listen to changes
    this.searchControl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe(v => this.applyFilter({ search: v || '' }));
    this.statusControl.valueChanges.subscribe(v => this.applyFilter({ status: v || undefined }));
    this.apartmentControl.valueChanges.subscribe(v => this.applyFilter({ apartmentId: v || undefined }));
  }

  loadLeads() {
    this.loading = true;
    this.leadService.getAll(this.filters).subscribe({
      next: (res) => {
        this.leads = res.leads;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadApartments() {
    this.apartmentService.getAll().subscribe(res => {
      this.apartments = res.apartments;
    });
  }

  applyFilter(newFilter: LeadFilters) {
    this.filters = { ...this.filters, ...newFilter };
    this.loadLeads();
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
    if (!address) return;
    const url = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }
}
