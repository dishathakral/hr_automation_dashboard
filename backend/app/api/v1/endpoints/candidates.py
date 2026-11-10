from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.models.entities import Candidate, Application, Job, Resume, CallLog, Interview, AuditLog, User
from app.schemas import CandidateResponse, ResumeResponse
from app.services.ingestion_service import extract_skills_from_text

router = APIRouter()

@router.get("", response_model=List[CandidateResponse])
@router.get("/", response_model=List[CandidateResponse], include_in_schema=False)
def list_candidates(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Candidate)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            Candidate.full_name.ilike(search_fmt) |
            Candidate.email.ilike(search_fmt) |
            Candidate.phone_normalized.ilike(search_fmt) |
            Candidate.current_city.ilike(search_fmt)
        )
    return query.order_by(Candidate.created_at.desc()).all()

@router.get("/{id}", response_model=CandidateResponse)
def get_candidate_by_id(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cand = db.query(Candidate).filter(Candidate.id == id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    return cand

@router.get("/{id}/history")
def get_candidate_application_history(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns candidate's full application history across all jobs applied for.
    """
    cand = db.query(Candidate).filter(Candidate.id == id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    apps = db.query(Application).filter(Application.candidate_id == id).order_by(Application.applied_at.desc()).all()
    history = []
    for app in apps:
        job = app.job
        screen = app.screening_result
        history.append({
            "application_id": app.id,
            "job_id": app.job_id,
            "job_title": job.title if job else "N/A",
            "department": job.department if job else "N/A",
            "source": app.source,
            "category": app.category,
            "category_reason": app.category_reason,
            "stage": app.stage,
            "applied_at": app.applied_at,
            "suitability_score": screen.suitability_score if screen else None,
            "ai_status": screen.ai_recommended_status if screen else None
        })
    return {
        "candidate_id": cand.id,
        "candidate_name": cand.full_name,
        "total_applications": len(history),
        "applications": history
    }

@router.get("/{id}/timeline")
def get_candidate_activity_timeline(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aggregates all chronological events: intake, screening, phone calls, interview bookings, and audit records.
    """
    cand = db.query(Candidate).filter(Candidate.id == id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    events = []

    # 1. Candidate Creation Event
    events.append({
        "event_type": "PROFILE_CREATED",
        "title": "Candidate Profile Registered",
        "description": f"Added via system intake ({cand.phone_normalized})",
        "timestamp": cand.created_at,
        "badge_color": "blue"
    })

    # 2. Applications
    apps = db.query(Application).filter(Application.candidate_id == id).all()
    app_ids = [a.id for a in apps]

    for app in apps:
        events.append({
            "event_type": "APPLICATION_SUBMITTED",
            "title": f"Applied to {app.job.title if app.job else 'Position'}",
            "description": f"Categorised as {app.category.replace('_', ' ').title()}: {app.category_reason}",
            "timestamp": app.applied_at,
            "badge_color": "indigo"
        })

        if app.screening_result:
            sr = app.screening_result
            events.append({
                "event_type": "AI_SCREENED",
                "title": f"AI Evaluation Completed (Score: {sr.suitability_score}/100)",
                "description": f"Recommendation: {sr.ai_recommended_status}. Engine: {sr.engine_used}",
                "timestamp": sr.screened_at,
                "badge_color": "green" if sr.suitability_score >= 75 else "amber"
            })

    # 3. Call Logs
    calls = db.query(CallLog).filter(CallLog.application_id.in_(app_ids)).all() if app_ids else []
    for call in calls:
        events.append({
            "event_type": "TELEPHONY_OUTREACH",
            "title": f"Screening Call Attempt: {call.outcome.replace('_', ' ').title()}",
            "description": f"Duration: {call.duration_seconds}s. Provider: {call.provider_mode}. Step reached: {call.simulation_step_reached}",
            "timestamp": call.call_timestamp,
            "badge_color": "purple" if "INTERESTED" in call.outcome else "rose"
        })

    # 4. Interviews
    interviews = db.query(Interview).filter(Interview.application_id.in_(app_ids)).all() if app_ids else []
    for intv in interviews:
        events.append({
            "event_type": "INTERVIEW_LOGISTICS",
            "title": f"Interview Scheduled ({intv.interview_mode.replace('_', ' ').title()})",
            "description": f"With {intv.interviewer_name} at {intv.scheduled_at.strftime('%d %b %Y, %I:%M %p')}. Status: {intv.confirmation_status}",
            "timestamp": intv.created_at,
            "badge_color": "emerald"
        })

    # Sort descending by timestamp
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return {
        "candidate_id": cand.id,
        "candidate_name": cand.full_name,
        "events": events
    }

@router.post("/{id}/resumes", response_model=ResumeResponse)
async def upload_candidate_resume(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    cand = db.query(Candidate).filter(Candidate.id == id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    contents = await file.read()
    raw_text = contents.decode("utf-8", errors="ignore")
    extracted = extract_skills_from_text(raw_text, cand.skills or [])
    cand.skills = extracted
    if not raw_text.strip():
        raw_text = f"Resume document uploaded ({file.filename}). Extracted skills: {', '.join(extracted)}"

    resume = Resume(
        candidate_id=cand.id,
        file_name=file.filename or f"{cand.full_name}_Resume.pdf",
        file_size_bytes=len(contents),
        mime_type=file.content_type or "application/pdf",
        storage_path=f"/resumes/{cand.id}_{file.filename}",
        parsed_text=raw_text,
        extracted_skills=extracted,
        extracted_experience=[{"tenure": cand.total_experience_years}]
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume

@router.get("/{id}/resumes", response_model=List[ResumeResponse])
def list_candidate_resumes(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Resume).filter(Resume.candidate_id == id).order_by(Resume.uploaded_at.desc()).all()

