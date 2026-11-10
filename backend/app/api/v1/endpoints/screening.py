from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.models.entities import Application, Candidate, Job, ScreeningResult, HRDecision, AuditLog, User
from app.schemas import ScreeningResultResponse, HROverrideRequest
from app.services.ai_screening_service import screen_candidate

router = APIRouter()

@router.post("/evaluate/{application_id}", response_model=ScreeningResultResponse)
async def evaluate_candidate_screening(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    job = app.job
    cand = app.candidate
    resume = app.resume

    job_data = {
        "title": job.title,
        "location": job.location,
        "work_model": job.work_model,
        "experience_level": job.experience_level,
        "required_skills": job.required_skills or [],
        "screening_weights": job.screening_weights or {"skills": 40, "experience": 30, "education": 15, "logistics": 15}
    }

    cand_data = {
        "full_name": cand.full_name,
        "current_city": cand.current_city,
        "total_experience_years": cand.total_experience_years,
        "highest_education": cand.highest_education,
        "skills": cand.skills or []
    }

    resume_text = resume.parsed_text if resume else f"Profile for {cand.full_name}. Skills: {', '.join(cand.skills or [])}"

    # Run screening
    result = await screen_candidate(job_data, cand_data, resume_text)

    # Persist or update screening result
    existing = db.query(ScreeningResult).filter(ScreeningResult.application_id == app.id).first()
    if existing:
        existing.suitability_score = result["suitability_score"]
        existing.skills_score = result["skills_score"]
        existing.experience_score = result["experience_score"]
        existing.education_score = result["education_score"]
        existing.logistics_score = result["logistics_score"]
        existing.matching_strengths = result["matching_strengths"]
        existing.missing_skills = result["missing_skills"]
        existing.potential_concerns = result["potential_concerns"]
        existing.suggested_interview_questions = result["suggested_interview_questions"]
        existing.clear_explanation = result["clear_explanation"]
        existing.ai_recommended_status = result["ai_recommended_status"]
        existing.engine_used = result["engine_used"]
        existing.is_external_api = result.get("is_external_api", False)
        existing.screened_at = datetime.utcnow()
        sr = existing
    else:
        sr = ScreeningResult(
            application_id=app.id,
            suitability_score=result["suitability_score"],
            skills_score=result["skills_score"],
            experience_score=result["experience_score"],
            education_score=result["education_score"],
            logistics_score=result["logistics_score"],
            matching_strengths=result["matching_strengths"],
            missing_skills=result["missing_skills"],
            potential_concerns=result["potential_concerns"],
            suggested_interview_questions=result["suggested_interview_questions"],
            clear_explanation=result["clear_explanation"],
            ai_recommended_status=result["ai_recommended_status"],
            engine_used=result["engine_used"],
            is_external_api=result.get("is_external_api", False),
            screened_at=datetime.utcnow()
        )
        db.add(sr)

    # Update application stage to SCREENED
    app.stage = "SCREENED"
    
    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="SCREENING",
        entity_id=app.id,
        action="CREATE",
        changes={"score": sr.suitability_score, "ai_recommendation": sr.ai_recommended_status, "engine": sr.engine_used},
        rationale="AI Candidate Evaluation executed"
    )
    db.add(audit)
    db.commit()
    db.refresh(sr)

    return sr

