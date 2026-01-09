import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClientLead {
  id: string;
  apartmentId: string;
  tenantChatId: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  status: 'NEW' | 'CONTACTED' | 'VIEWING_SCHEDULED' | 'VIEWING_COMPLETED' | 'CLOSED' | 'REJECTED';
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  apartment?: any;
  messages?: LeadMessage[];
}

export interface LeadMessage {
  id: string;
  leadId: string;
  senderType: 'BOT' | 'TENANT' | 'AGENT' | 'LANDLORD' | 'SELLER';
  content: string;
  timestamp: Date;
}

export interface UpdateLeadStatusDto {
  status: 'NEW' | 'CONTACTED' | 'VIEWING_SCHEDULED' | 'VIEWING_COMPLETED' | 'CLOSED' | 'REJECTED';
}

export interface SendMessageToLeadDto {
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientLeadService {
  private apiUrl = 'http://localhost:3000/api/client-leads';

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(`${this.apiUrl}`);
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
