import { Component, OnInit } from '@angular/core';
import { ApartmentService } from '../../../core/services/apartment.service';

@Component({
  selector: 'app-apartment-list',
  templateUrl: './apartment-list.component.html',
  styleUrls: ['./apartment-list.component.scss']
})
export class ApartmentListComponent implements OnInit {
  apartments: any[] = [];
  displayedColumns: string[] = ['city', 'price', 'rooms', 'actions'];
  loading = true;

  constructor(private apartmentService: ApartmentService) {}

  ngOnInit() {
    this.loadApartments();
  }

  loadApartments() {
    this.apartmentService.getAll().subscribe({
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
}
