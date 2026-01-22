{
  "name": "StudyGroup",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "cover_image_url": {
      "type": "string"
    },
    "church_id": {
      "type": "string",
      "description": "If set, this is a church group"
    },
    "leader_email": {
      "type": "string"
    },
    "member_emails": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "type": {
      "type": "string",
      "enum": [
        "scripture_study",
        "course",
        "general"
      ],
      "description": "What the group is focused on"
    },
    "linked_study_id": {
      "type": "string"
    },
    "linked_course_id": {
      "type": "string"
    },
    "visibility": {
      "type": "string",
      "enum": [
        "public",
        "church_only"
      ],
      "default": "public",
      "description": "Public = anyone can see and join. Church_only = only church members can see"
    },
    "max_members": {
      "type": "number",
      "default": 12
    }
  },
  "required": [
    "name",
    "leader_email"
  ]
}