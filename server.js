const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDirectory = path.join(__dirname, 'data');
const databasePath = path.join(dataDirectory, 'lecturer-dashboard.db');
const materialsDirectory = path.join(__dirname, 'storage', 'course-materials');

fs.mkdirSync(dataDirectory, { recursive: true });
fs.mkdirSync(materialsDirectory, { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    grade TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
    gpa REAL NOT NULL DEFAULT 0 CHECK (gpa >= 0 AND gpa <= 4),
    attendance INTEGER NOT NULL DEFAULT 0 CHECK (attendance >= 0 AND attendance <= 100),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    standing TEXT NOT NULL CHECK (standing IN ('On track', 'Monitor', 'At risk')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const seedStudents = [
  ['STU-24018', 'Noah Williams', 'NW', 'A', 3.74, 98, 86, 'On track'],
  ['STU-24031', 'Aisha Patel', 'AP', 'B', 3.51, 94, 72, 'On track'],
  ['STU-24042', 'Mateo Garcia', 'MG', 'B', 3.28, 89, 64, 'Monitor'],
  ['STU-24057', 'Chloe Thompson', 'CT', 'C', 2.84, 76, 48, 'At risk'],
  ['STU-24063', 'Ethan Kim', 'EK', 'A', 3.91, 100, 93, 'On track']
];

const studentCount = db.prepare('SELECT COUNT(*) AS count FROM students').get().count;
if (studentCount === 0) {
  const insert = db.prepare(`
    INSERT INTO students
      (id, name, initials, grade, gpa, attendance, progress, standing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    for (const student of seedStudents) insert.run(...student);
  });

  seed();
  console.log(`Seeded ${seedStudents.length} demo students into SQLite.`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'lecturer',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const demoEmail = process.env.DEMO_LECTURER_EMAIL || 'dorcas@faculty.test';
const demoPassword = process.env.DEMO_LECTURER_PASSWORD || 'Dorcas@123';
const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);
if (!existingUser) {
  db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`)
    .run('Dorcas', demoEmail, bcrypt.hashSync(demoPassword, 12), 'lecturer');
  console.log(`Created demo lecturer account: ${demoEmail}`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    assessment_id TEXT NOT NULL,
    assessment_name TEXT NOT NULL,
    score REAL NOT NULL CHECK (score >= 0),
    max_score REAL NOT NULL CHECK (max_score > 0),
    grade TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
    feedback TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, assessment_id),
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_date TEXT NOT NULL,
    session_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id),
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    course_code TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    due_date TEXT,
    max_score REAL NOT NULL DEFAULT 100 CHECK (max_score > 0),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Open', 'Closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS course_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    course_code TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL
  );
`);

const uploadStorage = multer.diskStorage({
  destination: materialsDirectory,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});
const allowedMaterialTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/png',
  'image/jpeg'
]);
const uploadMaterial = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, allowedMaterialTypes.has(file.mimetype))
});

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '',
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
`);

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-session-secret-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ message: 'Authentication required' });
    return res.redirect('/login.html');
  }
  next();
}

function createNotification(userId, type, title, message, link = '') {
  db.prepare(`INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`)
    .run(userId, type, title, message, link);
}

