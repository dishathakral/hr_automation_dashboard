from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.core.config import settings
from app.models.entities import Application, CallLog, ConsentRecord, AuditLog, User
from app.schemas import (
    PhoneValidationRequest, PhoneValidationResponse,
    CallSimulationStepRequest, CallSimulationResponse, CallLogResponse
)
from app.services.telephony_service import (
    validate_and_normalize_indian_phone,
    is_within_trai_calling_hours,
    check_calling_eligibility,
    CALLING_SCRIPTS
)

router = APIRouter()


@router.post("/validate-phone", response_model=PhoneValidationResponse)
def validate_phone(
    req: PhoneValidationRequest,
    current_user: User = Depends(get_current_user)
):
    is_valid, norm, circle, err = validate_and_normalize_indian_phone(req.phone_number)
    return PhoneValidationResponse(
        raw_number=req.phone_number,
        normalized_number=norm,
        is_valid_indian_mobile=is_valid,
        carrier_circle=circle,
        error_message=err
    )


@router.get("/compliance-status/{application_id}")
def get_calling_compliance_status(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Pre-flight compliance check before initiating a simulated or live call:
    - +91 Indian mobile validation
    - Consent / DNC Opt-Out check
    - 24-hour call frequency check
    - TRAI calling hours window check (IST)
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    cand = app.candidate
    is_valid, norm_phone, circle, err = validate_and_normalize_indian_phone(
        cand.phone_normalized or cand.phone_raw
    )
    within_hours, hours_msg = is_within_trai_calling_hours()

    if not is_valid or not norm_phone:
        return {
            "application_id": app.id,
            "candidate_name": cand.full_name,
            "phone_number": cand.phone_raw,
            "is_valid_phone": False,
            "within_calling_hours": within_hours,
            "calling_hours_message": hours_msg,
            "consent_status": "UNKNOWN",
            "eligible": False,
            "block_reason": err or "Invalid Indian mobile number",
            "simulation_mode": settings.SIMULATION_MODE,
        }

    eligible, block_reason = check_calling_eligibility(db, norm_phone, app.id)
    consent = db.query(ConsentRecord).filter(
        ConsentRecord.phone_normalized == norm_phone
    ).order_by(ConsentRecord.recorded_at.desc()).first()

    return {
        "application_id": app.id,
        "candidate_name": cand.full_name,
        "phone_number": norm_phone,
        "is_valid_phone": True,
        "carrier_circle": circle,
        "within_calling_hours": within_hours,
        "calling_hours_message": hours_msg,
        "consent_status": consent.consent_status if consent else "NOT_RECORDED",
        "eligible": eligible,
        "block_reason": block_reason,
        "simulation_mode": settings.SIMULATION_MODE,
    }


@router.post("/simulate-call", response_model=CallSimulationResponse)
def simulate_call_step(
    req: CallSimulationStepRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    """
    Executes a step in the realistic 3-step interactive calling simulator.
    Evaluates consent, TRAI hours, candidate response selection, and logs full transcript & outcome.
    """
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    cand = app.candidate
    job = app.job

    # 1. Phone validation
    is_valid, norm_phone, circle, err = validate_and_normalize_indian_phone(cand.phone_normalized or cand.phone_raw)
    if not is_valid or not norm_phone:
        call_log = CallLog(
            application_id=app.id,
            caller_user_id=current_user.id,
            phone_number=cand.phone_raw,
            provider_mode="SIMULATOR",
            duration_seconds=0,
            outcome="INVALID_NUMBER",
            consent_granted=False,
            opt_out_requested=False,
            callback_requested=False,
            call_transcript=[{"step": 0, "error": err}],
            simulation_step_reached="Step 0 (Number Validation Failed)"
        )
        db.add(call_log)
        app.stage = "CALLED"
        db.commit()
        return CallSimulationResponse(
            application_id=app.id,
            phone_number=cand.phone_raw,
            step=0,
            audio_prompt_text="Error: The phone number provided is not a valid Indian mobile number (+91).",
            candidate_response_recorded="NUMBER_VALIDATION_FAILED",
            is_call_ended=True,
            final_outcome="INVALID_NUMBER",
            duration_seconds=0,
            transcript=[{"speaker": "System", "text": err}],
            opt_out_triggered=False
        )

    # 2. Eligibility & Opt-Out check
    eligible, reason = check_calling_eligibility(db, norm_phone, app.id)
    if not eligible:
        raise HTTPException(status_code=400, detail=reason)

    # 3. Calling Hours Check (TRAI regulations)
    within_hours, hours_msg = is_within_trai_calling_hours()
    if not within_hours and not (settings.SIMULATION_MODE and req.allow_outside_hours_simulation):
        raise HTTPException(
            status_code=400,
            detail=f"Calling Hours Restriction: {hours_msg} Enable 'Allow simulator test outside calling hours' in Simulation Mode to test after hours."
        )

    step_info = CALLING_SCRIPTS.get(req.step, CALLING_SCRIPTS[1])
    prompt_text = step_info["prompt"].format(
        candidate_name=cand.full_name,
        company_name="Antigravity Recruitment",
        job_title=job.title,
        location=job.location,
        work_model=job.work_model
    )

    action_taken = req.candidate_action.upper()
    selected_option = next((opt for opt in step_info["options"] if opt["action"] == action_taken), None)

    if not selected_option:
        selected_option = step_info["options"][0]

    is_terminal = selected_option.get("terminal", False)
    final_outcome = selected_option.get("outcome", None)
    opt_out_triggered = (action_taken == "PRESS_9")

    if opt_out_triggered:
        consent_rec = db.query(ConsentRecord).filter(ConsentRecord.phone_normalized == norm_phone).first()
        if consent_rec:
            consent_rec.consent_status = "OPTED_OUT"
            consent_rec.opt_out_timestamp = datetime.utcnow()
            consent_rec.opt_out_reason = "Opted out during automated screening call"
        else:
            db.add(ConsentRecord(
                candidate_id=cand.id,
                phone_normalized=norm_phone,
                consent_channel="CALL_IVR",
                consent_status="OPTED_OUT",
                opt_out_timestamp=datetime.utcnow(),
                opt_out_reason="Opted out during automated screening call"
            ))

    transcript_entry = {
        "step": req.step,
        "step_title": step_info["title"],
        "prompt": prompt_text,
        "candidate_action": selected_option["label"],
        "timestamp": datetime.utcnow().isoformat()
    }
    full_transcript = list(req.transcript_history or []) + [transcript_entry]

    duration = 20 * req.step

    if is_terminal:
        call_log = CallLog(
            application_id=app.id,
            caller_user_id=current_user.id,
            phone_number=norm_phone,
            provider_mode="SIMULATOR",
            duration_seconds=duration,
            outcome=final_outcome or "NO_ANSWER",
            consent_granted=(req.step >= 2 or action_taken == "PRESS_1"),
            opt_out_requested=opt_out_triggered,
            callback_requested=(final_outcome == "CALLBACK_REQUESTED"),
            call_transcript=full_transcript,
            simulation_step_reached=f"Step {req.step}: {step_info['title']}"
        )
        db.add(call_log)
        app.stage = "CALLED"

        audit = AuditLog(
            actor_id=current_user.id,
            actor_email=current_user.email,
            entity_type="CALL",
            entity_id=app.id,
            action="SIMULATE_CALL",
            changes={"outcome": final_outcome, "step": req.step, "opt_out": opt_out_triggered},
            rationale=f"Simulated screening call completed with outcome {final_outcome}"
        )
        db.add(audit)
        db.commit()
    elif opt_out_triggered:
        db.commit()

    return CallSimulationResponse(
        application_id=app.id,
        phone_number=norm_phone,
        step=req.step,
        audio_prompt_text=prompt_text,
        candidate_response_recorded=selected_option["label"],
        is_call_ended=is_terminal,
        final_outcome=final_outcome,
        duration_seconds=duration,
        transcript=full_transcript,
        opt_out_triggered=opt_out_triggered
    )


@router.get("/logs", response_model=List[CallLogResponse])
def list_call_logs(
    outcome: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CallLog)
    if outcome:
        query = query.filter(CallLog.outcome == outcome.upper())
    return query.order_by(CallLog.call_timestamp.desc()).all()
