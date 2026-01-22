{
  "name": "StudyResponse",
  "type": "object",
  "properties": {
    "user_email": {
      "type": "string"
    },
    "study_id": {
      "type": "string"
    },
    "genre": {
      "type": "string",
      "description": "What genre is the scripture?"
    },
    "observations": {
      "type": "string",
      "description": "What did you notice? Repeated words?"
    },
    "application": {
      "type": "string",
      "description": "How will you apply this?"
    },
    "notes": {
      "type": "string",
      "description": "General notes"
    },
    "original_audience": {
      "type": "string",
      "description": "Who was the original audience? (Intermediate+)"
    },
    "original_meaning": {
      "type": "string",
      "description": "What did it mean to them? (Intermediate+)"
    },
    "context_similarities": {
      "type": "string",
      "description": "Similar to our context? (Intermediate+)"
    },
    "context_differences": {
      "type": "string",
      "description": "Different from our context? (Intermediate+)"
    },
    "structure": {
      "type": "string",
      "description": "Structure/argument flow (Advanced)"
    },
    "themes": {
      "type": "string",
      "description": "Key themes (Advanced)"
    },
    "cross_references": {
      "type": "string",
      "description": "OT/NT cross-references (Advanced)"
    },
    "word_studies": {
      "type": "string",
      "description": "Word studies notes (Advanced)"
    },
    "commentary_notes": {
      "type": "string",
      "description": "Commentary notes / questions (Advanced)"
    },
    "completed_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "user_email",
    "study_id"
  ]
}