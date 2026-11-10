from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.models.entities import Job, Application, AuditLog, User
from app.schemas import JobCreate, JobUpdate, JobResponse

router = APIRouter()

@router.get("", response_model=List[JobResponse])
@router.get("/", response_model=List[JobResponse], include_in_schema=False)
def list_jobs(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Job)
    if status_filter:
        query = query.filter(Job.status == status_filter.upper())
    
    jobs = query.order_by(Job.created_at.desc()).all()
    results = []
    for job in jobs:
        app_count = db.query(Application).filter(Application.job_id == job.id).count()
        job_dict = {
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "employment_type": job.employment_type,
            "location": job.location,
            "work_model": job.work_model,
            "experience_level": job.experience_level,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "currency": job.currency,
            "job_description": job.job_description,
            "required_skills": job.required_skills or [],
            "preferred_skills": job.preferred_skills or [],
            "screening_weights": job.screening_weights or {"skills": 40, "experience": 30, "education": 15, "logistics": 15},
            "status": job.status,
            "is_demo": job.is_demo,
            "indeed_reference_id": job.indeed_reference_id,
            "indeed_post_url": job.indeed_post_url,
            "posted_at": job.posted_at,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "applicant_count": app_count
        }
        results.append(JobResponse(**job_dict))
    return results

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    job = Job(
        title=job_in.title,
        department=job_in.department,
        employment_type=job_in.employment_type,
        location=job_in.location,
        work_model=job_in.work_model,
        experience_level=job_in.experience_level,
        salary_min=job_in.salary_min,
        salary_max=job_in.salary_max,
        currency=job_in.currency,
        job_description=job_in.job_description,
        required_skills=job_in.required_skills,
        preferred_skills=job_in.preferred_skills,
        screening_weights=job_in.screening_weights,
        status=job_in.status,
        is_demo=job_in.is_demo,
        indeed_reference_id=job_in.indeed_reference_id,
        indeed_post_url=job_in.indeed_post_url,
        posted_at=datetime.utcnow() if job_in.status == "ACTIVE" else None
    )
    db.add(job)
    db.flush()

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="JOB",
        entity_id=job.id,
        action="CREATE",
        changes={"title": job.title, "indeed_reference_id": job.indeed_reference_id},
        rationale="New job vacancy published"
    )
    db.add(audit)
    db.commit()
    db.refresh(job)

    return JobResponse(
        id=job.id,
        title=job.title,
        department=job.department,
        employment_type=job.employment_type,
        location=job.location,
        work_model=job.work_model,
        experience_level=job.experience_level,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        currency=job.currency,
        job_description=job.job_description,
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        screening_weights=job.screening_weights,
        status=job.status,
        is_demo=job.is_demo,
        indeed_reference_id=job.indeed_reference_id,
        indeed_post_url=job.indeed_post_url,
        posted_at=job.posted_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        applicant_count=0
    )

@router.get("/{id}", response_model=JobResponse)
def get_job_by_id(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job requisition not found")
    app_count = db.query(Application).filter(Application.job_id == job.id).count()
    return JobResponse(
        id=job.id,
        title=job.title,
        department=job.department,
        employment_type=job.employment_type,
        location=job.location,
        work_model=job.work_model,
        experience_level=job.experience_level,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        currency=job.currency,
        job_description=job.job_description,
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        screening_weights=job.screening_weights,
        status=job.status,
        is_demo=job.is_demo,
        indeed_reference_id=job.indeed_reference_id,
        indeed_post_url=job.indeed_post_url,
        posted_at=job.posted_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        applicant_count=app_count
    )

@router.put("/{id}", response_model=JobResponse)
def update_job(
    id: str,
    job_update: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job requisition not found")

    old_data = {"status": job.status, "weights": job.screening_weights}
    update_data = job_update.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        setattr(job, field, val)

    if "status" in update_data and update_data["status"] == "ACTIVE" and not job.posted_at:
        job.posted_at = datetime.utcnow()

    job.updated_at = datetime.utcnow()

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="JOB",
        entity_id=job.id,
        action="UPDATE",
        changes={"old": old_data, "new": update_data},
        rationale="Job details or screening weights updated"
    )
    db.add(audit)
    db.commit()
    db.refresh(job)

    app_count = db.query(Application).filter(Application.job_id == job.id).count()
    return JobResponse(
        id=job.id,
        title=job.title,
        department=job.department,
        employment_type=job.employment_type,
        location=job.location,
        work_model=job.work_model,
        experience_level=job.experience_level,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        currency=job.currency,
        job_description=job.job_description,
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        screening_weights=job.screening_weights,
        status=job.status,
        is_demo=job.is_demo,
        indeed_reference_id=job.indeed_reference_id,
        indeed_post_url=job.indeed_post_url,
        posted_at=job.posted_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        applicant_count=app_count
    )

@router.delete("/{id}")
def archive_job(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job requisition not found")

    job.status = "CLOSED"
    job.updated_at = datetime.utcnow()

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="JOB",
        entity_id=job.id,
        action="UPDATE",
        changes={"status": "CLOSED"},
        rationale="Job requisition closed"
    )
    db.add(audit)
    db.commit()
    return {"message": "Job successfully archived and closed"}

