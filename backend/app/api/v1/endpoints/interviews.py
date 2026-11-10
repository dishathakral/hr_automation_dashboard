import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.models.entities import Interview, Application, Candidate, Job, Notification, AuditLog, User
from app.schemas import InterviewCreate, InterviewStatusUpdate, InterviewResponse
from app.services.interview_service import (
    check_interviewer_availability,
    generate_meeting_link,
    generate_ics_calendar_content,
    normalize_utc_naive,
)

router = APIRouter()

def serialize_interview(intv: Interview) -> dict:
    app = intv.application
    cand = app.candidate if app else None
    job = app.job if app else None

    return {
        "id": intv.id,
        "application_id": intv.application_id,
        "interviewer_name": intv.interviewer_name,
        "interviewer_email": intv.interviewer_email,
        "scheduled_at": intv.scheduled_at,
        "duration_minutes": intv.duration_minutes,
        "interview_mode": intv.interview_mode,
        "meeting_link_or_venue": intv.meeting_link_or_venue,
        "confirmation_status": intv.confirmation_status,
        "special_instructions": intv.special_instructions,
        "ics_uid": intv.ics_uid,
        "candidate_name": cand.full_name if cand else "Candidate",
        "job_title": job.title if job else "Position",
        "created_at": intv.created_at
    }

@router.get("", response_model=List[InterviewResponse])
@router.get("/", response_model=List[InterviewResponse], include_in_schema=False)
def list_interviews(
    confirmation_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Interview)
    if confirmation_status:
        query = query.filter(Interview.confirmation_status == confirmation_status.upper())
    interviews = query.order_by(Interview.scheduled_at.asc()).all()
    return [serialize_interview(i) for i in interviews]

@router.get("/availability")
def check_availability(
    interviewer_name: str,
    scheduled_at: datetime,
    duration_minutes: int = 45,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    available, reason, collision = check_interviewer_availability(
        db=db,
        interviewer_name=interviewer_name,
        scheduled_at=scheduled_at,
        duration_minutes=duration_minutes
    )
    return {
        "is_available": available,
        "conflict_reason": reason,
        "collision_details": collision
    }

@router.get("/interviewer-slots")
def get_interviewer_slots(
    interviewer_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns booked time slots grouped by interviewer to visualize availability."""
    query = db.query(Interview).filter(Interview.confirmation_status != "DECLINED")
    if interviewer_name:
        query = query.filter(Interview.interviewer_name == interviewer_name)
    booked = query.order_by(Interview.scheduled_at.asc()).all()
    return [
        {
            "interview_id": i.id,
            "interviewer_name": i.interviewer_name,
            "scheduled_at": i.scheduled_at,
            "duration_minutes": i.duration_minutes,
            "candidate_name": i.application.candidate.full_name if i.application and i.application.candidate else "Candidate",
            "confirmation_status": i.confirmation_status,
        }
        for i in booked
    ]

@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def schedule_interview(
    intv_in: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    app = db.query(Application).filter(Application.id == intv_in.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    cand = app.candidate
    job = app.job
    normalized_dt = normalize_utc_naive(intv_in.scheduled_at)

    # Check interviewer availability
    available, reason, collision = check_interviewer_availability(
        db=db,
        interviewer_name=intv_in.interviewer_name,
        scheduled_at=normalized_dt,
        duration_minutes=intv_in.duration_minutes
    )
    if not available:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=reason)

    # Generate meeting link or venue
    link_or_venue = intv_in.meeting_link_or_venue
    if not link_or_venue:
        link_or_venue = generate_meeting_link(intv_in.interview_mode, cand.full_name, job.title)

    ics_uid = f"interview-{uuid.uuid4().hex}@recruitment.internal"

    interview = Interview(
        application_id=app.id,
        interviewer_name=intv_in.interviewer_name,
        interviewer_email=intv_in.interviewer_email,
        scheduled_at=normalized_dt,
        duration_minutes=intv_in.duration_minutes,
        interview_mode=intv_in.interview_mode,
        meeting_link_or_venue=link_or_venue,
        confirmation_status="SCHEDULED",
        special_instructions=intv_in.special_instructions,
        ics_uid=ics_uid
    )
    db.add(interview)
    db.flush()

    # Update application stage to INTERVIEW_SCHEDULED
    app.stage = "INTERVIEW_SCHEDULED"

    # Simulated Email Notification
    notif_email = Notification(
        application_id=app.id,
        candidate_id=cand.id,
        channel="EMAIL",
        notification_type="INTERVIEW_INVITE",
        recipient_target=cand.email,
        subject=f"Interview Confirmation: {job.title} at Antigravity",
        body_text=f"Dear {cand.full_name},\n\nWe are pleased to invite you for your technical round for {job.title}.\nDate & Time: {intv_in.scheduled_at.strftime('%d %b %Y at %I:%M %p')}\nMode: {intv_in.interview_mode}\nLink: {link_or_venue}\nInterviewer: {intv_in.interviewer_name}\n\nPlease acknowledge receipt.",
        delivery_status="SIMULATED_SENT"
    )
    db.add(notif_email)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="INTERVIEW",
        entity_id=interview.id,
        action="CREATE",
        changes={"scheduled_at": intv_in.scheduled_at.isoformat(), "interviewer": intv_in.interviewer_name, "mode": intv_in.interview_mode},
        rationale=f"Interview scheduled for candidate {cand.full_name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(interview)

    return serialize_interview(interview)

@router.patch("/{id}/status")
def update_interview_status(
    id: str,
    payload: InterviewStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interview = db.query(Interview).filter(Interview.id == id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    old_status = interview.confirmation_status
    interview.confirmation_status = payload.confirmation_status.upper()
    interview.updated_at = datetime.utcnow()

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="INTERVIEW",
        entity_id=interview.id,
        action="UPDATE",
        changes={"old_status": old_status, "new_status": interview.confirmation_status},
        rationale=payload.notes or f"Interview status changed to {interview.confirmation_status}"
    )
    db.add(audit)
    db.commit()

    return {"message": "Status updated successfully", "confirmation_status": interview.confirmation_status}

@router.get("/{id}/ics")
def download_interview_ics(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates and downloads a universal RFC 5545 iCalendar (.ics) invite file.
    """
    interview = db.query(Interview).filter(Interview.id == id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    app = interview.application
    cand = app.candidate if app else None
    job = app.job if app else None

    title = f"Interview: {cand.full_name if cand else 'Candidate'} - {job.title if job else 'Position'}"
    description = f"Recruitment interview round for {job.title if job else 'the role'}.\\nCandidate: {cand.full_name if cand else 'N/A'}\\nMode: {interview.interview_mode}\\nMeeting Details: {interview.meeting_link_or_venue}"
    
    ics_text = generate_ics_calendar_content(
        ics_uid=interview.ics_uid,
        title=title,
        description=description,
        location_or_url=interview.meeting_link_or_venue,
        start_time=interview.scheduled_at,
        duration_minutes=interview.duration_minutes,
        organizer_email=interview.interviewer_email,
        attendee_email=cand.email if cand else "candidate@talent.com"
    )

    filename = f"interview_{cand.full_name.replace(' ', '_') if cand else 'invite'}.ics"
    return Response(
        content=ics_text,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

