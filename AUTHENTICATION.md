# Lecturer authentication

The dashboard now uses SQLite users, bcrypt password hashes, and Express session cookies.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login.html`.

## Demo account

```text
Email: dorcas@faculty.test
Password: Dorcas@123
```

The account is created automatically the first time the server starts. The password is stored as a bcrypt hash in `data/lecturer-dashboard.db`, not as plain text.

## Authentication routes

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Student API routes require an authenticated session:

```text
GET /api/students
GET /api/students/:id
POST /api/students
PUT /api/students/:id
```

## Persistent grades

Grades are stored in the SQLite `grades` table and remain available after a server restart. The backend calculates the visible grade from the score using the A–F scale:

```text
80–100 = A
70–79  = B
60–69  = C
50–59  = D
40–49  = E
0–39   = F
```

Grade routes require an authenticated session:

```text
GET  /api/students/:studentId/grades
POST /api/grades
PUT  /api/grades/:id
```

Example save request:

```json
{
  "studentId": "STU-24057",
  "assessmentId": "trees-checkpoint",
  "assessmentName": "Trees checkpoint",
  "score": 10,
  "maxScore": 20,
  "feedback": "Demo persisted grade record."
}
```

Saving a grade also updates the student's current A–F grade in the `students` table.

## Before production

Set a strong `SESSION_SECRET`, use HTTPS, replace the demo password, use a persistent session store instead of Express's default in-memory session store, add rate limiting, and create a real user-management flow. The current session store is suitable for local development only.


## Persistent attendance

Attendance is stored in the SQLite `attendance_records` table and remains after a server restart. Valid statuses are `Present`, `Absent`, `Late`, and `Excused`. Saving or updating a record recalculates the student attendance percentage.

```text
GET  /api/students/:studentId/attendance
POST /api/attendance
PUT  /api/attendance/:id
```

Example save request:

```json
{
  "studentId": "STU-24057",
  "sessionId": "lecture-2026-11-07",
  "sessionDate": "2026-11-07",
  "sessionName": "Trees and Traversal lecture",
  "status": "Present",
  "note": "Attended"
}
```
