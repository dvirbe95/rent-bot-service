import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Apartment {
  id: string;
  city: string;
  price: number;
  rooms: number;
  description?: string;
  address?: string;
  images?: string[];
  videoUrl?: string;
  calendarLink?: string;
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
  images?: string[];
  videoUrl?: string;
  calendarLink?: string;
  availability?: TimeSlot[];
}

export interface UpdateApartmentDto {
  price?: number;
  description?: string;
  address?: string;
  availability?: TimeSlot[];
  images?: string[];
  videoUrl?: string;
  calendarLink?: string;
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

  getAll(): Observable<any> {
    return this.http.get(`${this.apiUrl}`);
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  update(id: string, apartment: UpdateApartmentDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, apartment);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
