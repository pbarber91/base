{
  "name": "UserProfile",
  "type": "object",
  "properties": {
    "user_email": {
      "type": "string",
      "description": "User's email (links to User entity)"
    },
    "display_name": {
      "type": "string"
    },
    "avatar_url": {
      "type": "string"
    },
    "bio": {
      "type": "string",
      "description": "Short testimony or about me"
    },
    "spiritual_interests": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Topics of interest (prayer, worship, theology, etc.)"
    },
    "church_id": {
      "type": "string",
      "description": "ID of their home church"
    },
    "faith_journey_stage": {
      "type": "string",
      "enum": [
        "seeking",
        "new_believer",
        "growing",
        "mature",
        "leader"
      ],
      "description": "Where they are in their faith journey"
    },
    "visibility": {
      "type": "string",
      "enum": [
        "public",
        "church_only",
        "private"
      ],
      "default": "public"
    },
    "following": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "User emails they follow"
    },
    "followers_count": {
      "type": "number",
      "default": 0
    }
  },
  "required": [
    "user_email"
  ]
}