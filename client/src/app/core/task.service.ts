import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EmployeeStats, Pagination, Stats, Task, TaskFilters, UserSummary } from './models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ---- tasks ----
  list(filters: Partial<TaskFilters>): Observable<{ tasks: Task[]; pagination: Pagination }> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== '' && value !== null && value !== undefined) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<{ tasks: Task[]; pagination: Pagination }>(`${this.api}/tasks`, { params });
  }

  get(id: string): Observable<{ task: Task }> {
    return this.http.get<{ task: Task }>(`${this.api}/tasks/${id}`);
  }

  create(data: Partial<Task> | Record<string, unknown>): Observable<{ task: Task }> {
    return this.http.post<{ task: Task }>(`${this.api}/tasks`, data);
  }

  update(id: string, data: Record<string, unknown>): Observable<{ task: Task }> {
    return this.http.patch<{ task: Task }>(`${this.api}/tasks/${id}`, data);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/tasks/${id}`);
  }

  meta(): Observable<{ statuses: string[]; priorities: string[] }> {
    return this.http.get<{ statuses: string[]; priorities: string[] }>(`${this.api}/tasks/meta`);
  }

  // ---- dashboard ----
  stats(): Observable<{ stats: Stats }> {
    return this.http.get<{ stats: Stats }>(`${this.api}/dashboard/stats`);
  }

  recent(): Observable<{ tasks: Task[] }> {
    return this.http.get<{ tasks: Task[] }>(`${this.api}/dashboard/recent`);
  }

  // ---- users (manager only) ----
  employees(): Observable<{ employees: UserSummary[] }> {
    return this.http.get<{ employees: UserSummary[] }>(`${this.api}/users/employees`);
  }

  employeeStats(): Observable<{ employees: EmployeeStats[] }> {
    return this.http.get<{ employees: EmployeeStats[] }>(`${this.api}/users/employees/stats`);
  }
}
