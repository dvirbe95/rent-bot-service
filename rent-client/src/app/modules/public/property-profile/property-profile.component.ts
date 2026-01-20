import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApartmentService } from '../../../core/services/apartment.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-property-profile',
  templateUrl: './property-profile.component.html',
  styleUrls: ['./property-profile.component.scss']
})
export class PropertyProfileComponent implements OnInit {
  apartment: any;
  loading = true;
  error = false;
  private map: any;

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
        
        // Initialize map after data is loaded and DOM is ready
        if (this.apartment?.lat && this.apartment?.lng) {
          setTimeout(() => this.initMap(), 100);
        }
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  private initMap() {
    if (this.map) return;

    const lat = this.apartment.lat;
    const lng = this.apartment.lng;

    this.map = L.map('map', {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    L.marker([lat, lng], { icon }).addTo(this.map)
      .bindPopup(this.apartment.address || this.apartment.city)
      .openPopup();
  }

  openWaze() {
    if (this.apartment?.address) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(this.apartment.address + ', ' + this.apartment.city)}`, '_blank');
    } else {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(this.apartment.city)}`, '_blank');
    }
  }
}
