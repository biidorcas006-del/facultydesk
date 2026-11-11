# Assessments and course materials

The backend now stores assessments in SQLite and stores uploaded course files on disk.

## Assessments

SQLite table:

```text
assessments
```

Routes:

```text
GET    /api/assessments
POST   /api/assessments
PUT    /api/assessments/:id
DELETE /api/assessments/:id
```

Assessment statuses are `Draft`, `Open`, and `Closed`.

Example:

```json
{
  "id": "trees-checkpoint",
  "title": "Trees checkpoint",
  "courseCode": "CS204",
  "description": "Short assessment",
  "dueDate": "2026-11-20",
  "maxScore": 20,
  "status": "Open"
}
```

## Course materials

Uploaded files are stored in:

```text
storage/course-materials/
```

File metadata is stored in the SQLite table:

```text
course_materials
```

Routes:

```text
GET    /api/materials
POST   /api/materials
GET    /api/materials/:id/download
DELETE /api/materials/:id
```

Upload with `multipart/form-data` using the field name `file`:

```bash
curl -b cookies.txt \
  -F "title=Week 4 notes" \
  -F "courseCode=CS204" \
  -F "description=Lecture notes" \
  -F "file=@week-4-notes.pdf" \
  http://localhost:3000/api/materials
```

The current upload limit is 10 MB. Supported types include PDF, Word, PowerPoint, Excel, plain text, PNG, and JPEG files. All content routes require lecturer authentication.