app.get('/', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use(express.static(__dirname, { index: false }));

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?').get(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  const rememberMe = Boolean(req.body.rememberMe);
  req.session.cookie.maxAge = rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8;
  res.json({ message: 'Signed in successfully', user: req.session.user, rememberMe });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  req.session.destroy(error => {
    if (error) return res.status(500).json({ message: 'Could not sign out' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Signed out successfully' });
  });
});

function getStudent(id) {
  return db.prepare(`
    SELECT id, name, initials, grade, gpa, attendance, progress, standing
    FROM students
    WHERE id = ?
  `).get(id);
}

function calculateGrade(score, maxScore) {
  const percentage = (Number(score) / Number(maxScore)) * 100;
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
}

function getGrade(id) {
  return db.prepare(`
    SELECT id, student_id AS studentId, assessment_id AS assessmentId,
           assessment_name AS assessmentName, score, max_score AS maxScore,
           grade, feedback, created_at AS createdAt, updated_at AS updatedAt
    FROM grades WHERE id = ?
  `).get(id);
}

function validateGradeInput(input) {
  if (!input.studentId || !input.assessmentId || !input.assessmentName) return 'studentId, assessmentId, and assessmentName are required';
  if (!getStudent(input.studentId)) return 'student not found';
  if (!Number.isFinite(Number(input.score)) || Number(input.score) < 0) return 'score must be zero or greater';
  if (!Number.isFinite(Number(input.maxScore)) || Number(input.maxScore) <= 0) return 'maxScore must be greater than zero';
  if (Number(input.score) > Number(input.maxScore)) return 'score cannot exceed maxScore';
  return null;
}

function getAttendance(id) {
  return db.prepare(`
    SELECT id, student_id AS studentId, session_id AS sessionId,
           session_date AS sessionDate, session_name AS sessionName,
           status, note, created_at AS createdAt, updated_at AS updatedAt
    FROM attendance_records WHERE id = ?
  `).get(id);
}

function validateAttendanceInput(input) {
  const allowedStatuses = ['Present', 'Absent', 'Late', 'Excused'];
  if (!input.studentId || !input.sessionId || !input.sessionDate || !input.sessionName) return 'studentId, sessionId, sessionDate, and sessionName are required';
  if (!getStudent(input.studentId)) return 'student not found';
  if (!allowedStatuses.includes(input.status)) return 'status must be Present, Absent, Late, or Excused';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) return 'sessionDate must use YYYY-MM-DD format';
  return null;
}

function refreshStudentAttendance(studentId) {
  const summary = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN status IN ('Present', 'Late', 'Excused') THEN 1 ELSE 0 END) AS attended
    FROM attendance_records WHERE student_id = ?
  `).get(studentId);
  if (summary.total > 0) {
    const percentage = Math.round((summary.attended / summary.total) * 100);
    db.prepare('UPDATE students SET attendance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(percentage, studentId);
  }
}

function validateStudentInput(input) {
  const allowedGrades = ['A', 'B', 'C', 'D', 'E', 'F'];
  const allowedStandings = ['On track', 'Monitor', 'At risk'];

  if (!input.id || !input.name || !input.initials) return 'id, name, and initials are required';
  if (!allowedGrades.includes(input.grade)) return 'grade must be A, B, C, D, E, or F';
  if (!allowedStandings.includes(input.standing)) return 'invalid standing';
  if (!Number.isFinite(Number(input.gpa)) || Number(input.gpa) < 0 || Number(input.gpa) > 4) return 'gpa must be between 0 and 4';
  if (!Number.isInteger(Number(input.attendance)) || Number(input.attendance) < 0 || Number(input.attendance) > 100) return 'attendance must be between 0 and 100';
  if (!Number.isInteger(Number(input.progress)) || Number(input.progress) < 0 || Number(input.progress) > 100) return 'progress must be between 0 and 100';
  return null;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'sqlite', databasePath });
});

app.get('/api/students', requireAuth, (req, res) => {
  const students = db.prepare(`
    SELECT id, name, initials, grade, gpa, attendance, progress, standing
    FROM students
    ORDER BY name ASC
  `).all();

  res.json({ data: students, total: students.length });
});

app.get('/api/students/:id', requireAuth, (req, res) => {
  const student = getStudent(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
});

app.get('/api/students/:studentId/grades', requireAuth, (req, res) => {
  const student = getStudent(req.params.studentId);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const grades = db.prepare(`
    SELECT id, student_id AS studentId, assessment_id AS assessmentId,
           assessment_name AS assessmentName, score, max_score AS maxScore,
           grade, feedback, created_at AS createdAt, updated_at AS updatedAt
    FROM grades WHERE student_id = ? ORDER BY updated_at DESC
  `).all(req.params.studentId);
  res.json({ data: grades, total: grades.length });
});

app.post('/api/grades', requireAuth, (req, res) => {
  const error = validateGradeInput(req.body);
  if (error) return res.status(400).json({ message: error });

  const score = Number(req.body.score);
  const maxScore = Number(req.body.maxScore);
  const grade = calculateGrade(score, maxScore);
  const saveGrade = db.transaction(() => {
    db.prepare(`
      INSERT INTO grades (student_id, assessment_id, assessment_name, score, max_score, grade, feedback)
      VALUES (@studentId, @assessmentId, @assessmentName, @score, @maxScore, @grade, @feedback)
      ON CONFLICT(student_id, assessment_id) DO UPDATE SET
        assessment_name = excluded.assessment_name,
        score = excluded.score,
        max_score = excluded.max_score,
        grade = excluded.grade,
        feedback = excluded.feedback,
        updated_at = CURRENT_TIMESTAMP
    `).run({ studentId: req.body.studentId, assessmentId: req.body.assessmentId, assessmentName: req.body.assessmentName, score, maxScore, grade, feedback: String(req.body.feedback || '') });

    const latest = db.prepare('SELECT id FROM grades WHERE student_id = ? AND assessment_id = ?').get(req.body.studentId, req.body.assessmentId);
    db.prepare('UPDATE students SET grade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(grade, req.body.studentId);
    const saved = getGrade(latest.id);
    createNotification(req.session.user.id, 'grade', 'Grade saved', `${saved.assessmentName} for ${getStudent(saved.studentId).name} was saved as ${saved.grade}.`, `/students/${saved.studentId}`);
    return saved;
  });

  res.status(201).json({ message: 'Grade saved permanently', data: saveGrade() });
});

app.put('/api/grades/:id', requireAuth, (req, res) => {
  const current = getGrade(req.params.id);
  if (!current) return res.status(404).json({ message: 'Grade not found' });
  const input = { ...current, ...req.body, studentId: current.studentId, assessmentId: current.assessmentId, assessmentName: req.body.assessmentName || current.assessmentName };
  const error = validateGradeInput(input);
  if (error) return res.status(400).json({ message: error });

  const score = Number(input.score);
  const maxScore = Number(input.maxScore);
  const grade = calculateGrade(score, maxScore);
  db.transaction(() => {
    db.prepare(`UPDATE grades SET score = ?, max_score = ?, grade = ?, feedback = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(score, maxScore, grade, String(input.feedback || ''), req.params.id);
    db.prepare('UPDATE students SET grade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(grade, current.studentId);
  })();
  const saved = getGrade(req.params.id);
  createNotification(req.session.user.id, 'grade', 'Grade updated', `${saved.assessmentName} for ${getStudent(saved.studentId).name} is now ${saved.grade}.`, `/students/${saved.studentId}`);
  res.json({ message: 'Grade updated permanently', data: saved });
});

