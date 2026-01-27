// src/app/core/services/auth.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object // הזרקת ה-ID של הפלטפורמה
  ) {
    // בדוק אם אנחנו בדפדפן לפני גישה ל-localStorage
    if (isPlatformBrowser(this.platformId)) {
      const user = localStorage.getItem('user');
      if (user) {
        this.currentUserSubject.next(JSON.parse(user));
      }
    }
  }

  // עדכן גם את שאר הפונקציות שמשתמשות ב-localStorage
  login(credentials: any) {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        if (isPlatformBrowser(this.platformId) && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  register(userData: any) {
    return this.http.post<any>(`${environment.apiUrl}/auth/register`, userData).pipe(
      tap(res => {
        if (isPlatformBrowser(this.platformId) && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  get token() {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  get currentUser() {
    return this.currentUserSubject.asObservable();
  }

  get currentUserValue() {
    return this.currentUserSubject.value;
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.currentUserSubject.next(null);
    }
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }
}