import { Routes } from '@angular/router';
import { authGuard, guestGuard, managerGuard } from './core/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TaskListComponent } from './pages/tasks/task-list.component';
import { TaskFormComponent } from './pages/tasks/task-form.component';
import { TaskDetailComponent } from './pages/tasks/task-detail.component';
import { TeamComponent } from './pages/team/team.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },

  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'tasks', component: TaskListComponent, canActivate: [authGuard] },
  { path: 'tasks/new', component: TaskFormComponent, canActivate: [authGuard] },
  { path: 'tasks/:id', component: TaskDetailComponent, canActivate: [authGuard] },
  { path: 'tasks/:id/edit', component: TaskFormComponent, canActivate: [authGuard] },
  { path: 'team', component: TeamComponent, canActivate: [authGuard, managerGuard] },

  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
