# TaskFlow — Simple Task Manager (MEAN stack)

A simplified MEAN-stack version of
[task-management-system-backend](https://github.com/Aditya-Bilware/task-management-system-backend):

- **M**ongoDB + Mongoose — data
- **E**xpress — REST API
- **A**ngular 20 — frontend (standalone components, signals, reactive forms)
- **N**ode.js — runtime

## Features

- Register / login with JWT; passwords hashed with bcrypt
- Two roles:
  - **Manager** — sees every task, creates tasks for any employee, edits/deletes anything, sees the Team page
  - **Employee** — sees only their own tasks; can create tasks for themselves; on tasks a manager assigned them they can only change the status
- Tasks get auto numbers: `TMS-0001`, `TMS-0002`, …
- Statuses: next, in-progress, on-hold, review, done, backlog, rejected
- Priorities: blocker, critical, major, medium, minor, unassigned
- Search (title or task number), filter by status / priority / assignee, pagination
- Special filters: **active** (next + in progress) and **overdue**
- Soft delete (task is hidden, not removed from the database)
- Duplicate check: the same open task title can't be assigned to the same person twice
- Dashboard with counts (total, active, overdue, critical, completed) and recently updated tasks
- Team page (manager): each employee's progress

### Left out on purpose (present in the original)

Email notifications, cron jobs, Excel reports, in-app notifications, activity history and work logs.
They are good next steps once the basics work.

## Project structure

```
task-manager-mean/
├── server/                 Express + MongoDB API
│   ├── server.js           app entry point
│   ├── seed.js             demo data
│   ├── config/db.js
│   ├── models/             User, Task, Counter
│   ├── middleware/auth.js  protect (JWT) + allowRoles
│   ├── controllers/        auth, task, dashboard, user
│   ├── routes/
│   └── utils/helpers.js    task numbers, regex escaping, dates
└── client/                 Angular app
    └── src/app/
        ├── core/           models, auth service, task service, interceptor, guards, label pipe
        └── pages/          login, register, dashboard, tasks (list + form), team
```

## Running it

You need **Node.js 20+** and **MongoDB** (local install, Docker, or a free MongoDB Atlas cluster).

### 1. API

```bash
cd server
cp .env.example .env        # then edit MONGO_URI / JWT_SECRET if needed
npm install
npm run seed                # creates demo users and tasks (wipes existing data)
npm run dev                 # http://localhost:3000
```

### 2. Angular app (new terminal)

```bash
cd client
npm install
npm start                   # http://localhost:4200
```

### Demo logins (after `npm run seed`)

| Role     | Email                 | Password    |
| -------- | --------------------- | ----------- |
| Manager  | manager@example.com   | password123 |
| Employee | asha@example.com      | password123 |
| Employee | ravi@example.com      | password123 |

New sign-ups from the Register page are always employees.

## API reference

All routes except register/login need the header `Authorization: Bearer <token>`.

| Method | Route                          | Who       | Description |
| ------ | ------------------------------ | --------- | ----------- |
| POST   | `/api/auth/register`           | anyone    | `{ name, email, password }` → creates an employee |
| POST   | `/api/auth/login`              | anyone    | `{ email, password }` → `{ token, user }` |
| GET    | `/api/auth/me`                 | logged in | current user |
| GET    | `/api/tasks`                   | logged in | query: `page, limit, search, status, priority, assignedTo` |
| POST   | `/api/tasks`                   | logged in | `{ title, description?, status?, priority?, dueDate?, assignedTo? }` |
| GET    | `/api/tasks/:id`               | logged in | one task |
| PATCH  | `/api/tasks/:id`               | logged in | any of the fields above (role rules apply) |
| DELETE | `/api/tasks/:id`               | logged in | soft delete |
| GET    | `/api/tasks/meta`              | logged in | list of statuses and priorities |
| GET    | `/api/dashboard/stats`         | logged in | counts for the dashboard |
| GET    | `/api/dashboard/recent`        | logged in | 5 most recently updated tasks |
| GET    | `/api/users/employees`         | manager   | employees for the assign dropdown |
| GET    | `/api/users/employees/stats`   | manager   | employees with total/completed task counts |

`status` also accepts `active` and `overdue`.

## Notes

- The API URL used by Angular is in `client/src/environments/environment.ts`.
- CORS allows `CLIENT_URL` from `.env` (default `http://localhost:4200`).
- Built against Angular 20. If `npm install` in `client/` complains about versions, an easy fallback is
  `npx @angular/cli new client --style=css --routing --ssr=false` and then copy this `src/` folder over the generated one.
