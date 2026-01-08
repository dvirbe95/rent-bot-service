import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Post {
  id: string;
  apartmentId: string;
  userId: string;
  content: string;
  platform: 'TELEGRAM' | 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM';
  publishedAt?: Date;
  createdAt: Date;
  apartment?: any;
}

export interface GeneratePostDto {
  apartmentId: string;
  platform: 'TELEGRAM' | 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM';
  tone?: 'professional' | 'casual' | 'friendly';
  includeEmojis?: boolean;
}

export interface PublishPostDto {
  platform?: 'TELEGRAM' | 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM';
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiUrl = 'http://localhost:3000/api/posts';

  constructor(private http: HttpClient) {}

  generatePost(data: GeneratePostDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate`, data);
  }

  getAll(): Observable<any> {
    return this.http.get(`${this.apiUrl}`);
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  publish(id: string, data?: PublishPostDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/publish`, data || {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
