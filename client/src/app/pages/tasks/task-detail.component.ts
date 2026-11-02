import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TaskService } from '../../core/task.service';
import { LabelPipe } from '../../core/label.pipe';
import { Task, apiError } from '../../core/models';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, LabelPipe],
  templateUrl: './task-detail.component.html',
})
export class TaskDetailComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(TaskService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  task = signal<Task | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.get(id).subscribe({
      next: (res) => {
        this.task.set(res.task);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiError(err));
        this.loading.set(false);
      },
    });
  }

  canEdit(task: Task): boolean {
    return this.auth.isManager() || task.createdBy?._id === this.auth.user()?._id;
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete ${task.taskNumber} "${task.title}"?`)) return;
    this.api.remove(task._id).subscribe({
      next: () => this.router.navigate(['/tasks']),
      error: (err) => this.error.set(apiError(err)),
    });
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'done' || task.status === 'rejected') return false;
    return task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }
}
