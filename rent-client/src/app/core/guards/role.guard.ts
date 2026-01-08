import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const allowedRoles = route.data['roles'] as string[];
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const userRole = this.authService.currentUserValue?.role;
    if (allowedRoles.includes(userRole)) {
      return true;
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
}
