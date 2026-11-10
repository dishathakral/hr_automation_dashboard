import csv
import io
import os
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch

# Use an isolated temporary test database so tests never pollute local runtime data
TEST_DB_PATH = "/tmp/test_hr_recruitment_workflow.db"
if os.path.exists(TEST_DB_PATH):
    os.remove(TEST_DB_PATH)
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402


def _admin_headers(client: TestClient) -> dict:
    res = client.post(
        "/api/v1/auth/token",
        json={"email": "admin@recruitment.internal", "password": "Admin@HR2026!"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_system_health():
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"
        assert res.json()["database"] == "connected"


def test_authentication_and_rbac_permissions():
    with TestClient(app) as client:
        # 1. Valid credential login for both roles
        r_admin = client.post(
            "/api/v1/auth/token",
            json={"email": "admin@recruitment.internal", "password": "Admin@HR2026!"},
        )
        assert r_admin.status_code == 200
        assert r_admin.json()["role"] == "HR_ADMIN"

        r_mgr = client.post(
            "/api/v1/auth/token",
            json={"email": "manager@recruitment.internal", "password": "Manager@HR2026!"},
        )
        assert r_mgr.status_code == 200
        assert r_mgr.json()["role"] == "HIRING_MANAGER"
        mgr_headers = {"Authorization": f"Bearer {r_mgr.json()['access_token']}"}

        # 2. Invalid password must be rejected with 401
        r_bad = client.post(
            "/api/v1/auth/token",
            json={"email": "admin@recruitment.internal", "password": "WrongPassword!"},
        )
        assert r_bad.status_code == 401

        # 3. Hiring Manager blocked from HR Admin endpoints (403 Forbidden)
        r_job = client.post(
            "/api/v1/jobs",
            json={
                "title": "Unauthorized Job",
                "department": "Engineering",
                "employment_type": "FULL_TIME",
                "location": "Bangalore",
                "work_model": "HYBRID",
                "experience_level": "3 Years",
                "salary_min": 1000000,
                "salary_max": 1500000,
                "job_description": "test",
                "indeed_reference_id": "TEST-UNAUTH",
            },
            headers=mgr_headers,
        )
        assert r_job.status_code == 403

        r_settings = client.patch(
            "/api/v1/settings",
            json={"allow_external_ai_processing": True},
            headers=mgr_headers,
        )
        assert r_settings.status_code == 403


def test_task_1_indeed_postings_minimum_three_and_no_fake_urls():
    with TestClient(app) as client:
        headers = _admin_headers(client)
        res = client.get("/api/v1/jobs", headers=headers)
        assert res.status_code == 200
        jobs = res.json()
        assert len(jobs) >= 3

        for job in jobs:
            assert job["indeed_reference_id"].startswith("IND-DEMO-")
            assert job["is_demo"] is True
            assert job["indeed_post_url"] is None  # Never generate fake Indeed URLs
            assert job["status"] == "ACTIVE"


def test_task_2_six_tiers_duplicates_multijob_and_missing_resume():
    with TestClient(app) as client:
        headers = _admin_headers(client)
        jobs = client.get("/api/v1/jobs", headers=headers).json()
        job_a, job_b = jobs[0], jobs[1]

        # 1. Verify all 6 categories present in seeded pool
        apps = client.get("/api/v1/applicants", headers=headers).json()
        categories = {a["category"] for a in apps}
        expected_tiers = {
            "RELEVANT_SUITABLE",
            "PARTIALLY_RELEVANT",
            "NOT_RELEVANT",
            "EXPERIENCED",
            "FRESHER",
            "INCOMPLETE_PROFILE",
        }
        assert expected_tiers.issubset(categories)

        # 2. Missing resume -> automatically categorized as INCOMPLETE_PROFILE
        unique_email = f"noresume_{uuid.uuid4().hex[:6]}@example.in"
        r_incomplete = client.post(
            "/api/v1/applicants",
            json={
                "job_id": job_a["id"],
                "full_name": "Missing Resume Applicant",
                "email": unique_email,
                "phone_raw": "+919876500111",
                "current_city": "Bangalore",
                "current_title": "Developer",
                "total_experience_years": 3.0,
                "highest_education": "B.Tech",
                "skills": ["React"],
                "resume_text": "",
            },
            headers=headers,
        )
        assert r_incomplete.status_code == 201
        inc_app = r_incomplete.json()
        assert inc_app["category"] == "INCOMPLETE_PROFILE"
        cand_id = inc_app["candidate_id"]

        # 3. Upload & parse resume for that candidate
        r_up = client.post(
            f"/api/v1/candidates/{cand_id}/resumes",
            files={"file": ("cv.txt", b"Senior engineer skilled in React, TypeScript, Node.js, PostgreSQL.", "text/plain")},
            headers=headers,
        )
        assert r_up.status_code == 200
        assert "PostgreSQL" in r_up.json()["extracted_skills"]

        # 4. Multiple applications from one candidate across two different jobs
        r_second_job = client.post(
            "/api/v1/applicants",
            json={
                "job_id": job_b["id"],
                "full_name": "Missing Resume Applicant",
                "email": unique_email,
                "phone_raw": "+919876500111",
                "current_city": "Bangalore",
                "current_title": "Developer",
                "total_experience_years": 3.0,
                "highest_education": "B.Tech",
                "skills": ["Talent Sourcing"],
                "resume_text": "Detailed resume covering 3 years of talent sourcing and HR operations.",
            },
            headers=headers,
        )
        assert r_second_job.status_code == 201
        assert r_second_job.json()["candidate_id"] == cand_id  # Unified candidate profile

        r_hist = client.get(f"/api/v1/candidates/{cand_id}/history", headers=headers)
        assert r_hist.status_code == 200
        assert r_hist.json()["total_applications"] == 2

        # 5. Duplicate application for the SAME job via CSV import
        csv_bytes = (
            "candidate_name,email,phone,city,title,experience_years,education,skills,resume_text\n"
            f"Missing Resume Applicant,{unique_email},+919876500111,Bangalore,Developer,3.0,B.Tech,\"React\",Full resume text over 20 chars\n"
        ).encode("utf-8")
        r_dup = client.post(
            "/api/v1/applicants/import-indeed",
            data={"job_id": job_a["id"]},
            files={"file": ("dup.csv", csv_bytes, "text/csv")},
            headers=headers,
        )
        assert r_dup.status_code == 200
        assert r_dup.json()["duplicates_detected"] >= 1


def test_task_3_ai_screening_override_and_external_api_failure_fallback():
    with TestClient(app) as client:
        headers = _admin_headers(client)
        apps = client.get("/api/v1/applicants", headers=headers).json()
        target_app = apps[0]

        # Test external AI failure falls back safely to LOCAL_HEURISTIC
        orig_allow = settings.ALLOW_EXTERNAL_AI_PROCESSING
        orig_provider = settings.AI_PROVIDER
        orig_key = settings.GEMINI_API_KEY
        try:
            settings.ALLOW_EXTERNAL_AI_PROCESSING = True
            settings.AI_PROVIDER = "GEMINI_API"
            settings.GEMINI_API_KEY = "invalid-test-key"

            with patch("httpx.AsyncClient.post", side_effect=RuntimeError("Simulated Gemini outage")):
                res = client.post(f"/api/v1/screening/evaluate/{target_app['id']}", headers=headers)
                assert res.status_code == 200
                data = res.json()
                assert data["engine_used"] == "LOCAL_HEURISTIC"
                assert data["is_external_api"] is False
                assert 0 <= data["suitability_score"] <= 100
        finally:
            settings.ALLOW_EXTERNAL_AI_PROCESSING = orig_allow
            settings.AI_PROVIDER = orig_provider
            settings.GEMINI_API_KEY = orig_key

        # Test HR Override requires rationale and updates GET /screening/{id}
        override_target = "SHORTLISTED" if data["ai_recommended_status"] != "SHORTLISTED" else "ON_HOLD"
        bad_override = client.post(
            "/api/v1/screening/decision",
            json={"application_id": target_app["id"], "final_decision": override_target},
            headers=headers,
        )
        assert bad_override.status_code == 400

        ok_override = client.post(
            "/api/v1/screening/decision",
            json={
                "application_id": target_app["id"],
                "final_decision": override_target,
                "override_reason": "Notice period exceeds 60 days.",
            },
            headers=headers,
        )
        assert ok_override.status_code == 200

        sc = client.get(f"/api/v1/screening/{target_app['id']}", headers=headers).json()
        assert sc["hr_final_status"] == override_target
        assert sc["is_override"] is True
        assert "Notice period" in sc["override_reason"]


def test_task_4_indian_phone_validation_consent_withdrawal_and_call_blocking():
    with TestClient(app) as client:
        headers = _admin_headers(client)

        # 1. Valid Indian mobile numbers
        r_valid = client.post("/api/v1/calling/validate-phone", json={"phone_number": "9845456789"}, headers=headers)
        assert r_valid.status_code == 200
        assert r_valid.json()["is_valid_indian_mobile"] is True
        assert r_valid.json()["normalized_number"] == "+919845456789"

        # 2. Invalid Indian phone numbers (too short, invalid prefix 5, landline)
        for bad_num in ["12345", "+915123456789", "01123456789"]:
            r_inv = client.post("/api/v1/calling/validate-phone", json={"phone_number": bad_num}, headers=headers)
            assert r_inv.status_code == 200
            assert r_inv.json()["is_valid_indian_mobile"] is False

        # 3. Multi-step call simulation + Opt-out suppression blocking future calls
        jobs = client.get("/api/v1/jobs", headers=headers).json()
        r_cand = client.post(
            "/api/v1/applicants",
            json={
                "job_id": jobs[0]["id"],
                "full_name": "Consent Test Candidate",
                "email": "consent.test@example.in",
                "phone_raw": "+919811999777",
                "current_city": "Delhi",
                "current_title": "Engineer",
                "total_experience_years": 4.0,
                "highest_education": "B.Tech",
                "skills": ["React", "Node.js"],
                "resume_text": "4 years full stack engineering experience in React and Node.js.",
            },
            headers=headers,
        )
        app_id = r_cand.json()["id"]

        # Simulate step 1 -> 2 -> 3 (allow outside hours for 24/7 CI testing)
        s1 = client.post(
            "/api/v1/calling/simulate-call",
            json={"application_id": app_id, "step": 1, "candidate_action": "PRESS_1", "allow_outside_hours_simulation": True},
            headers=headers,
        )
        assert s1.status_code == 200
        assert s1.json()["is_call_ended"] is False

        # Withdraw consent via opt-out endpoint
        r_opt = client.post(
            "/api/v1/consent/opt-out",
            json={"phone_number": "+919811999777", "reason": "Candidate withdrew consent"},
            headers=headers,
        )
        assert r_opt.status_code == 200
        assert r_opt.json()["consent_status"] == "OPTED_OUT"

        # Verify compliance-status reports blocked and simulate-call is blocked with 400
        comp = client.get(f"/api/v1/calling/compliance-status/{app_id}", headers=headers).json()
        assert comp["eligible"] is False
        assert "opted out" in comp["block_reason"].lower()

        blocked = client.post(
            "/api/v1/calling/simulate-call",
            json={"application_id": app_id, "step": 2, "candidate_action": "PRESS_1", "allow_outside_hours_simulation": True},
            headers=headers,
        )
        assert blocked.status_code == 400


def test_task_5_interview_conflict_ics_and_export_accuracy():
    with TestClient(app) as client:
        headers = _admin_headers(client)
        apps = client.get("/api/v1/applicants", headers=headers).json()
        interviews = client.get("/api/v1/interviews", headers=headers).json()
        assert len(interviews) >= 4

        # 1. Schedule new interview and verify collision detection (409)
        slot_time = (datetime.utcnow() + timedelta(days=5)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat()
        r_sched = client.post(
            "/api/v1/interviews",
            json={
                "application_id": apps[0]["id"],
                "interviewer_name": "Vikram Seth (Product Director)",
                "interviewer_email": "vikram.seth@recruitment.internal",
                "scheduled_at": slot_time,
                "duration_minutes": 45,
                "interview_mode": "GOOGLE_MEET",
            },
            headers=headers,
        )
        assert r_sched.status_code == 201
        assert "[SIMULATED PLACEHOLDER]" in r_sched.json()["meeting_link_or_venue"]

        # Double-book exact same interviewer at overlapping time -> 409 Conflict
        r_conflict = client.post(
            "/api/v1/interviews",
            json={
                "application_id": apps[1]["id"],
                "interviewer_name": "Vikram Seth (Product Director)",
                "interviewer_email": "vikram.seth@recruitment.internal",
                "scheduled_at": slot_time,
                "duration_minutes": 45,
                "interview_mode": "ZOOM",
            },
            headers=headers,
        )
        assert r_conflict.status_code == 409

        # 2. Download RFC 5545 .ics invite
        ics_res = client.get(f"/api/v1/interviews/{r_sched.json()['id']}/ics", headers=headers)
        assert ics_res.status_code == 200
        assert "BEGIN:VCALENDAR" in ics_res.text
        assert "TRIGGER:-PT15M" in ics_res.text

        # 3. Verify CSV Export Accuracy for all 5 deliverables
        jobs_count = len(client.get("/api/v1/jobs", headers=headers).json())
        apps_count = len(client.get("/api/v1/applicants", headers=headers).json())
        calls_count = len(client.get("/api/v1/calling/logs", headers=headers).json())
        interviews_count = len(client.get("/api/v1/interviews", headers=headers).json())

        expected_counts = [
            ("indeed-tracker", jobs_count),
            ("applicant-summary", apps_count),
            ("filtered-database", apps_count),
            ("call-log-report", calls_count),
            ("interview-schedule", interviews_count),
        ]
        for sheet, expected_rows in expected_counts:
            exp_res = client.get(f"/api/v1/reports/deliverable/{sheet}/export", headers=headers)
            assert exp_res.status_code == 200
            rows = list(csv.reader(io.StringIO(exp_res.text)))
            assert len(rows) - 1 == expected_rows, f"{sheet}: expected {expected_rows} data rows, got {len(rows) - 1}"
