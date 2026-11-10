from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.models.entities import ConsentRecord, Candidate, AuditLog, User
from app.schemas import ConsentRecordResponse, ConsentRecordCreate, OptOutRequest
from app.services.telephony_service import validate_and_normalize_indian_phone

router = APIRouter()


@router.get("", response_model=List[ConsentRecordResponse])
@router.get("/", response_model=List[ConsentRecordResponse], include_in_schema=False)
def list_consent_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ConsentRecord).order_by(ConsentRecord.recorded_at.desc()).all()


@router.post("/record", response_model=ConsentRecordResponse)
def record_or_restore_consent(
    req: ConsentRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    """Records or updates explicit candidate consent for automated recruitment calls."""
    is_valid, norm_phone, circle, err = validate_and_normalize_indian_phone(req.phone_number)
    normalized = norm_phone or req.phone_number.strip()

    cand = None
    if req.candidate_id:
        cand = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()
    if not cand:
        cand = db.query(Candidate).filter(
            (Candidate.phone_normalized == normalized) | (Candidate.phone_raw == req.phone_number.strip())
        ).first()

    candidate_id = cand.id if cand else "UNREGISTERED"

    consent_record = db.query(ConsentRecord).filter(ConsentRecord.phone_normalized == normalized).first()
    if consent_record:
        consent_record.consent_status = "CONSENT_GRANTED"
        consent_record.consent_channel = req.consent_channel
        consent_record.terms_version = req.terms_version
        consent_record.opt_out_timestamp = None
        consent_record.opt_out_reason = None
        consent_record.recorded_at = datetime.utcnow()
        rec = consent_record
    else:
        rec = ConsentRecord(
            candidate_id=candidate_id,
            phone_normalized=normalized,
            consent_channel=req.consent_channel,
            consent_status="CONSENT_GRANTED",
            terms_version=req.terms_version,
        )
        db.add(rec)

    db.flush()

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="CONSENT",
        entity_id=rec.id,
        action="UPDATE",
        changes={"phone": normalized, "status": "CONSENT_GRANTED", "channel": req.consent_channel},
        rationale="Candidate communication consent recorded/updated",
    )
    db.add(audit)
    db.commit()
    db.refresh(rec)
    return rec


@router.post("/opt-out", response_model=ConsentRecordResponse)
def opt_out_candidate(
    req: OptOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    """
    Candidate or HR explicitly registers an opt-out from automated calling / recruitment.
    """
    is_valid, norm_phone, circle, err = validate_and_normalize_indian_phone(req.phone_number)
    normalized = norm_phone or req.phone_number.strip()

    cand = db.query(Candidate).filter(
        (Candidate.phone_normalized == normalized) | (Candidate.phone_raw == req.phone_number.strip())
    ).first()

    candidate_id = cand.id if cand else "UNREGISTERED"

    consent_record = db.query(ConsentRecord).filter(ConsentRecord.phone_normalized == normalized).first()
    if consent_record:
        consent_record.consent_status = "OPTED_OUT"
        consent_record.opt_out_timestamp = datetime.utcnow()
        consent_record.opt_out_reason = req.reason
        rec = consent_record
    else:
        rec = ConsentRecord(
            candidate_id=candidate_id,
            phone_normalized=normalized,
            consent_channel="APPLICATION_FORM",
            consent_status="OPTED_OUT",
            terms_version="v1.0-2026",
            opt_out_timestamp=datetime.utcnow(),
            opt_out_reason=req.reason
        )
        db.add(rec)

    db.flush()

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="CONSENT",
        entity_id=rec.id,
        action="WITHDRAW_CONSENT",
        changes={"phone": normalized, "status": "OPTED_OUT", "reason": req.reason},
        rationale="Candidate requested opt-out and telephone suppression"
    )
    db.add(audit)
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/history/{phone}", response_model=List[ConsentRecordResponse])
def get_consent_history(
    phone: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_valid, norm_phone, circle, err = validate_and_normalize_indian_phone(phone)
    normalized = norm_phone or phone.strip()
    records = db.query(ConsentRecord).filter(ConsentRecord.phone_normalized == normalized).order_by(ConsentRecord.recorded_at.desc()).all()
    return records
