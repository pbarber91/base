{
  "name": "Church",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Church name"
    },
    "description": {
      "type": "string",
      "description": "About the church"
    },
    "logo_url": {
      "type": "string",
      "description": "Church logo image URL"
    },
    "cover_image_url": {
      "type": "string",
      "description": "Cover/banner image"
    },
    "location": {
      "type": "string",
      "description": "City, State"
    },
    "website": {
      "type": "string"
    },
    "admin_emails": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Emails of church admins"
    }
  },
  "required": [
    "name"
  ]
}