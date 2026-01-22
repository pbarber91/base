{
  "name": "Course",
  "type": "object",
  "properties": {
    "title": {
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
      "description": "Church offering this course"
    },
    "instructor_email": {
      "type": "string"
    },
    "instructor_name": {
      "type": "string"
    },
    "category": {
      "type": "string",
      "enum": [
        "foundations",
        "bible_study",
        "theology",
        "spiritual_growth",
        "leadership",
        "family",
        "outreach",
        "other"
      ]
    },
    "difficulty": {
      "type": "string",
      "enum": [
        "beginner",
        "intermediate",
        "advanced"
      ]
    },
    "estimated_weeks": {
      "type": "number"
    },
    "is_published": {
      "type": "boolean",
      "default": false
    },
    "visibility": {
      "type": "string",
      "enum": [
        "public",
        "church_only"
      ],
      "default": "church_only",
      "description": "Public = anyone can see and enroll. Church_only = only church members"
    },
    "enrollment_count": {
      "type": "number",
      "default": 0
    },
    "sessions_count": {
      "type": "number",
      "default": 0
    }
  },
  "required": [
    "title",
    "church_id"
  ]
}