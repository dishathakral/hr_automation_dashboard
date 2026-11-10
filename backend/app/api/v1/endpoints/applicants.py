import csv
import io
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.api.deps import get_db, get_current_user, require_role
from app.models.entities import Application, Candidate, Job, ScreeningResult, HRDecision, CallLog, Interview, AuditLog, User
from app.schemas import ApplicationResponse, ApplicationCategoryUpdate, CandidateCreate
from app.services.ingestion_service import ingest_candidate_record

router = APIRouter()

def serialize_application(app: Application, db: Session) -> dict:
    cand = app.candidate
    job = app.job
    screen = app.screening_result
    
    # Latest HR decision
    latest_decision = db.query(HRDecision).filter(HRDecision.application_id == app.id).order_by(HRDecision.decided_at.desc()).first()
    # Latest call
    latest_call = db.query(CallLog).filter(CallLog.application_id == app.id).order_by(CallLog.call_timestamp.desc()).first()
    # Latest interview
    latest_interview = db.query(Interview).filter(Interview.application_id == app.id).order_by(Interview.created_at.desc()).first()

    effective_screening_status = (
        latest_decision.final_decision
        if latest_decision
        else (screen.ai_recommended_status if screen else None)
    )

    return {
        "id": app.id,
        "candidate_id": app.candidate_id,
        "job_id": app.job_id,
        "resume_id": app.resume_id,
        "source": app.source,
        "category": app.category,
        "category_reason": app.category_reason,
        "stage": app.stage,
        "applied_at": app.applied_at,
        "candidate": {
            "id": cand.id,
            "full_name": cand.full_name,
            "email": cand.email,
            "phone_raw": cand.phone_raw,
            "phone_normalized": cand.phone_normalized,
            "current_city": cand.current_city,
            "current_title": cand.current_title,
            "total_experience_years": cand.total_experience_years,
            "highest_education": cand.highest_education,
            "skills": cand.skills or [],
            "is_duplicate": cand.is_duplicate,
            "original_candidate_id": cand.original_candidate_id,
            "created_at": cand.created_at
        },
        "job_title": job.title if job else "N/A",
        "suitability_score": screen.suitability_score if screen else None,
        "screening_status": effective_screening_status,
        "hr_final_status": latest_decision.final_decision if latest_decision else None,
        "is_override": latest_decision.is_override if latest_decision else False,
        "override_reason": latest_decision.override_reason if latest_decision else None,
        "call_outcome": latest_call.outcome if latest_call else None,
        "interview_status": latest_interview.confirmation_status if latest_interview else None
    }

@router.get("", response_model=List[ApplicationResponse])
@router.get("/", response_model=List[ApplicationResponse], include_in_schema=False)
def list_applications(
    job_id: Optional[str] = None,
    category: Optional[str] = None,
    stage: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Application).join(Candidate)
    
    if job_id:
        query = query.filter(Application.job_id == job_id)
    if category:
        query = query.filter(Application.category == category.upper())
    if stage:
        query = query.filter(Application.stage == stage.upper())
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Candidate.full_name.ilike(search_fmt),
                Candidate.email.ilike(search_fmt),
                Candidate.phone_normalized.ilike(search_fmt),
                Candidate.current_city.ilike(search_fmt)
            )
        )

    apps = query.order_by(Application.applied_at.desc()).all()
    return [serialize_application(app, db) for app in apps]

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_manual_applicant(
    cand_in: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    if not cand_in.job_id:
        raise HTTPException(status_code=400, detail="Job ID is mandatory for applicant creation")

    try:
        result = ingest_candidate_record(
            db=db,
            job_id=cand_in.job_id,
            full_name=cand_in.full_name,
            email=cand_in.email,
            phone_raw=cand_in.phone_raw,
            city=cand_in.current_city,
            title=cand_in.current_title,
            experience_years=cand_in.total_experience_years,
            education=cand_in.highest_education,
            skills=cand_in.skills,
            resume_text=cand_in.resume_text or "",
            source="MANUAL_ENTRY",
            actor_email=current_user.email
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    app = db.query(Application).filter(Application.id == result["application_id"]).first()
    return serialize_application(app, db)

@router.post("/import-indeed")
async def import_indeed_applications(
    file: UploadFile = File(...),
    job_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    """
    Parses Indeed-formatted CSV/Excel or JSON exports.
    Ingests candidates, flags duplicates, and assigns 6-tier classification.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Selected Job Requisition not found")

    contents = await file.read()
    filename = file.filename.lower()

    imported_count = 0
    duplicate_count = 0
    records = []

    if filename.endswith(".json"):
        try:
            records = json.loads(contents.decode("utf-8"))
            if isinstance(records, dict) and "applicants" in records:
                records = records["applicants"]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    else:  # Assume CSV
        try:
            text_stream = io.StringIO(contents.decode("utf-8-sig", errors="ignore"))
            reader = csv.DictReader(text_stream)
            records = list(reader)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

    if not records:
        raise HTTPException(status_code=400, detail="The uploaded file contains no data rows.")

    for row in records:
        # Standardize column headers
        clean_row = {k.strip().lower().replace(" ", "_"): str(v).strip() for k, v in row.items() if k}

        full_name = clean_row.get("candidate_name") or clean_row.get("name") or clean_row.get("full_name") or "Unknown Candidate"
        email = clean_row.get("email") or clean_row.get("candidate_email") or f"user_{datetime.utcnow().timestamp()}@example.com"
        phone = clean_row.get("phone") or clean_row.get("phone_number") or clean_row.get("mobile") or "+919876543210"
        city = clean_row.get("city") or clean_row.get("location") or "Bangalore"
        title = clean_row.get("title") or clean_row.get("current_title") or "Candidate"
        
        try:
            exp_years = float(clean_row.get("experience_years") or clean_row.get("total_experience") or clean_row.get("experience") or 2.0)
        except Exception:
            exp_years = 2.0
            
        education = clean_row.get("education") or clean_row.get("highest_education") or "B.Tech"
        
        skills_raw = clean_row.get("skills") or ""
        if isinstance(skills_raw, list):
            skills = skills_raw
        elif "," in skills_raw:
            skills = [s.strip() for s in skills_raw.split(",") if s.strip()]
        else:
            skills = [s.strip() for s in skills_raw.split() if s.strip()]

        resume_text = clean_row.get("resume_text") or clean_row.get("summary") or ""

        try:
            res = ingest_candidate_record(
                db=db,
                job_id=job_id,
                full_name=full_name,
                email=email,
                phone_raw=phone,
                city=city,
                title=title,
                experience_years=exp_years,
                education=education,
                skills=skills,
                resume_text=resume_text,
                source="INDEED_IMPORT",
                actor_email=current_user.email
            )
            imported_count += 1
            if res.get("is_duplicate"):
                duplicate_count += 1
        except Exception:
            continue

    return {
        "status": "success",
        "message": f"Successfully processed {imported_count} applications from Indeed export.",
        "imported_total": imported_count,
        "duplicates_detected": duplicate_count,
        "job_title": job.title
    }

@router.patch("/{id}/category")
def update_applicant_category(
    id: str,
    payload: ApplicationCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    old_cat = app.category
    app.category = payload.category.upper()
    app.category_reason = payload.category_reason

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="APPLICATION",
        entity_id=app.id,
        action="UPDATE",
        changes={"old_category": old_cat, "new_category": app.category},
        rationale=f"Recruiter updated taxonomy: {payload.category_reason}"
    )
    db.add(audit)
    db.commit()

    return {"message": "Category updated successfully", "new_category": app.category}

