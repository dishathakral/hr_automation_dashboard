from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# ----------------- AUTH SCHEMAS -----------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str
    email: str

class LoginRequest(BaseModel):
    email: str
    password: str

class DemoLoginRequest(BaseModel):
    role: str = "HR_ADMIN"  # "HR_ADMIN" or "HIRING_MANAGER"

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- JOB SCHEMAS -----------------
class ScreeningWeights(BaseModel):
    skills: int = 40
    experience: int = 30
    education: int = 15
    logistics: int = 15

class JobBase(BaseModel):
    title: str
    department: str
    employment_type: str = "FULL_TIME"
    location: str
    work_model: str = "HYBRID"
    experience_level: str
    salary_min: int
    salary_max: int
    currency: str = "INR"
    job_description: str
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    screening_weights: Dict[str, int] = {"skills": 40, "experience": 30, "education": 15, "logistics": 15}
    status: str = "ACTIVE"
    is_demo: bool = True
    indeed_reference_id: str
    indeed_post_url: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    work_model: Optional[str] = None
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    job_description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    screening_weights: Optional[Dict[str, int]] = None
    status: Optional[str] = None
    is_demo: Optional[bool] = None
    indeed_reference_id: Optional[str] = None
    indeed_post_url: Optional[str] = None

class JobResponse(JobBase):
    id: str
    posted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    applicant_count: int = 0

    model_config = ConfigDict(from_attributes=True)

# ----------------- CANDIDATE & RESUME SCHEMAS -----------------
class CandidateBase(BaseModel):
    full_name: str
    email: str
    phone_raw: str
    current_city: str
    current_title: Optional[str] = None
    total_experience_years: float = 0.0
    highest_education: str
    skills: List[str] = []

class CandidateCreate(CandidateBase):
    job_id: Optional[str] = None
    resume_text: Optional[str] = None

class CandidateResponse(CandidateBase):
    id: str
    phone_normalized: str
    is_duplicate: bool = False
    original_candidate_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ResumeResponse(BaseModel):
    id: str
    candidate_id: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    parsed_text: str
    extracted_skills: List[str]
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- APPLICATION SCHEMAS -----------------
class ApplicationResponse(BaseModel):
    id: str
    candidate_id: str
    job_id: str
    resume_id: Optional[str] = None
    source: str
    category: str
    category_reason: str
    stage: str
    applied_at: datetime
    candidate: CandidateResponse
    job_title: Optional[str] = None
    suitability_score: Optional[int] = None
    screening_status: Optional[str] = None
    hr_final_status: Optional[str] = None
    is_override: bool = False
    override_reason: Optional[str] = None
    call_outcome: Optional[str] = None
    interview_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ApplicationCategoryUpdate(BaseModel):
    category: str
    category_reason: str

# ----------------- AI SCREENING SCHEMAS -----------------
class ScreeningResultResponse(BaseModel):
    id: str
    application_id: str
    suitability_score: int
    skills_score: int
    experience_score: int
    education_score: int
    logistics_score: int
    matching_strengths: List[str]
    missing_skills: List[str]
    potential_concerns: List[str]
    suggested_interview_questions: List[str]
    clear_explanation: str
    ai_recommended_status: str
    engine_used: str
    is_external_api: bool
    screened_at: datetime
    hr_final_status: Optional[str] = None
    is_override: bool = False
    override_reason: Optional[str] = None
    decided_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class HROverrideRequest(BaseModel):
    application_id: str
    final_decision: str  # SHORTLISTED, ON_HOLD, NOT_SHORTLISTED
    override_reason: Optional[str] = None
    decision_notes: Optional[str] = None

# ----------------- CALLING & TELEPHONY SCHEMAS -----------------
class PhoneValidationRequest(BaseModel):
    phone_number: str

class PhoneValidationResponse(BaseModel):
    raw_number: str
    normalized_number: Optional[str] = None
    is_valid_indian_mobile: bool
    carrier_circle: Optional[str] = None
    error_message: Optional[str] = None

class CallSimulationStepRequest(BaseModel):
    application_id: str
    step: int = 1  # 1: Consent, 2: Availability, 3: Interest
    candidate_action: str  # "PRESS_1", "PRESS_2", "PRESS_9", "NO_ANSWER", "BUSY"
    allow_outside_hours_simulation: bool = False
    transcript_history: List[Dict[str, Any]] = []

