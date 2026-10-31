import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TaskService } from '../../core/task.service';
import { LabelPipe } from '../../core/label.pipe';
import { Task, UserSummary, apiError } from '../../core/models';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LabelPipe],
  templateUrl: './task-form.component.html',
})
export class TaskFormComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(TaskService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  taskId = this.route.snapshot.paramMap.get('id');
  isEdit = this.taskId !== null;

  task = signal<Task | null>(null);
  statuses = signal<string[]>([]);
  priorities = signal<string[]>([]);
  employees = signal<UserSummary[]>([]);
  saving = signal(false);
  error = signal('');

  /** True when an employee opens a task a manager gave them: only the status can change. */
  statusOnly = signal(false);

  today = new Date().toISOString().slice(0, 10);
  private initialDueDate = '';

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    description: [''],
    status: ['next'],
    priority: ['medium'],
    dueDate: [''],
    assignedTo: [''],
  });

  ngOnInit(): void {
    this.api.meta().subscribe((m) => {
      this.statuses.set(m.statuses);
      this.priorities.set(m.priorities);
    });

    if (this.auth.isManager()) {
      this.form.controls.assignedTo.addValidators(Validators.required);
      this.api.employees().subscribe((res) => this.employees.set(res.employees));
    }

    if (this.taskId) {
      this.api.get(this.taskId).subscribe({
        next: ({ task }) => this.fillForm(task),
        error: (err) => this.error.set(apiError(err)),
      });
    }
  }

  private fillForm(task: Task): void {
    this.task.set(task);
    this.initialDueDate = task.dueDate ? task.dueDate.slice(0, 10) : '';
    this.form.patchValue({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: this.initialDueDate,
      assignedTo: task.assignedTo?._id ?? '',
    });

    const createdByMe = task.createdBy?._id === this.auth.user()?._id;
    if (!this.auth.isManager() && !createdByMe) {
      this.statusOnly.set(true);
      this.form.disable();
      this.form.controls.status.enable();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    let payload: Record<string, unknown>;

    if (this.statusOnly()) {
      payload = { status: v.status };
    } else {
      payload = {
        title: v.title,
        description: v.description,
        status: v.status,
        priority: v.priority,
      };
      // Only send the due date when it changed (an old past date is fine to keep)
      if (!this.isEdit || v.dueDate !== this.initialDueDate) {
        payload['dueDate'] = v.dueDate || null;
      }
      // Employees always get their own tasks, so only managers send an assignee
      if (this.auth.isManager()) {
        payload['assignedTo'] = v.assignedTo;
      }
    }

    this.saving.set(true);
    this.error.set('');

    const request = this.taskId ? this.api.update(this.taskId, payload) : this.api.create(payload);
    request.subscribe({
      next: () => this.router.navigate(['/tasks']),
      error: (err) => {
        this.error.set(apiError(err));
        this.saving.set(false);
      },
    });
  }
}