app.get('/api/students/:studentId/attendance', requireAuth, (req, res) => {
  const student = getStudent(req.params.studentId);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const attendance = db.prepare(`
    SELECT id, student_id AS studentId, session_id AS sessionId,
           session_date AS sessionDate, session_name AS sessionName,
           status, note, created_at AS createdAt, updated_at AS updatedAt
    FROM attendance_records WHERE student_id = ? ORDER BY session_date DESC
  `).all(req.params.studentId);
  res.json({ data: attendance, total: attendance.length });
});

app.post('/api/attendance', requireAuth, (req, res) => {
  const error = validateAttendanceInput(req.body);
  if (error) return res.status(400).json({ message: error });

  const saveAttendance = db.transaction(() => {
    db.prepare(`
      INSERT INTO attendance_records (student_id, session_id, session_date, session_name, status, note)
      VALUES (@studentId, @sessionId, @sessionDate, @sessionName, @status, @note)
      ON CONFLICT(student_id, session_id) DO UPDATE SET
        session_date = excluded.session_date,
        session_name = excluded.session_name,
        status = excluded.status,
        note = excluded.note,
        updated_at = CURRENT_TIMESTAMP
    `).run({ ...req.body, note: String(req.body.note || '') });
    refreshStudentAttendance(req.body.studentId);
    const record = db.prepare('SELECT id FROM attendance_records WHERE student_id = ? AND session_id = ?').get(req.body.studentId, req.body.sessionId);
    return getAttendance(record.id);
  });

  const saved = saveAttendance();
  createNotification(req.session.user.id, 'attendance', 'Attendance saved', `${saved.sessionName} attendance for ${getStudent(saved.studentId).name} was marked ${saved.status}.`, `/students/${saved.studentId}`);
  res.status(201).json({ message: 'Attendance saved permanently', data: saved });
});

