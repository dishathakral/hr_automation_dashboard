export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'HR_ADMIN' | 'HIRING_MANAGER';
  is_active: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  location: string;
  work_model: 'ON_SITE' | 'HYBRID' | 'REMOTE';
  experience_level: string;
  salary_min: number;
  salary_max: number;
  currency: string;
  job_description: string;
  required_skills: string[];
  preferred_skills: string[];
  screening_weights: {
    skills: number;
    experience: number;
    education: number;
    logistics: number;
  };
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  is_demo: boolean;
  indeed_reference_id: string;
  indeed_post_url?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
  applicant_count: number;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone_raw: string;
  phone_normalized: string;
  current_city: string;
  current_title?: string;
  total_experience_years: number;
  highest_education: string;
  skills: string[];
  is_duplicate: boolean;
  original_candidate_id?: string;
  created_at: string;
}

export type CandidateCategory = 
  | 'RELEVANT_SUITABLE'
  | 'PARTIALLY_RELEVANT'
  | 'NOT_RELEVANT'
  | 'EXPERIENCED'
  | 'FRESHER'
  | 'INCOMPLETE_PROFILE';

export type ApplicationStage = 
  | 'APPLIED'
  | 'SCREENED'
  | 'CALLED'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFERED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  resume_id?: string;
  source: string;
  category: CandidateCategory;
  category_reason: string;
  stage: ApplicationStage;
  applied_at: string;
  candidate: Candidate;
  job_title?: string;
  suitability_score?: number;
  screening_status?: 'SHORTLISTED' | 'ON_HOLD' | 'NOT_SHORTLISTED';
  hr_final_status?: 'SHORTLISTED' | 'ON_HOLD' | 'NOT_SHORTLISTED';
  is_override?: boolean;
  override_reason?: string;
  call_outcome?: string;
  interview_status?: string;
}

export interface ScreeningResult {
  id: string;
  application_id: string;
  suitability_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  logistics_score: number;
  matching_strengths: string[];
  missing_skills: string[];
  potential_concerns: string[];
  suggested_interview_questions: string[];
  clear_explanation: string;
  ai_recommended_status: 'SHORTLISTED' | 'ON_HOLD' | 'NOT_SHORTLISTED';
  engine_used: 'GEMINI_API' | 'LOCAL_HEURISTIC';
  is_external_api: boolean;
  screened_at: string;
  hr_final_status?: 'SHORTLISTED' | 'ON_HOLD' | 'NOT_SHORTLISTED';
  is_override?: boolean;
  override_reason?: string;
  decided_at?: string;
}

export interface CallLog {
  id: string;
  application_id: string;
  phone_number: string;
  provider_mode: string;
  call_timestamp: string;
  duration_seconds: number;
  outcome: 'ANSWERED_INTERESTED' | 'ANSWERED_NOT_INTERESTED' | 'CALLBACK_REQUESTED' | 'OPTED_OUT' | 'NO_ANSWER' | 'BUSY' | 'INVALID_NUMBER';
  consent_granted: boolean;
  opt_out_requested: boolean;
  callback_requested: boolean;
  call_transcript: Array<{
    step?: number;
    step_title?: string;
    prompt?: string;
    candidate_action?: string;
    timestamp?: string;
    error?: string;
  }>;
  simulation_step_reached: string;
}

export interface Interview {
  id: string;
  application_id: string;
  interviewer_name: string;
  interviewer_email: string;
  scheduled_at: string;
  duration_minutes: number;
  interview_mode: 'GOOGLE_MEET' | 'ZOOM' | 'MS_TEAMS' | 'IN_PERSON';
  meeting_link_or_venue: string;
  confirmation_status: 'SCHEDULED' | 'CONFIRMATION_PENDING' | 'RESCHEDULED' | 'NO_RESPONSE' | 'DECLINED' | 'COMPLETED';
  special_instructions?: string;
  ics_uid: string;
  candidate_name?: string;
  job_title?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  application_id?: string;
  candidate_id: string;
  channel: 'EMAIL' | 'SMS';
  notification_type: string;
  recipient_target: string;
  subject?: string;
  body_text: string;
  delivery_status: 'SIMULATED_SENT' | 'DELIVERED' | 'FAILED';
  sent_at: string;
}

export interface AuditLog {
  id: string;
  actor_email: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, any>;
  rationale?: string;
  timestamp: string;
}

export interface KPIOverview {
  active_jobs_count: number;
  total_applications_count: number;
  category_counts: Record<CandidateCategory, number>;
  shortlisted_count: number;
  calls_completed_count: number;
  interested_candidates_count: number;
  interviews_scheduled_count: number;
  conversion_rate_percentage: number;
  contact_rate_percentage: number;
  funnel: Record<string, number>;
}

export interface ConsentRecord {
  id: string;
  candidate_id: string;
  phone_normalized: string;
  consent_channel: string;
  consent_status: 'CONSENT_GRANTED' | 'OPTED_OUT' | 'EXPIRED';
  terms_version: string;
  opt_out_timestamp?: string;
  opt_out_reason?: string;
  recorded_at: string;
}

export interface SystemSettings {
  ai_provider: string;
  allow_external_ai_processing: boolean;
  gemini_model: string;
  gemini_api_key_configured: boolean;
  gemini_temperature: number;
  calling_window_start_hour: number;
  calling_window_end_hour: number;
  calling_timezone: string;
  max_calls_per_24_hours: number;
  min_cooldown_hours: number;
  simulation_mode: boolean;
  bulk_calls_enabled: boolean;
  exotel_configured: boolean;
}

