import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TaskService } from '../../core/task.service';
import { LabelPipe } from '../../core/label.pipe';
import { Pagination, Task, TaskFilters, UserSummary, apiError } from '../../core/models';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, LabelPipe],
  templateUrl: './task-list.component.html',
})
export class TaskListComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(TaskService);
  private route = inject(ActivatedRoute);

  tasks = signal<Task[]>([]);
  pagination = signal<Pagination | null>(null);
  loading = signal(false);
  error = signal('');

  statuses = signal<string[]>([]);
  priorities = signal<string[]>([]);
  employees = signal<UserSummary[]>([]);

  filters: TaskFilters = { search: '', status: '', priority: '', assignedTo: '', page: 1, limit: 10 };
  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // Filters can come from the URL, e.g. /tasks?status=overdue (dashboard cards use this)
    const q = this.route.snapshot.queryParamMap;
    this.filters.status = q.get('status') ?? '';
    this.filters.priority = q.get('priority') ?? '';
    this.filters.assignedTo = q.get('assignedTo') ?? '';

    this.api.meta().subscribe((m) => {
      this.statuses.set(m.statuses);
      this.priorities.set(m.priorities);
    });
    if (this.auth.isManager()) {
      this.api.employees().subscribe((res) => this.employees.set(res.employees));
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list(this.filters).subscribe({
      next: (res) => {
        this.tasks.set(res.tasks);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiError(err));
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.load();
  }

  /** Waits until the user stops typing before searching. */
  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 350);
  }

  clearFilters(): void {
    this.filters = { ...this.filters, search: '', status: '', priority: '', assignedTo: '', page: 1 };
    this.load();
  }

  goToPage(page: number): void {
    this.filters.page = page;
    this.load();
  }

  /** Managers can edit/delete anything; employees only tasks they created themselves. */
  canEdit(task: Task): boolean {
    return this.auth.isManager() || task.createdBy?._id === this.auth.user()?._id;
  }

  changeStatus(task: Task, status: string): void {
    if (status === task.status) return;
    this.api.update(task._id, { status }).subscribe({
      next: (res) => this.tasks.update((list) => list.map((t) => (t._id === task._id ? res.task : t))),
      error: (err) => {
        this.error.set(apiError(err));
        this.load(); // put the select back to the real value
      },
    });
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete ${task.taskNumber} "${task.title}"?`)) return;
    this.api.remove(task._id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(apiError(err)),
    });
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'done' || task.status === 'rejected') return false;
    return task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }
}
