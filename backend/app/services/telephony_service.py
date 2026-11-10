import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Tuple, Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.entities import ConsentRecord, CallLog, Application, Candidate

# Indian Mobile Numbering Plan: 10 digits starting with 6, 7, 8, or 9
INDIAN_MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")

CARRIER_CIRCLES = {
    "9810": "Delhi NCR",
    "9811": "Delhi NCR",
    "9820": "Mumbai",
    "9821": "Mumbai",
    "9845": "Karnataka / Bangalore",
    "9844": "Karnataka / Bangalore",
    "9880": "Karnataka / Bangalore",
    "9830": "Kolkata",
    "9840": "Tamil Nadu / Chennai",
    "9841": "Tamil Nadu / Chennai",
    "9899": "Delhi NCR",
    "9711": "Delhi NCR",
    "9920": "Mumbai",
    "9819": "Mumbai",
    "9822": "Maharashtra & Goa / Pune",
    "9823": "Maharashtra & Goa / Pune",
    "9980": "Karnataka / Bangalore",
}

def validate_and_normalize_indian_phone(raw_phone: str) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
    """
    Validates and normalizes phone numbers against the Indian National Numbering Plan.
    Returns: (is_valid, normalized_e164, carrier_circle, error_message)
    """
    if not raw_phone:
        return False, None, None, "Phone number is empty"
    
    # Strip spaces, hyphens, parentheses, and dots
    cleaned = re.sub(r"[\s\-\(\)\.]", "", raw_phone)
    
    # Check and strip prefixes
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0091"):
        cleaned = cleaned[4:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    
    if len(cleaned) != 10:
        return False, None, None, f"Invalid length: Indian mobile numbers must be exactly 10 digits (got {len(cleaned)})"
    
    if not cleaned.isdigit():
        return False, None, None, "Invalid characters: Phone number must contain only digits"
    
    if not INDIAN_MOBILE_REGEX.match(cleaned):
        return False, None, None, f"Invalid prefix: Indian mobile numbers must begin with 6, 7, 8, or 9 (starts with {cleaned[0]})"
    
    normalized = f"+91{cleaned}"
    
    # Identify circle by first 4 digits
    prefix4 = cleaned[:4]
    circle = CARRIER_CIRCLES.get(prefix4, "India - National Mobile Carrier")
    
    return True, normalized, circle, None

def is_within_trai_calling_hours() -> Tuple[bool, str]:
    """
    TRAI (Telecom Regulatory Authority of India) Commercial Communications Regulations
    mandate automated/commercial outreach strictly between 10:00 AM and 06:00 PM IST.
    """
    try:
        ist_tz = ZoneInfo(settings.CALLING_TIMEZONE)
    except Exception:
        ist_tz = ZoneInfo("Asia/Kolkata")
    
    now_ist = datetime.now(ist_tz)
    current_hour = now_ist.hour
    
    start_hour = settings.CALLING_WINDOW_START_HOUR
    end_hour = settings.CALLING_WINDOW_END_HOUR
    
    within_hours = start_hour <= current_hour < end_hour
    msg = f"Current IST time is {now_ist.strftime('%I:%M %p')}. Calling window is {start_hour}:00 AM to {end_hour}:00 PM IST."
    return within_hours, msg

def check_calling_eligibility(db: Session, phone_normalized: str, application_id: str) -> Tuple[bool, Optional[str]]:
    """
    Checks consent, opt-out status, and 24-hour frequency limits.
    """
    # 1. Opt-out suppression check
    opt_out_record = db.query(ConsentRecord).filter(
        ConsentRecord.phone_normalized == phone_normalized,
        ConsentRecord.consent_status == "OPTED_OUT"
    ).first()
    
    if opt_out_record:
        return False, f"Call Blocked: Candidate has previously opted out of recruitment calls on {opt_out_record.opt_out_timestamp or opt_out_record.recorded_at}."
    
    # 2. 24-hour frequency limit check
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    recent_calls = db.query(CallLog).filter(
        CallLog.phone_number == phone_normalized,
        CallLog.call_timestamp >= twenty_four_hours_ago
    ).count()
    
    if recent_calls >= settings.MAX_CALLS_PER_24_HOURS:
        return False, f"Frequency Cap Exceeded: Maximum of {settings.MAX_CALLS_PER_24_HOURS} calls allowed per candidate per 24 hours (already attempted {recent_calls} times)."
    
    return True, None

# 3-Step Interactive Calling Script Definitions
CALLING_SCRIPTS = {
    1: {
        "title": "Step 1: Introduction & Informed Consent",
        "prompt": "Hello {candidate_name}, this is an automated screening assistant on behalf of {company_name} regarding your application for the {job_title} position. Do you consent to proceed with this brief 2-minute screening call? Press 1 to accept, Press 2 to request a callback from our HR team, or Press 9 to opt out and stop future calls.",
        "options": [
            {"action": "PRESS_1", "label": "Press 1: Grant Consent & Proceed", "next_step": 2, "terminal": False},
            {"action": "PRESS_2", "label": "Press 2: Request Human Callback", "outcome": "CALLBACK_REQUESTED", "terminal": True},
            {"action": "PRESS_9", "label": "Press 9: Opt Out / Do Not Call", "outcome": "OPTED_OUT", "terminal": True},
            {"action": "NO_ANSWER", "label": "No Answer / Ringing Timeout", "outcome": "NO_ANSWER", "terminal": True},
            {"action": "BUSY", "label": "Line Busy / Call Rejected", "outcome": "BUSY", "terminal": True},
        ]
    },
    2: {
        "title": "Step 2: Availability, Location & Work Model Fit",
        "prompt": "Thank you for confirming. Please verify: Are you currently based in {location} or open to relocating for our {work_model} work setup, and are you able to join our team within 30 days? Press 1 for Yes, or Press 2 for No.",
        "options": [
            {"action": "PRESS_1", "label": "Press 1: Available & Location Aligned", "next_step": 3, "terminal": False},
            {"action": "PRESS_2", "label": "Press 2: Not Available / Cannot Relocate", "outcome": "ANSWERED_NOT_INTERESTED", "terminal": True},
        ]
    },
    3: {
        "title": "Step 3: Interview Willingness & Next Steps",
        "prompt": "Excellent! Based on your qualifications, we would like to invite you for a 45-minute technical discussion with our hiring team this week. Are you interested in scheduling your interview? Press 1 to confirm interest, or Press 2 if you are no longer interested.",
        "options": [
            {"action": "PRESS_1", "label": "Press 1: Interested in Interview", "outcome": "ANSWERED_INTERESTED", "terminal": True},
            {"action": "PRESS_2", "label": "Press 2: Not Interested", "outcome": "ANSWERED_NOT_INTERESTED", "terminal": True},
        ]
    }
}
