import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TaskService } from '../../core/task.service';
import { LabelPipe } from '../../core/label.pipe';
import { Stats, Task, apiError } from '../../core/models';

interface StatCard {
  key: keyof Stats;
  label: string;
  tone: string;
  query: Record<string, string>; // filters to apply when the card is clicked
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, LabelPipe],
  templateUrl: './dashboard.component.html',
})

export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(TaskService);

  stats = signal<Stats | null>(null);
  recent = signal<Task[]>([]);
  error = signal('');

  cards: StatCard[] = [
    { key: 'total', label: 'Total tasks', tone: 'neutral', query: {} },
    { key: 'active', label: 'Active', tone: 'blue', query: { status: 'active' } },
    { key: 'overdue', label: 'Overdue', tone: 'red', query: { status: 'overdue' } },
    { key: 'critical', label: 'Critical', tone: 'orange', query: { priority: 'critical' } },
    { key: 'completed', label: 'Completed', tone: 'green', query: { status: 'done' } },
  ];

  ngOnInit(): void {
    this.api.stats().subscribe({
      next: (res) => this.stats.set(res.stats),
      error: (err) => this.error.set(apiError(err)),
    });
    this.api.recent().subscribe({
      next: (res) => this.recent.set(res.tasks),
      error: (err) => this.error.set(apiError(err)),
    });
  }
}
