{
  "name": "StudyProgress",
  "type": "object",
  "properties": {
    "user_email": {
      "type": "string"
    },
    "study_id": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "not_started",
        "in_progress",
        "completed"
      ],
      "default": "not_started"
    },
    "current_section_index": {
      "type": "number",
      "default": 0
    },
    "completed_sections": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of completed sections"
    },
    "journal_entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "section_id": {
            "type": "string"
          },
          "content": {
            "type": "string"
          },
          "created_at": {
            "type": "string"
          }
        }
      }
    },
    "started_at": {
      "type": "string",
      "format": "date-time"
    },
    "completed_at": {
      "type": "string",
      "format": "date-time"
    },
    "group_id": {
      "type": "string",
      "description": "If taking with a study group"
    }
  },
  "required": [
    "user_email",
    "study_id"
  ]
}