app.put('/api/attendance/:id', requireAuth, (req, res) => {
  const current = getAttendance(req.params.id);
  if (!current) return res.status(404).json({ message: 'Attendance record not found' });
  const input = { ...current, ...req.body, studentId: current.studentId, sessionId: current.sessionId };
  const error = validateAttendanceInput(input);
  if (error) return res.status(400).json({ message: error });

  db.transaction(() => {
    db.prepare(`UPDATE attendance_records SET session_date = ?, session_name = ?, status = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(input.sessionDate, input.sessionName, input.status, String(input.note || ''), req.params.id);
    refreshStudentAttendance(current.studentId);
  })();

  const saved = getAttendance(req.params.id);
  createNotification(req.session.user.id, 'attendance', 'Attendance updated', `${saved.sessionName} attendance for ${getStudent(saved.studentId).name} was updated to ${saved.status}.`, `/students/${saved.studentId}`);
  res.json({ message: 'Attendance updated permanently', data: saved });
});

app.get('/api/notifications', requireAuth, (req, res) => {
  const notifications = db.prepare(`
    SELECT id, type, title, message, link, is_read AS isRead, created_at AS createdAt
    FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50
  `).all(req.session.user.id);
  const unread = notifications.filter(item => !item.isRead).length;
  res.json({ data: notifications, unread });
});

app.patch('/api/notifications/:id/read', requireAuth, (req, res) => {
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.session.user.id);
  if (!result.changes) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Notification marked as read' });
});

app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.session.user.id);
  res.json({ message: 'All notifications marked as read' });
});

app.delete('/api/notifications/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.session.user.id);
  if (!result.changes) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Notification deleted' });
});

app.get('/api/assessments', requireAuth, (req, res) => {
  const assessments = db.prepare(`
    SELECT id, title, course_code AS courseCode, description, due_date AS dueDate,
           max_score AS maxScore, status, created_at AS createdAt, updated_at AS updatedAt
    FROM assessments ORDER BY due_date ASC, created_at DESC
  `).all();
  res.json({ data: assessments, total: assessments.length });
});

app.post('/api/assessments', requireAuth, (req, res) => {
  const id = String(req.body.id || crypto.randomUUID());
  const title = String(req.body.title || '').trim();
  const status = String(req.body.status || 'Draft');
  const maxScore = Number(req.body.maxScore || 100);
  if (!title) return res.status(400).json({ message: 'title is required' });
  if (!['Draft', 'Open', 'Closed'].includes(status)) return res.status(400).json({ message: 'status must be Draft, Open, or Closed' });
  if (!Number.isFinite(maxScore) || maxScore <= 0) return res.status(400).json({ message: 'maxScore must be greater than zero' });
  try {
    db.prepare(`
      INSERT INTO assessments (id, title, course_code, description, due_date, max_score, status)
      VALUES (@id, @title, @courseCode, @description, @dueDate, @maxScore, @status)
    `).run({ id, title, courseCode: String(req.body.courseCode || ''), description: String(req.body.description || ''), dueDate: req.body.dueDate || null, maxScore, status });
    const assessment = db.prepare(`SELECT id, title, course_code AS courseCode, description, due_date AS dueDate, max_score AS maxScore, status, created_at AS createdAt, updated_at AS updatedAt FROM assessments WHERE id = ?`).get(id);
    createNotification(req.session.user.id, 'assessment', 'Assessment created', `${assessment.title} was saved for ${assessment.courseCode || 'your course'}.`, '/assessments');
    res.status(201).json({ message: 'Assessment saved permanently', data: assessment });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return res.status(409).json({ message: 'An assessment with this ID already exists' });
    res.status(500).json({ message: 'Could not save assessment' });
  }
});

app.put('/api/assessments/:id', requireAuth, (req, res) => {
  const current = db.prepare('SELECT * FROM assessments WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ message: 'Assessment not found' });
  const title = String(req.body.title ?? current.title).trim();
  const status = String(req.body.status ?? current.status);
  const maxScore = Number(req.body.maxScore ?? current.max_score);
  if (!title || !['Draft', 'Open', 'Closed'].includes(status) || !Number.isFinite(maxScore) || maxScore <= 0) return res.status(400).json({ message: 'Invalid assessment fields' });
  db.prepare(`UPDATE assessments SET title = ?, course_code = ?, description = ?, due_date = ?, max_score = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(title, String(req.body.courseCode ?? current.course_code), String(req.body.description ?? current.description), req.body.dueDate ?? current.due_date, maxScore, status, req.params.id);
  const assessment = db.prepare(`SELECT id, title, course_code AS courseCode, description, due_date AS dueDate, max_score AS maxScore, status, created_at AS createdAt, updated_at AS updatedAt FROM assessments WHERE id = ?`).get(req.params.id);
  res.json({ message: 'Assessment updated permanently', data: assessment });
});

app.delete('/api/assessments/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM assessments WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Assessment not found' });
  res.json({ message: 'Assessment deleted permanently' });
});

