import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { switchMap, tap, filter } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Notification {
  id: string;
  type: 'NEW_LEAD' | 'NEW_MEETING' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  payload?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // מריצים את הלוגיקה רק בדפדפן כדי לא לתקוע את ה-SSR
    if (isPlatformBrowser(this.platformId)) {
      this.initNotificationLogic();
    }
  }

  private initNotificationLogic() {
    // משיכת התראות ראשונית אם המשתמש מחובר
    if (this.authService.isAuthenticated()) {
      this.refreshNotifications();
    }
    
    // בדיקה תקופתית כל 60 שניות (רק אם מחובר)
    interval(60000).pipe(
      filter(() => this.authService.isAuthenticated())
    ).subscribe(() => {
      this.refreshNotifications();
    });

    // האזנה לשינויי משתמש - אם הוא מתחבר, רענן התראות
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.refreshNotifications();
      } else {
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
      }
    });
  }

  refreshNotifications() {
    this.http.get<{ notifications: Notification[], unreadCount: number }>(`${this.apiUrl}/my`)
      .subscribe(data => {
        this.notificationsSubject.next(data.notifications);
        this.unreadCountSubject.next(data.unreadCount);
      });
  }

  markAsRead(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.notificationsSubject.value;
        const updated = current.map(n => n.id === id ? { ...n, isRead: true } : n);
        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        const current = this.notificationsSubject.value;
        const updated = current.map(n => ({ ...n, isRead: true }));
        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(0);
      })
    );
  }
}
