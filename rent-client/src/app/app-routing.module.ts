import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';

const routes: Routes = [
  { 
    path: '', 
    redirectTo: '/dashboard', 
    pathMatch: 'full' 
  },
  { 
    path: 'login', 
    component: LoginComponent
  },
  { 
    path: 'register', 
    component: RegisterComponent
  },
  {
    path: 'p',
    loadChildren: () => import('./modules/public/public.module').then(m => m.PublicModule)
  },
  { 
    path: 'dashboard', 
    canActivate: [AuthGuard],
    loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  { 
    path: 'apartments', 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['AGENT', 'LANDLORD', 'SELLER'] },
    loadChildren: () => import('./modules/apartments/apartments.module').then(m => m.ApartmentsModule)
  },
  { 
    path: 'client-leads', 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['AGENT', 'LANDLORD', 'SELLER'] },
    loadChildren: () => import('./modules/client-leads/client-leads.module').then(m => m.ClientLeadsModule)
  },
  { 
    path: 'posts', 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['AGENT', 'LANDLORD', 'SELLER'] },
    loadChildren: () => import('./modules/posts/posts.module').then(m => m.PostsModule)
  },
  { 
    path: 'meetings', 
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['AGENT', 'LANDLORD', 'SELLER'] },
    loadChildren: () => import('./modules/meetings/meetings.module').then(m => m.MeetingsModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }