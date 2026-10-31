import { HttpErrorResponse } from '@angular/common/http';

export type Role = 'manager' | 'employee';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  employeeCode: string;
}

export interface UserSummary {
  _id: string;
  name: string;
  email: string;
  employeeCode: string;
}

export interface EmployeeStats extends UserSummary {
  totalTasks: number;
  completedTasks: number;
}

export interface Task {
  _id: string;
  taskNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: UserSummary;
  createdBy: UserSummary;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  assignedTo: string;
  page: number;
  limit: number;
}

export interface Stats {
  total: number;
  active: number;
  overdue: number;
  critical: number;
  completed: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** Pulls the "message" out of an API error, with a fallback. */
export function apiError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Is the API running?';
    return err.error?.message ?? 'Something went wrong';
  }
  return 'Something went wrong';
}
