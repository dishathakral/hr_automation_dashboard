import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False, default="HR_ADMIN")  # HR_ADMIN, HIRING_MANAGER
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    hr_decisions = relationship("HRDecision", back_populates="reviewer")
    audit_logs = relationship("AuditLog", back_populates="actor")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    department = Column(String(100), nullable=False)
    employment_type = Column(String(50), nullable=False, default="FULL_TIME")  # FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP
    location = Column(String(150), nullable=False)
    work_model = Column(String(50), nullable=False, default="HYBRID")  # ON_SITE, HYBRID, REMOTE
    experience_level = Column(String(50), nullable=False)
    salary_min = Column(Integer, nullable=False)
    salary_max = Column(Integer, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    job_description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list, nullable=False)
    preferred_skills = Column(JSON, default=list, nullable=False)
    screening_weights = Column(JSON, default=lambda: {"skills": 40, "experience": 30, "education": 15, "logistics": 15}, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # DRAFT, ACTIVE, PAUSED, CLOSED
    is_demo = Column(Boolean, default=True, nullable=False)
    indeed_reference_id = Column(String(100), nullable=False)
    indeed_post_url = Column(String(500), nullable=True)
    posted_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_raw = Column(String(50), nullable=False)
    phone_normalized = Column(String(20), nullable=False, index=True)
    current_city = Column(String(100), nullable=False)
    current_title = Column(String(150), nullable=True)
    total_experience_years = Column(Float, default=0.0, nullable=False)
    highest_education = Column(String(150), nullable=False)
    skills = Column(JSON, default=list, nullable=False)
    is_duplicate = Column(Boolean, default=False, nullable=False)
    original_candidate_id = Column(String(36), ForeignKey("candidates.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")
    consent_records = relationship("ConsentRecord", back_populates="candidate", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="candidate", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    storage_path = Column(String(500), nullable=False)
    parsed_text = Column(Text, nullable=False)
    extracted_skills = Column(JSON, default=list, nullable=False)
    extracted_experience = Column(JSON, default=list, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    candidate = relationship("Candidate", back_populates="resumes")
    applications = relationship("Application", back_populates="resume")


class Application(Base):
    __tablename__ = "applications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    source = Column(String(50), default="INDEED_IMPORT", nullable=False)  # INDEED_IMPORT, MANUAL_ENTRY, SEED_DEMO
    category = Column(String(50), default="PARTIALLY_RELEVANT", nullable=False, index=True)
    # Categories: RELEVANT_SUITABLE, PARTIALLY_RELEVANT, NOT_RELEVANT, EXPERIENCED, FRESHER, INCOMPLETE_PROFILE
    category_reason = Column(Text, nullable=False)
    stage = Column(String(50), default="APPLIED", nullable=False, index=True)
    # Stages: APPLIED, SCREENED, CALLED, INTERVIEW_SCHEDULED, OFFERED, REJECTED, ARCHIVED
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("candidate_id", "job_id", name="uq_candidate_job"),
    )

    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    screening_result = relationship("ScreeningResult", back_populates="application", uselist=False, cascade="all, delete-orphan")
    hr_decisions = relationship("HRDecision", back_populates="application", cascade="all, delete-orphan")
    call_logs = relationship("CallLog", back_populates="application", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="application")


class ScreeningResult(Base):
    __tablename__ = "screening_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    suitability_score = Column(Integer, nullable=False)  # 0 to 100
    skills_score = Column(Integer, nullable=False)
    experience_score = Column(Integer, nullable=False)
    education_score = Column(Integer, nullable=False)
    logistics_score = Column(Integer, nullable=False)
    matching_strengths = Column(JSON, default=list, nullable=False)
    missing_skills = Column(JSON, default=list, nullable=False)
    potential_concerns = Column(JSON, default=list, nullable=False)
    suggested_interview_questions = Column(JSON, default=list, nullable=False)
    clear_explanation = Column(Text, nullable=False)
    ai_recommended_status = Column(String(50), nullable=False)  # SHORTLISTED, ON_HOLD, NOT_SHORTLISTED
    engine_used = Column(String(50), default="LOCAL_HEURISTIC", nullable=False)  # GEMINI_API, LOCAL_HEURISTIC
    is_external_api = Column(Boolean, default=False, nullable=False)
    screened_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    application = relationship("Application", back_populates="screening_result")


class HRDecision(Base):
    __tablename__ = "hr_decisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    final_decision = Column(String(50), nullable=False)  # SHORTLISTED, ON_HOLD, NOT_SHORTLISTED
    is_override = Column(Boolean, default=False, nullable=False)
    override_reason = Column(Text, nullable=True)
    decision_notes = Column(Text, nullable=True)
    decided_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    application = relationship("Application", back_populates="hr_decisions")
    reviewer = relationship("User", back_populates="hr_decisions")


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    phone_normalized = Column(String(20), nullable=False, index=True)
    consent_channel = Column(String(50), nullable=False)  # APPLICATION_FORM, CALL_IVR, SMS_OPTIN
    consent_status = Column(String(50), default="CONSENT_GRANTED", nullable=False)  # CONSENT_GRANTED, OPTED_OUT, EXPIRED
    terms_version = Column(String(50), default="v1.0-2026", nullable=False)
    opt_out_timestamp = Column(DateTime, nullable=True)
    opt_out_reason = Column(String(255), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    candidate = relationship("Candidate", back_populates="consent_records")


class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    caller_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    phone_number = Column(String(20), nullable=False)
    provider_mode = Column(String(50), default="SIMULATOR", nullable=False)  # SIMULATOR, EXOTEL_READY
    call_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)
    outcome = Column(String(50), nullable=False, index=True)
    # Outcomes: ANSWERED_INTERESTED, ANSWERED_NOT_INTERESTED, CALLBACK_REQUESTED, OPTED_OUT, NO_ANSWER, BUSY, INVALID_NUMBER
    consent_granted = Column(Boolean, default=False, nullable=False)
    opt_out_requested = Column(Boolean, default=False, nullable=False)
    callback_requested = Column(Boolean, default=False, nullable=False)
    call_transcript = Column(JSON, default=list, nullable=False)
    simulation_step_reached = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    application = relationship("Application", back_populates="call_logs")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    interviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    interviewer_name = Column(String(150), nullable=False)
    interviewer_email = Column(String(255), nullable=False)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, default=45, nullable=False)
    interview_mode = Column(String(50), default="GOOGLE_MEET", nullable=False)  # GOOGLE_MEET, ZOOM, MS_TEAMS, IN_PERSON
    meeting_link_or_venue = Column(String(500), nullable=False)
    confirmation_status = Column(String(50), default="SCHEDULED", nullable=False)
    # Confirmation: SCHEDULED, CONFIRMATION_PENDING, RESCHEDULED, NO_RESPONSE, DECLINED, COMPLETED
    special_instructions = Column(Text, nullable=True)
    ics_uid = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    application = relationship("Application", back_populates="interviews")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(20), nullable=False)  # EMAIL, SMS
    notification_type = Column(String(50), nullable=False)
    # Types: APPLICATION_RECEIVED, CALL_REMINDER, INTERVIEW_INVITE, INTERVIEW_RESCHEDULED, CONFIRMATION_RECEIPT
    recipient_target = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=True)
    body_text = Column(Text, nullable=False)
    delivery_status = Column(String(50), default="SIMULATED_SENT", nullable=False)  # SIMULATED_SENT, DELIVERED, FAILED
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    candidate = relationship("Candidate", back_populates="notifications")
    application = relationship("Application", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    actor_email = Column(String(255), nullable=False)
    entity_type = Column(String(50), nullable=False, index=True)  # JOB, APPLICATION, SCREENING, CALL, INTERVIEW, CONSENT
    entity_id = Column(String(36), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE, HR_OVERRIDE, SIMULATE_CALL, WITHDRAW_CONSENT, STAGE_TRANSITION
    changes = Column(JSON, default=dict, nullable=False)
    rationale = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    actor = relationship("User", back_populates="audit_logs")

