import uuid
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import Interview


def normalize_utc_naive(dt: datetime) -> datetime:
    """Normalizes aware or naive datetimes to naive UTC for consistent DB comparison."""
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def check_interviewer_availability(
    db: Session,
    interviewer_name: str,
    scheduled_at: datetime,
    duration_minutes: int,
    exclude_interview_id: Optional[str] = None
) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Checks for schedule collisions:
    Overlap iff (start_A < end_B) and (end_A > start_B)
    """
    new_start = normalize_utc_naive(scheduled_at)
    new_end = new_start + timedelta(minutes=duration_minutes)

    query = db.query(Interview).filter(
        Interview.interviewer_name == interviewer_name,
        Interview.confirmation_status.notin_(["DECLINED"])
    )
    if exclude_interview_id:
        query = query.filter(Interview.id != exclude_interview_id)

    existing_interviews = query.all()
    for existing in existing_interviews:
        existing_start = normalize_utc_naive(existing.scheduled_at)
        existing_end = existing_start + timedelta(minutes=existing.duration_minutes)

        if new_start < existing_end and new_end > existing_start:
            collision_info = {
                "conflicting_interview_id": existing.id,
                "scheduled_at": existing_start.isoformat(),
                "duration_minutes": existing.duration_minutes,
                "mode": existing.interview_mode,
            }
            return False, f"Schedule Collision: Interviewer '{interviewer_name}' already has an interview scheduled from {existing_start.strftime('%I:%M %p')} to {existing_end.strftime('%I:%M %p')}.", collision_info

    return True, None, None

def generate_meeting_link(mode: str, candidate_name: str, job_title: str) -> str:
    """
    Returns an explicit simulated placeholder for online meetings unless a live link
    was provided by the recruiter, or a standard venue string for in-person rounds.
    Never fabricates fake external Google Meet, Zoom, or MS Teams URLs.
    """
    if mode == "GOOGLE_MEET":
        return f"[SIMULATED PLACEHOLDER] Google Meet link pending live creation ({candidate_name})"
    elif mode == "ZOOM":
        return f"[SIMULATED PLACEHOLDER] Zoom link pending live creation ({candidate_name})"
    elif mode == "MS_TEAMS":
        return f"[SIMULATED PLACEHOLDER] MS Teams link pending live creation ({candidate_name})"
    else:  # IN_PERSON
        return "Office HQ (Demo Venue) - Tech Park 4, 3rd Floor, Outer Ring Road, Bangalore"

def generate_ics_calendar_content(
    ics_uid: str,
    title: str,
    description: str,
    location_or_url: str,
    start_time: datetime,
    duration_minutes: int,
    organizer_email: str = "hr@recruitment.internal",
    attendee_email: str = "candidate@talent.com"
) -> str:
    """
    Generates an RFC 5545 compliant iCalendar (.ics) string.
    Compatible with Google Calendar, Outlook, and Apple Calendar.
    """
    end_time = start_time + timedelta(minutes=duration_minutes)
    
    def format_ics_dt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")

    now_str = format_ics_dt(datetime.utcnow())
    start_str = format_ics_dt(start_time)
    end_str = format_ics_dt(end_time)

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Antigravity HR Recruitment System//Recruitment Automation v1.0//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{ics_uid}
DTSTAMP:{now_str}
DTSTART:{start_str}
DTEND:{end_str}
SUMMARY:{title}
DESCRIPTION:{description.replace('\\n', ' ')}
LOCATION:{location_or_url}
ORGANIZER;CN=HR Recruiting Team:mailto:{organizer_email}
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{attendee_email}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Interview Reminder: {title}
END:VALARM
END:VEVENT
END:VCALENDAR"""
    return ics_content.strip()

