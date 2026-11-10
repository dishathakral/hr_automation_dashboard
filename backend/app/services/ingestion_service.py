import re
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.entities import Candidate, Application, Job, Resume, ConsentRecord, AuditLog
from app.services.telephony_service import validate_and_normalize_indian_phone

KNOWN_SKILLS_VOCAB = [
    "React", "TypeScript", "JavaScript", "Node.js", "Python", "FastAPI", "Django",
    "PostgreSQL", "MySQL", "SQL", "REST APIs", "GraphQL", "Docker", "Kubernetes",
    "AWS", "Tailwind CSS", "HTML", "CSS", "Git", "Redis", "Microservices",
    "Talent Sourcing", "Candidate Screening", "ATS Management", "HR Operations",
    "Onboarding", "Indian Labor Laws", "Payroll", "Employee Relations", "HR Analytics",
    "Lead Generation", "Cold Calling", "CRM", "Salesforce", "Client Communication",
    "Negotiation", "B2B SaaS Sales", "Account Management", "Excel", "Tally ERP",
]


def extract_skills_from_text(text: str, existing_skills: Optional[List[str]] = None) -> List[str]:
    """Extracts known technical, HR, and business skills from raw resume text."""
    found = list(existing_skills or [])
    seen_lower = {s.strip().lower() for s in found if s.strip()}
    lower_text = (text or "").lower()

    for skill in KNOWN_SKILLS_VOCAB:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, lower_text) and skill.lower() not in seen_lower:
            found.append(skill)
            seen_lower.add(skill.lower())

    return found


def classify_applicant_category(
    job: Job,
    candidate_skills: List[str],
    experience_years: float,
    highest_education: str,
    resume_text: str = ""
) -> Tuple[str, str]:
    """
    Classifies candidates into the 6 assignment-mandated tiers:
    1. RELEVANT_SUITABLE
    2. PARTIALLY_RELEVANT
    3. NOT_RELEVANT
    4. EXPERIENCED
    5. FRESHER
    6. INCOMPLETE_PROFILE
    """
    if not candidate_skills or not highest_education or len(resume_text.strip()) < 20:
        return "INCOMPLETE_PROFILE", "Missing essential candidate profile attributes, skills list, or resume text."

    if experience_years < 1.0:
        return "FRESHER", f"Candidate has {experience_years:.1f} years of professional experience (entry-level / graduate cohort)."

    req_skills = [s.strip().lower() for s in (job.required_skills or [])]
    cand_skills_lower = [s.strip().lower() for s in candidate_skills]
    matched = [s for s in req_skills if s in cand_skills_lower or s in resume_text.lower()]
    match_ratio = len(matched) / max(len(req_skills), 1)

    if experience_years >= 6.0 and match_ratio >= 0.5:
        return "EXPERIENCED", f"Senior profile with {experience_years:.1f} years of domain experience and solid skill overlap ({len(matched)}/{len(req_skills)} required skills matched)."

    if match_ratio >= 0.65:
        return "RELEVANT_SUITABLE", f"High technical and skill alignment ({len(matched)}/{len(req_skills)} required skills matched) with {experience_years:.1f} years experience."
    elif match_ratio >= 0.35:
        return "PARTIALLY_RELEVANT", f"Moderate alignment ({len(matched)}/{len(req_skills)} required skills matched); potential for upskilling or role fit."
    else:
        return "NOT_RELEVANT", f"Low alignment ({len(matched)}/{len(req_skills)} required skills matched) for the vacancy prerequisites."


