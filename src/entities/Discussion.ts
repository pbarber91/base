{
  "name": "Discussion",
  "type": "object",
  "properties": {
    "author_email": {
      "type": "string"
    },
    "author_name": {
      "type": "string"
    },
    "author_avatar": {
      "type": "string"
    },
    "content": {
      "type": "string"
    },
    "context_type": {
      "type": "string",
      "enum": [
        "study",
        "course_session",
        "group",
        "general"
      ],
      "description": "Where this discussion belongs"
    },
    "context_id": {
      "type": "string",
      "description": "ID of study, session, or group"
    },
    "parent_id": {
      "type": "string",
      "description": "For replies - ID of parent discussion"
    },
    "likes_count": {
      "type": "number",
      "default": 0
    },
    "replies_count": {
      "type": "number",
      "default": 0
    },
    "is_pinned": {
      "type": "boolean",
      "default": false
    }
  },
  "required": [
    "author_email",
    "content",
    "context_type"
  ]
}