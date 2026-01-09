import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Meeting {
  id: string;
  leadId: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  lead?: any;
}

@Injectable({
  providedIn: 'root'
})
export class MeetingService {
  private apiUrl = 'http://localhost:3000/api/meetings';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Meeting[]> {
    return this.http.get<Meeting[]>(this.apiUrl);
  }

  updateStatus(id: string, status: string): Observable<Meeting> {
    return this.http.patch<Meeting>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
