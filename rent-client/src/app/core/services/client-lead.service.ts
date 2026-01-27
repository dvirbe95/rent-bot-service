import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClientLead {
  id: string;
  apartmentId: string;
  tenantChatId: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  status: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  apartment?: any;
  messages?: LeadMessage[];
}

export interface LeadMessage {
  id: string;
  leadId: string;
  senderType: string;
  content: string;
  timestamp: Date;
}

export interface UpdateLeadStatusDto {
  status: string;
}

export interface SendMessageToLeadDto {
  content: string;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  apartmentId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientLeadService {
  private apiUrl = 'https://rent-bot-service-cncl.onrender.com/api/client-leads';

  constructor(private http: HttpClient) {}

  getAll(filters: LeadFilters = {}): Observable<any> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.apartmentId) params = params.set('apartmentId', filters.apartmentId);
    
    return this.http.get(`${this.apiUrl}`, { params });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getConversation(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/conversation`);
  }

  updateStatus(id: string, status: UpdateLeadStatusDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, status);
  }

  sendMessage(id: string, message: SendMessageToLeadDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/message`, message);
  }
}