app.get('/api/materials', requireAuth, (req, res) => {
  const materials = db.prepare(`
    SELECT id, title, course_code AS courseCode, description, original_name AS originalName,
           mime_type AS mimeType, file_size AS fileSize, created_at AS createdAt
    FROM course_materials ORDER BY created_at DESC
  `).all();
  res.json({ data: materials, total: materials.length });
});

app.post('/api/materials', requireAuth, uploadMaterial.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A supported file is required' });
  const title = String(req.body.title || req.file.originalname).trim();
  try {
    const result = db.prepare(`
      INSERT INTO course_materials (title, course_code, description, original_name, stored_name, mime_type, file_size, file_path, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, String(req.body.courseCode || ''), String(req.body.description || ''), req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.file.path, req.session.user.id);
    const material = db.prepare(`SELECT id, title, course_code AS courseCode, description, original_name AS originalName, mime_type AS mimeType, file_size AS fileSize, created_at AS createdAt FROM course_materials WHERE id = ?`).get(result.lastInsertRowid);
    createNotification(req.session.user.id, 'material', 'Course material uploaded', `${material.title} is now available in course materials.`, '/materials');
    res.status(201).json({ message: 'Course material uploaded permanently', data: { ...material, downloadUrl: `/api/materials/${material.id}/download` } });
  } catch (error) {
    fs.rmSync(req.file.path, { force: true });
    res.status(500).json({ message: 'Could not save course material' });
  }
});

app.get('/api/materials/:id/download', requireAuth, (req, res) => {
  const material = db.prepare('SELECT * FROM course_materials WHERE id = ?').get(req.params.id);
  if (!material || !fs.existsSync(material.file_path)) return res.status(404).json({ message: 'Material not found' });
  res.download(material.file_path, material.original_name);
});

app.delete('/api/materials/:id', requireAuth, (req, res) => {
  const material = db.prepare('SELECT * FROM course_materials WHERE id = ?').get(req.params.id);
  if (!material) return res.status(404).json({ message: 'Material not found' });
  db.prepare('DELETE FROM course_materials WHERE id = ?').run(req.params.id);
  fs.rmSync(material.file_path, { force: true });
  res.json({ message: 'Course material deleted permanently' });
});

app.post('/api/students', requireAuth, (req, res) => {
  const error = validateStudentInput(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    db.prepare(`
      INSERT INTO students
        (id, name, initials, grade, gpa, attendance, progress, standing)
      VALUES (@id, @name, @initials, @grade, @gpa, @attendance, @progress, @standing)
    `).run({
      ...req.body,
      gpa: Number(req.body.gpa),
      attendance: Number(req.body.attendance),
      progress: Number(req.body.progress)
    });

    res.status(201).json({ message: 'Student created', data: getStudent(req.body.id) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({ message: 'A student with this ID already exists' });
    }
    res.status(500).json({ message: 'Could not create student' });
  }
});

app.put('/api/students/:id', requireAuth, (req, res) => {
  const current = getStudent(req.params.id);
  if (!current) return res.status(404).json({ message: 'Student not found' });

  const updated = { ...current, ...req.body, id: req.params.id };
  const error = validateStudentInput(updated);
  if (error) return res.status(400).json({ message: error });

  db.prepare(`
    UPDATE students
    SET name = @name,
        initials = @initials,
        grade = @grade,
        gpa = @gpa,
        attendance = @attendance,
        progress = @progress,
        standing = @standing,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({
    ...updated,
    gpa: Number(updated.gpa),
    attendance: Number(updated.attendance),
    progress: Number(updated.progress)
  });

  res.json({ message: 'Student updated', data: getStudent(req.params.id) });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lecturer Dashboard running at http://localhost:${PORT}`);
  console.log(`Persistent database: ${databasePath}`);
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
