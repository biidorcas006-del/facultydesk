# Real-event notifications

Notifications are stored permanently in the SQLite `notifications` table and are scoped to the authenticated lecturer.

## Events that generate notifications

The backend creates a notification when the lecturer:

- Saves or updates a grade
- Saves or updates attendance
- Creates an assessment
- Uploads a course material

Each notification includes a type, title, message, optional link, read state, and timestamp.

## API routes

```text
GET    /api/notifications
PATCH  /api/notifications/:id/read
POST   /api/notifications/read-all
DELETE /api/notifications/:id
```

`GET /api/notifications` returns the latest 50 notifications and an `unread` count.

Example response:

```json
{
  "unread": 1,
  "data": [
    {
      "id": 1,
      "type": "assessment",
      "title": "Assessment created",
      "message": "Trees checkpoint was saved for CS204.",
      "link": "/assessments",
      "isRead": 0,
      "createdAt": "2026-11-07 13:58:00"
    }
  ]
}
```
