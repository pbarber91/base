{
  "name": "CourseSession",
  "type": "object",
  "properties": {
    "course_id": {
      "type": "string"
    },
    "order": {
      "type": "number",
      "description": "Session order in course"
    },
    "title": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "content_blocks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": [
              "text",
              "video",
              "scripture",
              "image",
              "quote",
              "discussion_question",
              "assignment",
              "resource_link"
            ]
          },
          "content": {
            "type": "string"
          },
          "video_url": {
            "type": "string"
          },
          "image_url": {
            "type": "string"
          },
          "scripture_ref": {
            "type": "string"
          },
          "attribution": {
            "type": "string"
          }
        }
      }
    },
    "scripture_references": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "estimated_minutes": {
      "type": "number"
    }
  },
  "required": [
    "course_id",
    "order",
    "title"
  ]
}