class CallSimulationResponse(BaseModel):
    application_id: str
    phone_number: str
    step: int
    audio_prompt_text: str
    candidate_response_recorded: str
    is_call_ended: bool
    final_outcome: Optional[str] = None
    duration_seconds: int
    transcript: List[Dict[str, Any]]
    opt_out_triggered: bool

class CallLogResponse(BaseModel):
    id: str
    application_id: str
    phone_number: str
    provider_mode: str
    call_timestamp: datetime
    duration_seconds: int
    outcome: str
    consent_granted: bool
    opt_out_requested: bool
    callback_requested: bool
    call_transcript: List[Dict[str, Any]]
    simulation_step_reached: str

    model_config = ConfigDict(from_attributes=True)

# ----------------- CONSENT SCHEMAS -----------------
class ConsentRecordResponse(BaseModel):
    id: str
    candidate_id: str
    phone_normalized: str
    consent_channel: str
    consent_status: str
    terms_version: str
    opt_out_timestamp: Optional[datetime] = None
    opt_out_reason: Optional[str] = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConsentRecordCreate(BaseModel):
    candidate_id: Optional[str] = None
    phone_number: str
    consent_channel: str = "APPLICATION_FORM"
    terms_version: str = "v1.0-2026"

class OptOutRequest(BaseModel):
    phone_number: str
    reason: Optional[str] = "Candidate requested opt-out via recruitment portal"

# ----------------- INTERVIEW SCHEMAS -----------------
class InterviewCreate(BaseModel):
    application_id: str
    interviewer_name: str
    interviewer_email: str
    scheduled_at: datetime
    duration_minutes: int = 45
    interview_mode: str = "GOOGLE_MEET"
    meeting_link_or_venue: Optional[str] = None
    special_instructions: Optional[str] = None

class InterviewStatusUpdate(BaseModel):
    confirmation_status: str  # SCHEDULED, CONFIRMATION_PENDING, RESCHEDULED, NO_RESPONSE, DECLINED, COMPLETED
    notes: Optional[str] = None

class InterviewResponse(BaseModel):
    id: str
    application_id: str
    interviewer_name: str
    interviewer_email: str
    scheduled_at: datetime
    duration_minutes: int
    interview_mode: str
    meeting_link_or_venue: str
    confirmation_status: str
    special_instructions: Optional[str] = None
    ics_uid: str
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- NOTIFICATION & AUDIT SCHEMAS -----------------
class NotificationResponse(BaseModel):
    id: str
    application_id: Optional[str] = None
    candidate_id: str
    channel: str
    notification_type: str
    recipient_target: str
    subject: Optional[str] = None
    body_text: str
    delivery_status: str
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogResponse(BaseModel):
    id: str
    actor_email: str
    entity_type: str
    entity_id: str
    action: str
    changes: Dict[str, Any]
    rationale: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- REPORTS & KPIS -----------------
class KPIOverviewResponse(BaseModel):
    active_jobs_count: int
    total_applications_count: int
    category_counts: Dict[str, int]
    shortlisted_count: int
    calls_completed_count: int
    interested_candidates_count: int
    interviews_scheduled_count: int
    conversion_rate_percentage: float
    contact_rate_percentage: float
    funnel: Dict[str, int]

# ----------------- GOVERNANCE & SETTINGS -----------------
class SystemSettingsResponse(BaseModel):
    ai_provider: str
    allow_external_ai_processing: bool
    gemini_model: str
    gemini_api_key_configured: bool
    gemini_temperature: float
    calling_window_start_hour: int
    calling_window_end_hour: int
    calling_timezone: str
    max_calls_per_24_hours: int
    min_cooldown_hours: int
    simulation_mode: bool
    bulk_calls_enabled: bool
    exotel_configured: bool

class SystemSettingsUpdate(BaseModel):
    ai_provider: Optional[str] = None
    allow_external_ai_processing: Optional[bool] = None
    gemini_model: Optional[str] = None
    gemini_temperature: Optional[float] = None
    calling_window_start_hour: Optional[int] = None
    calling_window_end_hour: Optional[int] = None
    max_calls_per_24_hours: Optional[int] = None
    min_cooldown_hours: Optional[int] = None
