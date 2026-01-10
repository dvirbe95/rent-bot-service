import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApartmentService } from '../../../core/services/apartment.service';

@Component({
  selector: 'app-property-profile',
  templateUrl: './property-profile.component.html',
  styleUrls: ['./property-profile.component.scss']
})
export class PropertyProfileComponent implements OnInit {
  apartment: any;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private apartmentService: ApartmentService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.apartmentService.getPublicById(id).subscribe({
      next: (res: any) => {
        this.apartment = res.apartment;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  openWaze() {
    if (this.apartment?.address) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(this.apartment.address)}`, '_blank');
    }
  }
}
