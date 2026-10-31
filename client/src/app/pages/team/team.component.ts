import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../core/task.service';
import { EmployeeStats, apiError } from '../../core/models';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './team.component.html',
})
export class TeamComponent implements OnInit {
  private api = inject(TaskService);

  employees = signal<EmployeeStats[]>([]);
  error = signal('');

  ngOnInit(): void {
    this.api.employeeStats().subscribe({
      next: (res) => this.employees.set(res.employees),
      error: (err) => this.error.set(apiError(err)),
    });
  }

  percent(e: EmployeeStats): number {
    return e.totalTasks ? Math.round((e.completedTasks / e.totalTasks) * 100) : 0;
  }
}
