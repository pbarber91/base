{
  "name": "ScriptureStudy",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Study title"
    },
    "description": {
      "type": "string",
      "description": "Brief overview of the study"
    },
    "scripture_reference": {
      "type": "string",
      "description": "e.g., John 3:1-21"
    },
    "book": {
      "type": "string",
      "description": "Bible book"
    },
    "cover_image_url": {
      "type": "string"
    },
    "difficulty": {
      "type": "string",
      "enum": [
        "beginner",
        "intermediate",
        "advanced"
      ]
    },
    "estimated_minutes": {
      "type": "number",
      "description": "Estimated time to complete"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Topics like grace, faith, salvation"
    },
    "scripture_text": {
      "type": "string",
      "description": "The full scripture passage text"
    },
    "prayer_prompt": {
      "type": "string",
      "description": "Optional prayer guidance before study"
    },
    "external_resources": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "url": {
            "type": "string"
          },
          "description": {
            "type": "string"
          }
        }
      },
      "description": "Curated list of Bible study tools"
    },
    "is_published": {
      "type": "boolean",
      "default": false
    },
    "participants_count": {
      "type": "number",
      "default": 0
    }
  },
  "required": [
    "title",
    "scripture_reference",
    "difficulty"
  ]
}