// Intent types for job queries
export type Intent = 
  | 'COUNT_JOBS'
  | 'LIST_JOBS'
  | 'MATCH_JOBS'
  | 'JOB_DETAILS'
  | 'APPLY_JOB'
  | 'GREETING'
  | 'HELP'
  | 'UNKNOWN';

// Extracted filters from user query
export interface QueryFilters {
  role: string | null;      // backend, frontend, fullstack, etc.
  tech: string | null;      // react, golang, python, etc.
  type: string | null;      // remote, onsite, hybrid
  experience: string | null; // junior, mid, senior
  jobId: string | null;     // for specific job operations
}

// Parsed query result
export interface ParsedQuery {
  intent: Intent;
  filters: QueryFilters;
  originalQuery: string;
}

// WhatsApp message types
export interface WhatsAppMessage {
  from: string;           // Phone number
  id: string;             // Message ID
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'document';
  text?: { body: string };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
      };
      field: string;
    }>;
  }>;
}

// Conversation context for multi-turn
export interface ConversationContext {
  phoneNumber: string;
  userId?: string;
  lastJobs?: Array<{ id: string; title: string }>;
  lastIntent?: Intent;
  messageCount: number;
}

// Job data from job-service
export interface Job {
  id: string;
  title: string;
  description: string;
  type: string;
  level: string;
  location: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  requiredSkills: string[];
  recruiterId: string;
}

// User skills from user-service
export interface UserSkill {
  name: string;
  score: number;
  isVerified: boolean;
}
