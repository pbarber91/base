{
  "name": "CourseEnrollment",
  "type": "object",
  "properties": {
    "user_email": {
      "type": "string"
    },
    "course_id": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "enrolled",
        "in_progress",
        "completed",
        "dropped"
      ],
      "default": "enrolled"
    },
    "current_session_order": {
      "type": "number",
      "default": 1
    },
    "completed_sessions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Session IDs completed"
    },
    "progress_percent": {
      "type": "number",
      "default": 0
    },
    "enrolled_at": {
      "type": "string",
      "format": "date-time"
    },
    "completed_at": {
      "type": "string",
      "format": "date-time"
    },
    "group_id": {
      "type": "string",
      "description": "Study group taking course together"
    }
  },
  "required": [
    "user_email",
    "course_id"
  ]
}