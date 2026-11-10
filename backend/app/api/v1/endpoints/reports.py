import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.entities import Job, Application, Candidate, ScreeningResult, HRDecision, CallLog, Interview, User
from app.schemas import KPIOverviewResponse

router = APIRouter()

@router.get("/kpis", response_model=KPIOverviewResponse)
def get_kpi_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_jobs = db.query(Job).filter(Job.status == "ACTIVE").count()
    total_apps = db.query(Application).count()

    # Category counts
    categories = ["RELEVANT_SUITABLE", "PARTIALLY_RELEVANT", "NOT_RELEVANT", "EXPERIENCED", "FRESHER", "INCOMPLETE_PROFILE"]
    cat_counts = {}
    for c in categories:
        cat_counts[c] = db.query(Application).filter(Application.category == c).count()

    shortlisted = db.query(Application).join(ScreeningResult).filter(ScreeningResult.ai_recommended_status == "SHORTLISTED").count()
    calls_completed = db.query(CallLog).count()
    interested_candidates = db.query(CallLog).filter(CallLog.outcome == "ANSWERED_INTERESTED").count()
    interviews_scheduled = db.query(Interview).filter(Interview.confirmation_status != "DECLINED").count()

    contact_rate = round((calls_completed / max(shortlisted, 1)) * 100, 1)
    conversion_rate = round((interviews_scheduled / max(total_apps, 1)) * 100, 1)

    funnel = {
        "Applications Received": total_apps,
        "Categorised & Filtered": total_apps,
        "AI Screened": db.query(ScreeningResult).count(),
        "Shortlisted": shortlisted,
        "Contacted (Telephony)": calls_completed,
        "Interested": interested_candidates,
        "Interviews Scheduled": interviews_scheduled
    }

    return KPIOverviewResponse(
        active_jobs_count=active_jobs,
        total_applications_count=total_apps,
        category_counts=cat_counts,
        shortlisted_count=shortlisted,
        calls_completed_count=calls_completed,
        interested_candidates_count=interested_candidates,
        interviews_scheduled_count=interviews_scheduled,
        conversion_rate_percentage=conversion_rate,
        contact_rate_percentage=contact_rate,
        funnel=funnel
    )

@router.get("/deliverable/{sheet_type}/export")
def export_deliverable_csv(
    sheet_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exports CSV reports directly mapping to the 5 assignment deliverables.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    if sheet_type == "indeed-tracker":
        # Deliverable 1: Indeed Posting Tracker
        writer.writerow([
            "Requisition ID", "Job Title", "Department", "Location", "Employment Type",
            "Salary Range (INR)", "Posting Date", "Posting Status", "Indeed Reference / URL", "Demonstration Badge"
        ])
        jobs = db.query(Job).order_by(Job.created_at.desc()).all()
        for j in jobs:
            writer.writerow([
                j.id,
                j.title,
                j.department,
                f"{j.location} ({j.work_model})",
                j.employment_type,
                f"₹{j.salary_min:,} - ₹{j.salary_max:,}",
                j.posted_at.strftime("%Y-%m-%d") if j.posted_at else "Draft",
                j.status,
                j.indeed_post_url or j.indeed_reference_id,
                "Sample Requisition (Demo)" if j.is_demo else "Live Indeed Listing"
            ])
        filename = "Deliverable_1_Indeed_Posting_Tracker.csv"

    elif sheet_type == "applicant-summary":
        # Deliverable 2: Applicant Categorisation Summary
        writer.writerow([
            "Application ID", "Candidate Name", "Email", "Phone (Normalized)",
            "Current City", "Job Title Applied", "Assigned Category", "Category Rationale", "Application Date"
        ])
        apps = db.query(Application).all()
        for app in apps:
            cand = app.candidate
            job = app.job
            writer.writerow([
                app.id,
                cand.full_name,
                cand.email,
                cand.phone_normalized,
                cand.current_city,
                job.title if job else "N/A",
                app.category,
                app.category_reason,
                app.applied_at.strftime("%Y-%m-%d %H:%M")
            ])
        filename = "Deliverable_2_Applicant_Categorisation_Summary.csv"

    elif sheet_type == "filtered-database":
        # Deliverable 3: Filtered Candidate Database
        writer.writerow([
            "Candidate Name", "Email", "Phone", "Job Applied For", "Total Experience",
            "Suitability Score (0-100)", "AI Recommendation", "HR Final Status", "HR Override Notes", "Shortlist Priority"
        ])
        apps = db.query(Application).all()
        for app in apps:
            cand = app.candidate
            job = app.job
            sr = app.screening_result
            latest_dec = db.query(HRDecision).filter(HRDecision.application_id == app.id).order_by(HRDecision.decided_at.desc()).first()
            priority = "High" if (sr and sr.suitability_score >= 80) else ("Medium" if (sr and sr.suitability_score >= 60) else "Low")
            hr_status = latest_dec.final_decision if latest_dec else app.stage
            hr_notes = (latest_dec.override_reason or latest_dec.decision_notes) if latest_dec else (sr.clear_explanation if sr else "Awaiting Review")
            writer.writerow([
                cand.full_name,
                cand.email,
                cand.phone_normalized,
                job.title if job else "N/A",
                f"{cand.total_experience_years} yrs",
                sr.suitability_score if sr else "Pending",
                sr.ai_recommended_status if sr else "Pending",
                hr_status,
                hr_notes,
                priority
            ])
        filename = "Deliverable_3_Filtered_Candidate_Database.csv"

    elif sheet_type == "call-log-report":
        # Deliverable 4: Automated Calling & Telephony Log
        writer.writerow([
            "Call Log ID", "Candidate Name", "Phone (+91)", "Provider Mode",
            "Call Timestamp (IST)", "Duration (Seconds)", "Call Outcome", "Consent Verified", "Opt-Out Flagged", "Script Step Reached"
        ])
        calls = db.query(CallLog).order_by(CallLog.call_timestamp.desc()).all()
        for c in calls:
            app = c.application
            cand = app.candidate if app else None
            writer.writerow([
                c.id,
                cand.full_name if cand else "Unknown",
                c.phone_number,
                c.provider_mode,
                c.call_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                c.duration_seconds,
                c.outcome,
                "Yes" if c.consent_granted else "No",
                "Yes" if c.opt_out_requested else "No",
                c.simulation_step_reached
            ])
        filename = "Deliverable_4_Calling_Workflow_Log.csv"

    elif sheet_type == "interview-schedule":
        # Deliverable 5: Interview Schedule Master Sheet
        writer.writerow([
            "Interview ID", "Candidate Name", "Job Position", "Interviewer Name", "Interviewer Email",
            "Date & Time", "Duration (Mins)", "Interview Mode", "Meeting Link / Venue", "Confirmation Status"
        ])
        interviews = db.query(Interview).order_by(Interview.scheduled_at.asc()).all()
        for i in interviews:
            app = i.application
            cand = app.candidate if app else None
            job = app.job if app else None
            writer.writerow([
                i.id,
                cand.full_name if cand else "Candidate",
                job.title if job else "Position",
                i.interviewer_name,
                i.interviewer_email,
                i.scheduled_at.strftime("%Y-%m-%d %I:%M %p"),
                i.duration_minutes,
                i.interview_mode,
                i.meeting_link_or_venue,
                i.confirmation_status
            ])
        filename = "Deliverable_5_Interview_Schedule_Master.csv"

    else:
        raise HTTPException(status_code=404, detail=f"Deliverable report type '{sheet_type}' not recognized")

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

