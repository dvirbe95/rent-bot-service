import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Apartment {
  id: string;
  city: string;
  price: number;
  rooms: number;
  description?: string;
  address?: string;
  floor?: number;
  sqm?: number;
  arnona?: number;
  vaadBayit?: number;
  collateral?: string;
  priceFlexibility: boolean;
  entryDate?: Date;
  balcony: boolean;
  shelter: boolean;
  mamad: boolean;
  furnished: boolean;
  petsAllowed: boolean;
  parking: boolean;
  elevator: boolean;
  nearbyConstruction: boolean;
  neighbors?: string;
  commercialCenter?: string;
  schools?: string;
  entertainmentAreas?: string;
  contactPhone?: string;
  images?: string[];
  documents?: string[];
  video_url?: string;
  availability?: TimeSlot[];
  createdAt: Date;
  userId?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface CreateApartmentDto {
  city: string;
  price: number;
  rooms: number;
  description?: string;
  address?: string;
  floor?: number;
  sqm?: number;
  arnona?: number;
  vaadBayit?: number;
  collateral?: string;
  priceFlexibility?: boolean;
  entryDate?: string;
  balcony?: boolean;
  shelter?: boolean;
  mamad?: boolean;
  furnished?: boolean;
  petsAllowed?: boolean;
  parking?: boolean;
  elevator?: boolean;
  nearbyConstruction?: boolean;
  neighbors?: string;
  commercialCenter?: string;
  schools?: string;
  entertainmentAreas?: string;
  contactPhone?: string;
  images?: string[];
  documents?: string[];
  videoUrl?: string;
  availability?: TimeSlot[];
}

export interface UpdateApartmentDto extends Partial<CreateApartmentDto> {}

export interface ApartmentFilters {
  search?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApartmentService {
  private apiUrl = 'http://localhost:3000/api/apartments';

  constructor(private http: HttpClient) {}

  create(apartment: CreateApartmentDto): Observable<any> {
    return this.http.post(`${this.apiUrl}`, apartment);
  }

  getAll(filters: ApartmentFilters = {}): Observable<any> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.city) params = params.set('city', filters.city);
    if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
    
    return this.http.get(`${this.apiUrl}`, { params });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getPublicById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/public/${id}`);
  }

  update(id: string, apartment: UpdateApartmentDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, apartment);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
