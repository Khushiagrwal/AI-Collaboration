import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent:()=>
      import("./pages/login/login").then(m=>m.Login)
  },
  {
    path: 'register',
    loadComponent:()=>import("./pages/register/register").then(m=>m.Register)
  },
  {
    path: 'dashboard',
    loadComponent:()=>import("./pages/dashboard/dashboard").then(m=>m.Dashboard),
    canActivate:[authGuard]
  },
  {
    path: 'board',
    loadComponent:()=>import("./pages/board/board").then(m=>m.Board),
    canActivate:[authGuard]
  },
  
];