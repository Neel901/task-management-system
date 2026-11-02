# TaskFlow � MEAN Stack Task Management System

A full-stack task management application built with the **MEAN stack** (MongoDB, Express.js, Angular, Node.js). It supports two roles � **Manager** and **Employee** � with role-based access control throughout.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [How the App Works � Full Flow](#how-the-app-works--full-flow)
4. [Backend Deep Dive](#backend-deep-dive)
   - [Entry Point](#entry-point-serverserverjs)
   - [Database Config](#database-config-serverconfigdbjs)
   - [Models](#models)
   - [Middleware](#middleware)
   - [Routes](#routes)
   - [Controllers](#controllers)
   - [Utilities](#utilities-serverutilshelpersjs)
   - [Seed Script](#seed-script-serverseedjs)
5. [Frontend Deep Dive](#frontend-deep-dive)
   - [Entry Point](#entry-point-clientsrcmaints)
   - [App Bootstrap](#app-bootstrap-clientsrcappappconfigts)
   - [Routing](#routing-clientsrcappapproutests)
   - [Root Component](#root-component-appcomponentts--appcomponenthtml)
   - [Core Layer](#core-layer-clientsrcappcore)
   - [Pages](#pages-clientsrcapppages)
6. [Role Permissions Summary](#role-permissions-summary)
7. [API Reference](#api-reference)
8. [Getting Started](#getting-started)
9. [Demo Accounts](#demo-accounts)

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Database  | MongoDB (via Mongoose ODM)                    |
| Backend   | Node.js + Express 5                           |
| Frontend  | Angular 20 (standalone components, Signals)   |
| Auth      | JWT (JSON Web Tokens) + bcryptjs              |
| Styling   | Plain CSS (`styles.css`)                      |

---

## Project Structure

```
task-manager-mean/
+-- server/                     ? Node.js/Express API
�   +-- server.js               ? Server entry point
�   +-- seed.js                 ? DB seed script
�   +-- .env                    ? Environment variables
�   +-- package.json
�   +-- config/
�   �   +-- db.js               ? MongoDB connection
�   +-- models/
�   �   +-- User.js             ? User schema
�   �   +-- Task.js             ? Task schema
�   �   +-- Counter.js          ? Auto-increment counter
�   +-- middleware/
�   �   +-- auth.js             ? JWT verify + role guard
�   +-- routes/
�   �   +-- authRoutes.js       ? /api/auth/*
�   �   +-- taskRoutes.js       ? /api/tasks/*
�   �   +-- dashboardRoutes.js  ? /api/dashboard/*
�   �   +-- userRoutes.js       ? /api/users/*
�   +-- controllers/
�   �   +-- authController.js
�   �   +-- taskController.js
�   �   +-- dashboardController.js
�   �   +-- userController.js
�   +-- utils/
�       +-- helpers.js          ? Shared utility functions
�
+-- client/                     ? Angular SPA
    +-- src/
        +-- main.ts             ? Angular bootstrap entry
        +-- index.html          ? Root HTML shell
        +-- styles.css          ? Global CSS
        +-- app/
            +-- app.component.ts/html   ? Root component (nav + router-outlet)
            +-- app.config.ts           ? App-level providers
            +-- app.routes.ts           ? Route definitions
            +-- core/                   ? Shared services, guards, models
            �   +-- auth.service.ts
            �   +-- task.service.ts
            �   +-- auth.guard.ts
            �   +-- auth.interceptor.ts
            �   +-- models.ts
            �   +-- label.pipe.ts
            +-- pages/
                +-- login/
                +-- register/
                +-- dashboard/
                +-- tasks/
                �   +-- task-list
                �   +-- task-form
                �   +-- task-detail
                +-- team/
```

---

## How the App Works � Full Flow

### 1. User Opens the App
`main.ts` bootstraps `AppComponent` with `appConfig`.

`appConfig` registers three global providers:
- `provideRouter(routes)` � the Angular Router with the app route table
- `provideHttpClient(withInterceptors([authInterceptor]))` � HTTP client with JWT interceptor wired in
- `provideZoneChangeDetection` � performance optimization

### 2. Angular Router Takes Over
The router reads `app.routes.ts`. Every protected route has a **guard**:
- `authGuard` � redirects unauthenticated users to `/login`
- `guestGuard` � redirects already-logged-in users away from `/login` and `/register`
- `managerGuard` � redirects non-managers away from `/team`

### 3. Navigation Bar
`AppComponent` renders a persistent top navigation bar (only when a user is logged in). It shows **Dashboard**, **Tasks**, and **Team** (managers only). The `<router-outlet>` inside `<main>` swaps the page component in without reloading the nav.

### 4. Authentication
- User submits the login form ? `AuthService.login()` ? `POST /api/auth/login` ? server validates credentials, returns `{ token, user }` ? token + user are saved to `localStorage`
- Every subsequent HTTP request passes through `authInterceptor`, which reads the token from `localStorage` and injects the `Authorization: Bearer <token>` header automatically
- If the server ever returns `401`, the interceptor calls `auth.logout()`, which clears `localStorage` and redirects to `/login`

### 5. Task Lifecycle

```
Manager creates task   ?  POST /api/tasks
Employee sees task     ?  GET  /api/tasks (filtered to their own)
Employee updates status?  PATCH /api/tasks/:id
Manager reviews        ?  GET  /api/tasks/:id
Task marked "done"     ?  completedAt timestamp is recorded
Soft delete            ?  isDeleted=true (record is kept in the DB)
```

### 6. Dashboard
On login the user lands on `/dashboard`. The component makes two parallel API calls to `GET /api/dashboard/stats` and `GET /api/dashboard/recent`. Each stat card is clickable and navigates to `/tasks?status=overdue` (or similar), which the Task List reads from URL query params to pre-apply filters.

---

## Backend Deep Dive

### Entry Point � `server/server.js`

This is where the Express app is wired together and started.

**Step by step:**
1. Loads `.env` via `dotenv`
2. Creates an Express app instance
3. Adds CORS (allowing only the Angular dev server at `http://localhost:4200`)
4. Adds `express.json()` to parse request bodies
5. Adds a safety middleware that sets `req.body = {}` if it is `undefined` (Express 5 quirk)
6. Registers a `/api/health` ping endpoint
7. Mounts the four route groups under `/api/auth`, `/api/tasks`, `/api/dashboard`, `/api/users`
8. Adds a 404 catch-all for unknown routes
9. Adds a global error handler that differentiates Mongoose `ValidationError` (400), duplicate key errors (409), and everything else (500)
10. Calls `connectDB()` and only starts listening **after** MongoDB is connected

---

### Database Config � `server/config/db.js`

Exports a single `connectDB()` async function. Calls `mongoose.connect()` with the URI from `MONGO_URI`. If the connection fails, it logs the error and exits the process with code 1 so the process manager knows to restart.

---

### Models

#### `server/models/User.js`

| Field          | Type   | Notes                                        |
|----------------|--------|----------------------------------------------|
| `employeeCode` | String | Unique. Format: `EMP-001` or `MGR-001`       |
| `name`         | String | Required                                     |
| `email`        | String | Unique, lowercase                            |
| `password`     | String | `select: false` � never returned by default  |
| `role`         | String | `"manager"` or `"employee"` (default)        |

A `pre("save")` hook runs `bcrypt.hash()` automatically whenever the password field changes. The `comparePassword()` instance method wraps `bcrypt.compare()` for login checks.

#### `server/models/Task.js`

| Field         | Type     | Notes                                                               |
|---------------|----------|---------------------------------------------------------------------|
| `taskNumber`  | String   | Auto-generated. Format: `TMS-0001`                                  |
| `title`       | String   | Required, 3�200 chars                                               |
| `description` | String   | Optional                                                            |
| `status`      | String   | Enum: `next`, `in-progress`, `on-hold`, `review`, `done`, `backlog`, `rejected` |
| `priority`    | String   | Enum:  `critical`, `major`, `medium`, `minor` |
| `assignedTo`  | ObjectId | Ref to `User`, indexed                                              |
| `createdBy`   | ObjectId | Ref to `User`                                                       |
| `dueDate`     | Date     | Optional                                                            |
| `completedAt` | Date     | Set automatically when status becomes `"done"`                      |
| `isDeleted`   | Boolean  | Soft delete flag (default `false`)                                  |
| `deletedBy`   | ObjectId | Who deleted it                                                      |
| `deletedAt`   | Date     | When it was deleted                                                 |

The model also exports `Task.STATUSES` and `Task.PRIORITIES` arrays � a single source of truth served to the frontend via `/api/tasks/meta`.

**Soft Delete:** Tasks are never physically removed. When deleted, `isDeleted` is set to `true`. All queries filter with `{ isDeleted: false }`.

#### `server/models/Counter.js`

Schema: `{ _id: String, seq: Number }`. Tracks running sequences. Two counters exist: `"task"` (for `TMS-XXXX`) and `"employee"` (for `EMP-XXX`). The `$inc` + `upsert` pattern makes increments atomic and safe under concurrency.

---

### Middleware

#### `server/middleware/auth.js`

- **`protect`** � Reads the `Authorization` header, extracts the Bearer token, verifies it with `jwt.verify()`, and attaches `{ id, role }` to `req.user`. Returns 401 if missing or invalid.
- **`allowRoles(...roles)`** � A factory returning middleware that checks `req.user.role` against the allowed list. Returns 403 if not permitted. Must be placed after `protect`.

---

### Routes

| File                    | Prefix           | Auth Required | Role Required |
|-------------------------|------------------|---------------|---------------|
| `authRoutes.js`         | `/api/auth`      | Partial       | �             |
| `taskRoutes.js`         | `/api/tasks`     | All routes    | Any logged-in |
| `dashboardRoutes.js`    | `/api/dashboard` | All routes    | Any logged-in |
| `userRoutes.js`         | `/api/users`     | All routes    | Manager only  |

**`authRoutes.js`:** `POST /register`, `POST /login` are public. `GET /me` requires a token.

**`taskRoutes.js`:** All routes use `protect`. `GET /meta` is declared before `/:id` to avoid the string `"meta"` being matched as a task ID.

**`userRoutes.js`:** Uses `protect` + `allowRoles("manager")` at router level, locking down all routes in this file.

---

### Controllers

#### `server/controllers/authController.js`
- **`register`** � Validates inputs, checks for duplicate email, creates a user with `role: "employee"`, auto-generates `employeeCode`, returns JWT + user object
- **`login`** � Finds user by email (explicitly selecting the hidden password field), verifies password, returns JWT + user object
- **`me`** � Returns current user profile from `req.user.id`

#### `server/controllers/taskController.js`
The largest controller. Key internals:

- **`validateFields(body)`** � Only validates fields that are *present* in the body (supports partial updates). Returns `{ data }` on success or `{ error }` string.
- **`hasDuplicate(title, assignedTo, excludeId)`** � Prevents creating two open tasks with the same title for the same person (case-insensitive).
- **`loadTask(req, res)`** � Shared helper: finds a task, checks soft-delete, enforces that employees can only see their own tasks. Sends the error response itself and returns `null` on failure.

**Role-based field restrictions in `updateTask`:**
- **Manager** � can change all fields including `assignedTo`
- **Employee (self-created task)** � can change title, description, status, priority, dueDate
- **Employee (manager-assigned task)** � can only change `status`

#### `server/controllers/dashboardController.js`
- **`baseFilter(user)`** � Scopes queries: managers see all tasks, employees see only theirs
- **`getStats`** � Runs 5 `countDocuments` queries in parallel with `Promise.all`
- **`getRecentTasks`** � Returns 5 most recently *updated* tasks

#### `server/controllers/userController.js`
Both endpoints are manager-only (enforced at route level).
- **`getEmployees`** � Employee list for the "assign to" dropdown
- **`getEmployeeStats`** � Aggregates total/completed task counts per employee using MongoDB `$group`, then merges into the employee list

---

### Utilities � `server/utils/helpers.js`

| Function                | Purpose                                                                  |
|-------------------------|--------------------------------------------------------------------------|
| `nextSequence(name)`    | Atomically increments a named counter using `findByIdAndUpdate + $inc`   |
| `generateTaskNumber()`  | Returns `"TMS-0007"` style strings                                        |
| `generateEmployeeCode()`| Returns `"EMP-003"` style strings                                         |
| `escapeRegex(text)`     | Escapes special regex chars so user input is safe inside a `RegExp`       |
| `cleanText(text)`       | Trims and collapses internal whitespace                                    |
| `startOfToday()`        | Returns midnight UTC today � used for "overdue" comparisons               |

---

### Seed Script � `server/seed.js`

Run with `npm run seed` from the `server/` directory.

1. Connects to MongoDB
2. Wipes all users, tasks, and counters
3. Creates 1 manager and 2 employees
4. Resets counters so subsequent creates produce correct codes
5. Creates 5 sample tasks covering various statuses and priorities (including one overdue)

---

## Frontend Deep Dive

### Entry Point � `client/src/main.ts`

The very first file Angular runs. Calls `bootstrapApplication(AppComponent, appConfig)` � Angular 17+'s standalone bootstrap API (no `NgModule` needed).

---

### App Bootstrap � `client/src/app/app.config.ts`

| Provider                                           | What it does                                               |
|----------------------------------------------------|------------------------------------------------------------|
| `provideRouter(routes)`                            | Sets up the Angular Router                                 |
| `provideHttpClient(withInterceptors([...]))`       | Creates the HTTP client and registers the JWT interceptor  |
| `provideZoneChangeDetection({ eventCoalescing })`  | Batches DOM events into single change detection cycles     |

---

### Routing � `client/src/app/app.routes.ts`

| Path              | Component             | Guards                       |
|-------------------|-----------------------|------------------------------|
| `/login`          | `LoginComponent`      | `guestGuard`                 |
| `/register`       | `RegisterComponent`   | `guestGuard`                 |
| `/dashboard`      | `DashboardComponent`  | `authGuard`                  |
| `/tasks`          | `TaskListComponent`   | `authGuard`                  |
| `/tasks/new`      | `TaskFormComponent`   | `authGuard`                  |
| `/tasks/:id`      | `TaskDetailComponent` | `authGuard`                  |
| `/tasks/:id/edit` | `TaskFormComponent`   | `authGuard`                  |
| `/team`           | `TeamComponent`       | `authGuard` + `managerGuard` |
| `''`              | ? `/dashboard`        | �                            |
| `**`              | ? `/dashboard`        | �                            |

---

### Root Component � `AppComponent` + `app.component.html`

`AppComponent` is a shell. Its template:
- Conditionally renders the top nav bar using `@if (auth.user())` (hidden when logged out)
- Shows **Dashboard**, **Tasks**, and **Team** (Team hidden for employees)
- Shows the user's name and role badge
- Has a **Log out** button
- `<router-outlet />` renders the active page component

---

### Core Layer � `client/src/app/core/`

#### `auth.service.ts`
Central authentication service using Angular Signals.

| Member        | Type                  | Purpose                                              |
|---------------|-----------------------|------------------------------------------------------|
| `user`        | `signal<User\|null>`  | The logged-in user. Read as `auth.user()`.           |
| `isLoggedIn`  | `computed`            | `true` when `user()` is not null                     |
| `isManager`   | `computed`            | `true` when `user()?.role === 'manager'`             |
| `token`       | getter                | Reads JWT from `localStorage`                        |
| `login()`     | method                | POST to `/api/auth/login`, saves session             |
| `register()`  | method                | POST to `/api/auth/register`, saves session          |
| `logout()`    | method                | Clears `localStorage`, resets signal, navigates to `/login` |

On startup, `loadUser()` restores session from `localStorage` so refreshing the page keeps the user logged in.

#### `task.service.ts`
Thin HTTP wrapper. All methods return `Observable`s.

| Method              | API call                          |
|---------------------|-----------------------------------|
| `list(filters)`     | `GET /api/tasks?...`              |
| `get(id)`           | `GET /api/tasks/:id`              |
| `create(data)`      | `POST /api/tasks`                 |
| `update(id, data)`  | `PATCH /api/tasks/:id`            |
| `remove(id)`        | `DELETE /api/tasks/:id`           |
| `meta()`            | `GET /api/tasks/meta`             |
| `stats()`           | `GET /api/dashboard/stats`        |
| `recent()`          | `GET /api/dashboard/recent`       |
| `employees()`       | `GET /api/users/employees`        |
| `employeeStats()`   | `GET /api/users/employees/stats`  |

#### `auth.guard.ts`
- **`authGuard`** � redirects to `/login` if not logged in
- **`guestGuard`** � redirects to `/dashboard` if already logged in
- **`managerGuard`** � redirects to `/dashboard` if not a manager

#### `auth.interceptor.ts`
Runs for every outgoing HTTP request:
1. Reads token from `AuthService`
2. Clones the request and injects `Authorization: Bearer <token>` header
3. On `401` errors (with a valid token) � calls `auth.logout()` (expired token)

#### `models.ts`
TypeScript interfaces mirroring server shapes: `User`, `UserSummary`, `EmployeeStats`, `Task`, `Pagination`, `TaskFilters`, `Stats`, `AuthResponse`, `Role`.

Also exports **`apiError(err)`** � extracts a human-readable message from `HttpErrorResponse`.

#### `label.pipe.ts`
Standalone Angular pipe. Converts `"in-progress"` ? `"In progress"`. Used in all templates that display status/priority values.

---

### Pages � `client/src/app/pages/`

#### `login/LoginComponent`
Reactive form with email + password. Has `useDemo(email)` to pre-fill seeded demo credentials. On success, navigates to `/dashboard`.

#### `register/RegisterComponent`
Reactive form with name, email, password. Always creates `"employee"` role accounts. On success, navigates to `/dashboard`.

#### `dashboard/DashboardComponent`
On `ngOnInit`, fetches `stats()` and `recent()` in parallel. Stat cards are clickable and navigate to `/tasks` with pre-applied query params (e.g., `?status=overdue`).

#### `tasks/task-list/TaskListComponent`
Main task management view.
- Reads URL query params on init (for dashboard card navigation)
- Loads dropdown metadata, employee list (managers only), then fetches tasks
- Search is debounced 350 ms; other filters apply immediately
- Inline status `<select>` sends a `PATCH` request without navigating
- `canEdit(task)` controls visibility of Edit/Delete for employees

#### `tasks/task-form/TaskFormComponent`
Shared create/edit form.
- Detects mode by checking `route.snapshot.paramMap.get('id')`
- **Status-only mode:** triggered when an employee edits a manager-assigned task � all fields except `status` are disabled
- Managers see an "Assign to" dropdown; employees don't
- Only sends changed fields in the payload (avoids re-validating an unchanged past due date)

#### `tasks/task-detail/TaskDetailComponent`
Read-only task view. Shows all fields and timestamps. Edit/Delete buttons are conditionally visible via `canEdit()`. Delete shows a browser `confirm()` before calling the API.

#### `team/TeamComponent`
Manager-only. Fetches `employeeStats()` and displays each employee with total/completed task counts and a computed completion percentage.

---

## Role Permissions Summary

| Action                               | Manager | Employee (own task) | Employee (manager's task) |
|--------------------------------------|---------|---------------------|---------------------------|
| View all tasks                       | ?      | ?                  | ?                        |
| View own tasks                       | ?      | ?                  | ?                        |
| Create task for anyone               | ?      | ?                  | ?                        |
| Create task for self                 | ?      | ?                  | ?                        |
| Edit title / description / priority  | ?      | ?                  | ?                        |
| Change status                        | ?      | ?                  | ?                        |
| Reassign task                        | ?      | ?                  | ?                        |
| Delete task                          | ?      | ?                  | ?                        |
| View Team page                       | ?      | ?                  | ?                        |
| Access employee dropdown             | ?      | ?                  | ?                        |

---

## API Reference

### Auth � `/api/auth`

| Method | Path        | Auth | Description             |
|--------|-------------|------|-------------------------|
| POST   | `/register` | No   | Create employee account |
| POST   | `/login`    | No   | Login, get JWT          |
| GET    | `/me`       | Yes  | Get current user        |

### Tasks � `/api/tasks`

| Method | Path    | Auth | Description                                |
|--------|---------|------|--------------------------------------------|
| GET    | `/meta` | Yes  | Enum values for status and priority        |
| GET    | `/`     | Yes  | List tasks (paginated, filterable)         |
| POST   | `/`     | Yes  | Create a task                              |
| GET    | `/:id`  | Yes  | Get a single task                          |
| PATCH  | `/:id`  | Yes  | Update a task (partial)                    |
| DELETE | `/:id`  | Yes  | Soft-delete a task                         |

**Query params for `GET /`:** `page`, `limit`, `search`, `status`, `priority`, `assignedTo`

Special `status` values: `"active"` (next + in-progress), `"overdue"` (past due, not closed)

### Dashboard � `/api/dashboard`

| Method | Path      | Auth | Description             |
|--------|-----------|------|-------------------------|
| GET    | `/stats`  | Yes  | Summary count cards     |
| GET    | `/recent` | Yes  | 5 most recently updated |

### Users � `/api/users` *(manager only)*

| Method | Path               | Auth    | Description                    |
|--------|--------------------|---------|--------------------------------|
| GET    | `/employees`       | Manager | Employee list for dropdowns    |
| GET    | `/employees/stats` | Manager | Employees with task counts     |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally on port `27017`

### 1. Backend Setup

```bash
cd server
npm install
```

Configure `server/.env` (defaults are ready to use for local dev):

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/task_manager
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:4200
```

Seed the database:

```bash
npm run seed
```

Start the API server:

```bash
npm run dev     # with auto-reload via nodemon
# or
npm start       # plain node
```

API available at `http://localhost:3000`.

### 2. Frontend Setup

```bash
cd client
npm install
npm start
```

Angular dev server runs at `http://localhost:4200`. All API calls point to `http://localhost:3000/api` (configured in `src/environments/environment.ts`).

---

## Demo Accounts

Available after running `npm run seed`. Also pre-filled on the login page:

| Email                 | Password      | Role     |
|-----------------------|---------------|----------|
| `manager@example.com` | `password123` | Manager  |
| `asha@example.com`    | `password123` | Employee |
| `ravi@example.com`    | `password123` | Employee |

---

## Key Design Decisions

- **Soft deletes** � Tasks are flagged `isDeleted: true` rather than removed, preserving history and audit trails
- **Atomic counters** � `findByIdAndUpdate` with `$inc + upsert` ensures `TMS-XXXX` IDs are unique even under concurrent requests
- **Angular Signals** � Components use `signal()` and `computed()` for reactive state, following Angular 17+ patterns (no `BehaviorSubject`)
- **Single `TaskService`** � Both task and dashboard API calls live in one service to keep the component layer thin
- **Express 5** � Async errors in route handlers are caught automatically without explicit `try/catch` blocks
- **Role enforced on both sides** � The server re-checks roles on every request; Angular guards are UX conveniences only