@router.post("/evaluate-batch")
async def evaluate_batch_screening(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    apps = db.query(Application).filter(Application.job_id == job_id, Application.stage == "APPLIED").all()
    screened_count = 0
    for app in apps:
        job = app.job
        cand = app.candidate
        resume = app.resume
        job_data = {
            "title": job.title,
            "location": job.location,
            "work_model": job.work_model,
            "experience_level": job.experience_level,
            "required_skills": job.required_skills or [],
            "screening_weights": job.screening_weights or {}
        }
        cand_data = {
            "full_name": cand.full_name,
            "current_city": cand.current_city,
            "total_experience_years": cand.total_experience_years,
            "highest_education": cand.highest_education,
            "skills": cand.skills or []
        }
        resume_text = resume.parsed_text if resume else f"Profile: {cand.full_name}. Skills: {cand.skills}"
        result = await screen_candidate(job_data, cand_data, resume_text)

        sr = ScreeningResult(
            application_id=app.id,
            suitability_score=result["suitability_score"],
            skills_score=result["skills_score"],
            experience_score=result["experience_score"],
            education_score=result["education_score"],
            logistics_score=result["logistics_score"],
            matching_strengths=result["matching_strengths"],
            missing_skills=result["missing_skills"],
            potential_concerns=result["potential_concerns"],
            suggested_interview_questions=result["suggested_interview_questions"],
            clear_explanation=result["clear_explanation"],
            ai_recommended_status=result["ai_recommended_status"],
            engine_used=result["engine_used"],
            is_external_api=result.get("is_external_api", False)
        )
        db.add(sr)
        app.stage = "SCREENED"
        screened_count += 1

    db.commit()
    return {"status": "success", "screened_total": screened_count}

@router.get("/{application_id}", response_model=ScreeningResultResponse)
def get_screening_result(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sr = db.query(ScreeningResult).filter(ScreeningResult.application_id == application_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Screening evaluation not found for this candidate")

    latest_dec = db.query(HRDecision).filter(
        HRDecision.application_id == application_id
    ).order_by(HRDecision.decided_at.desc()).first()

    return ScreeningResultResponse(
        id=sr.id,
        application_id=sr.application_id,
        suitability_score=sr.suitability_score,
        skills_score=sr.skills_score,
        experience_score=sr.experience_score,
        education_score=sr.education_score,
        logistics_score=sr.logistics_score,
        matching_strengths=sr.matching_strengths or [],
        missing_skills=sr.missing_skills or [],
        potential_concerns=sr.potential_concerns or [],
        suggested_interview_questions=sr.suggested_interview_questions or [],
        clear_explanation=sr.clear_explanation,
        ai_recommended_status=sr.ai_recommended_status,
        engine_used=sr.engine_used,
        is_external_api=sr.is_external_api,
        screened_at=sr.screened_at,
        hr_final_status=latest_dec.final_decision if latest_dec else None,
        is_override=latest_dec.is_override if latest_dec else False,
        override_reason=latest_dec.override_reason if latest_dec else None,
        decided_at=latest_dec.decided_at if latest_dec else None,
    )

@router.post("/decision")
def record_hr_decision(
    decision_in: HROverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    app = db.query(Application).filter(Application.id == decision_in.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    sr = app.screening_result
    ai_status = sr.ai_recommended_status if sr else "PENDING"
    is_override = (decision_in.final_decision.upper() != ai_status.upper())

    if is_override and not decision_in.override_reason:
        raise HTTPException(
            status_code=400,
            detail="Mandatory justification required: When overriding the AI recommendation, a clear recruiter override reason must be provided."
        )

    hr_dec = HRDecision(
        application_id=app.id,
        reviewer_id=current_user.id,
        final_decision=decision_in.final_decision.upper(),
        is_override=is_override,
        override_reason=decision_in.override_reason,
        decision_notes=decision_in.decision_notes
    )
    db.add(hr_dec)

    # If shortlisted, candidate moves to calling queue
    if decision_in.final_decision.upper() == "SHORTLISTED":
        app.stage = "SCREENED"  # Ready for calling

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="SCREENING",
        entity_id=app.id,
        action="HR_OVERRIDE" if is_override else "UPDATE",
        changes={
            "ai_recommendation": ai_status,
            "final_decision": decision_in.final_decision.upper(),
            "is_override": is_override
        },
        rationale=decision_in.override_reason or "HR Approved AI Recommendation"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "final_decision": decision_in.final_decision.upper(),
        "is_override": is_override,
        "message": "Human-in-the-loop decision recorded with audit stamp."
    }

