import { Component, OnInit } from '@angular/core';
import { ApartmentService, ApartmentFilters } from '../../../core/services/apartment.service';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-apartment-list',
  templateUrl: './apartment-list.component.html',
  styleUrls: ['./apartment-list.component.scss']
})
export class ApartmentListComponent implements OnInit {
  apartments: any[] = [];
  displayedColumns: string[] = ['city', 'address', 'price', 'rooms', 'actions'];
  loading = true;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  // Filters
  searchControl = new FormControl('');
  filters: ApartmentFilters = {};

  constructor(
    private apartmentService: ApartmentService,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit() {
    this.loadApartments();

    // Listen to search changes
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(value => {
      this.filters.search = value || '';
      this.loadApartments();
    });
  }

  loadApartments() {
    this.loading = true;
    this.apartmentService.getAll(this.filters).subscribe({
      next: (res) => {
        this.apartments = res.apartments;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  deleteApartment(id: string) {
    if (confirm('האם אתה בטוח שברצונך למחוק נכס זה?')) {
      this.apartmentService.delete(id).subscribe(() => this.loadApartments());
    }
  }

  viewPublicProfile(apartmentId: string) {
    const publicUrl = `${environment.frontendUrl}/p/${apartmentId}`;
    window.open(publicUrl, '_blank');
  }

  applyFilters(newFilters: ApartmentFilters) {
    this.filters = { ...this.filters, ...newFilters };
    this.loadApartments();
  }
}
