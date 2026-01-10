// src/app/core/interceptors/auth.interceptor.ts
import { Observable } from 'rxjs';
import { Injectable, Injector } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService?: AuthService;

  constructor(private injector: Injector) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // השג את השירות בצורה עצלנית כדי למנוע תלות מעגלית
    if (!this.authService) {
      this.authService = this.injector.get(AuthService);
    }

    const token = this.authService.token;

    if (token) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(request);
  }
}
