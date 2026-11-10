from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    jobs,
    applicants,
    candidates,
    screening,
    calling,
    consent,
    interviews,
    notifications,
    audit,
    reports,
    settings,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & RBAC"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Job Vacancies & Indeed Tracker"])
api_router.include_router(applicants.router, prefix="/applicants", tags=["Applicant Management & Ingestion"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["Candidates & Resumes"])
api_router.include_router(screening.router, prefix="/screening", tags=["AI Screening & Human-in-the-Loop"])
api_router.include_router(calling.router, prefix="/calling", tags=["Indian Telephony & Calling Simulator"])
api_router.include_router(consent.router, prefix="/consent", tags=["Consent & Opt-Out Suppression"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["Interview Scheduling & Calendar (.ics)"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notification Logs"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Trail & Governance"])
api_router.include_router(reports.router, prefix="/reports", tags=["Analytics & Deliverable Exports"])
api_router.include_router(settings.router, prefix="/settings", tags=["Governance & Compliance Settings"])

