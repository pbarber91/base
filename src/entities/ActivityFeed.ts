{
  "name": "ActivityFeed",
  "type": "object",
  "properties": {
    "user_email": {
      "type": "string",
      "description": "User who performed the action"
    },
    "user_name": {
      "type": "string"
    },
    "user_avatar": {
      "type": "string"
    },
    "activity_type": {
      "type": "string",
      "enum": [
        "started_study",
        "completed_study",
        "enrolled_course",
        "completed_course",
        "completed_session",
        "joined_group",
        "discussion_post",
        "milestone"
      ],
      "description": "Type of activity"
    },
    "title": {
      "type": "string",
      "description": "Activity headline"
    },
    "description": {
      "type": "string"
    },
    "related_id": {
      "type": "string",
      "description": "ID of related entity"
    },
    "related_type": {
      "type": "string",
      "enum": [
        "study",
        "course",
        "session",
        "group"
      ]
    },
    "church_id": {
      "type": "string"
    },
    "visibility": {
      "type": "string",
      "enum": [
        "public",
        "church",
        "followers",
        "private"
      ],
      "default": "public"
    }
  },
  "required": [
    "user_email",
    "activity_type",
    "title"
  ]
}