def ingest_candidate_record(
    db: Session,
    job_id: str,
    full_name: str,
    email: str,
    phone_raw: str,
    city: str,
    title: Optional[str],
    experience_years: float,
    education: str,
    skills: List[str],
    resume_text: str = "",
    source: str = "INDEED_IMPORT",
    actor_email: str = "system"
) -> Dict[str, Any]:
    """
    Ingests a candidate application with:
    - Phone normalization (+91)
    - Multi-job support (same candidate applying to multiple jobs keeps 1 Candidate + multiple Applications)
    - Duplicate detection (same candidate re-applying to same job, or different email sharing same phone)
    - Resume parsing & 6-tier taxonomy assignment
    """
    is_valid_phone, norm_phone, circle, err = validate_and_normalize_indian_phone(phone_raw)
    normalized_phone = norm_phone or phone_raw.strip()

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Job requisition with ID {job_id} not found.")

    clean_email = email.strip().lower()
    merged_skills = extract_skills_from_text(resume_text, skills)

    # Check matching candidate by email first, then normalized phone
    existing_by_email = db.query(Candidate).filter(Candidate.email == clean_email).first()
    existing_by_phone = (
        db.query(Candidate).filter(Candidate.phone_normalized == normalized_phone).first()
        if is_valid_phone else None
    )

    is_duplicate_identity = False
    is_duplicate_application = False
    multi_job_application = False

    if existing_by_email:
        candidate = existing_by_email
        # Merge any newly discovered skills onto unified candidate profile
        existing_skill_set = {s.lower() for s in (candidate.skills or [])}
        updated_skills = list(candidate.skills or [])
        for s in merged_skills:
            if s.lower() not in existing_skill_set:
                updated_skills.append(s)
                existing_skill_set.add(s.lower())
        candidate.skills = updated_skills
    elif existing_by_phone:
        # Different email but identical Indian mobile number -> duplicate identity detected
        is_duplicate_identity = True
        candidate = Candidate(
            full_name=full_name.strip(),
            email=clean_email,
            phone_raw=phone_raw.strip(),
            phone_normalized=normalized_phone,
            current_city=city.strip(),
            current_title=title.strip() if title else None,
            total_experience_years=experience_years,
            highest_education=education.strip(),
            skills=merged_skills,
            is_duplicate=True,
            original_candidate_id=existing_by_phone.id,
        )
        db.add(candidate)
        db.flush()
    else:
        candidate = Candidate(
            full_name=full_name.strip(),
            email=clean_email,
            phone_raw=phone_raw.strip(),
            phone_normalized=normalized_phone,
            current_city=city.strip(),
            current_title=title.strip() if title else None,
            total_experience_years=experience_years,
            highest_education=education.strip(),
            skills=merged_skills,
            is_duplicate=False,
        )
        db.add(candidate)
        db.flush()

        consent = ConsentRecord(
            candidate_id=candidate.id,
            phone_normalized=normalized_phone,
            consent_channel="APPLICATION_FORM" if source == "MANUAL_ENTRY" else "CALL_IVR",
            consent_status="CONSENT_GRANTED",
            terms_version="v1.0-2026",
        )
        db.add(consent)

    # Check if this candidate already applied for this specific job
    existing_application = db.query(Application).filter(
        Application.candidate_id == candidate.id,
        Application.job_id == job.id
    ).first()

    if existing_application:
        db.commit()
        return {
            "candidate_id": candidate.id,
            "application_id": existing_application.id,
            "is_duplicate": True,
            "is_duplicate_application": True,
            "multi_job_application": False,
            "category": existing_application.category,
            "category_reason": existing_application.category_reason,
            "message": "Duplicate application detected: candidate has already applied to this position.",
        }

    # Check if a cross-email phone duplicate already applied for the same job
    if is_duplicate_identity and existing_by_phone:
        same_job_by_original = db.query(Application).filter(
            Application.candidate_id == existing_by_phone.id,
            Application.job_id == job.id
        ).first()
        if same_job_by_original:
            is_duplicate_application = True

    if existing_by_email:
        prior_apps_count = db.query(Application).filter(Application.candidate_id == candidate.id).count()
        if prior_apps_count > 0:
            multi_job_application = True

    # Create Resume record if meaningful text is supplied
    resume_id = None
    if resume_text and len(resume_text.strip()) >= 1:
        resume = Resume(
            candidate_id=candidate.id,
            file_name=f"{candidate.full_name.replace(' ', '_')}_Resume.pdf",
            file_size_bytes=len(resume_text.encode("utf-8")),
            mime_type="application/pdf",
            storage_path=f"/resumes/{candidate.id}_resume.txt",
            parsed_text=resume_text,
            extracted_skills=merged_skills,
            extracted_experience=[{"title": title or "Professional", "years": experience_years}],
        )
        db.add(resume)
        db.flush()
        resume_id = resume.id

    # Classify candidate taxonomy
    category, reason = classify_applicant_category(
        job=job,
        candidate_skills=merged_skills,
        experience_years=experience_years,
        highest_education=education,
        resume_text=resume_text,
    )

    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        resume_id=resume_id,
        source=source,
        category=category,
        category_reason=reason,
        stage="APPLIED",
    )
    db.add(application)
    db.flush()

    audit = AuditLog(
        actor_email=actor_email,
        entity_type="APPLICATION",
        entity_id=application.id,
        action="CREATE",
        changes={
            "category": category,
            "is_duplicate_identity": is_duplicate_identity,
            "is_duplicate_application": is_duplicate_application,
            "multi_job_application": multi_job_application,
            "job_title": job.title,
        },
        rationale=f"Application intake via {source}",
    )
    db.add(audit)
    db.commit()

    return {
        "candidate_id": candidate.id,
        "application_id": application.id,
        "is_duplicate": is_duplicate_identity or is_duplicate_application,
        "is_duplicate_application": is_duplicate_application,
        "multi_job_application": multi_job_application,
        "category": category,
        "category_reason": reason,
    }
