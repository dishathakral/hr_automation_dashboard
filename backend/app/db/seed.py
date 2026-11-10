from datetime import datetime, timedelta
from app.db.session import SessionLocal, Base, engine
from app.models.entities import (
    User, Job, Candidate, Resume, Application, ScreeningResult,
    HRDecision, ConsentRecord, CallLog, Interview, Notification, AuditLog
)
from app.core.security import get_password_hash
from app.services.interview_service import generate_meeting_link

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if data already exists
    if db.query(User).first():
        db.close()
        return

    print("Seeding initial recruitment database with realistic test dataset...")

    # 1. Users & Demo Accounts
    admin_user = User(
        email="admin@recruitment.internal",
        password_hash=get_password_hash("Admin@HR2026!"),
        full_name="Priya Sharma (HR Lead)",
        role="HR_ADMIN",
        is_active=True
    )
    manager_user = User(
        email="manager@recruitment.internal",
        password_hash=get_password_hash("Manager@HR2026!"),
        full_name="Rahul Verma (Hiring Manager)",
        role="HIRING_MANAGER",
        is_active=True
    )
    db.add_all([admin_user, manager_user])
    db.flush()

    # 2. Three Realistic Job Postings (Task 1 Deliverable)
    job1 = Job(
        title="Senior Full-Stack Engineer (React & Node.js)",
        department="Engineering",
        employment_type="FULL_TIME",
        location="Bangalore, Karnataka",
        work_model="HYBRID",
        experience_level="4 - 7 Years",
        salary_min=1800000,
        salary_max=2800000,
        currency="INR",
        job_description="We are seeking an experienced Full-Stack Engineer to architect and build scalable web applications. You will work closely with our product and design teams to deliver responsive interfaces and high-performance backend microservices.",
        required_skills=["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs", "Tailwind CSS"],
        preferred_skills=["Docker", "AWS", "GraphQL", "Redis", "Microservices"],
        screening_weights={"skills": 40, "experience": 30, "education": 15, "logistics": 15},
        status="ACTIVE",
        is_demo=True,
        indeed_reference_id="IND-DEMO-2026-ENG01",
        indeed_post_url=None,
        posted_at=datetime.utcnow() - timedelta(days=12)
    )

    job2 = Job(
        title="HR Operations & Talent Acquisition Executive",
        department="Human Resources",
        employment_type="FULL_TIME",
        location="Mumbai, Maharashtra",
        work_model="ON_SITE",
        experience_level="2 - 5 Years",
        salary_min=650000,
        salary_max=1000000,
        currency="INR",
        job_description="Seeking a dedicated HR professional to manage the recruitment lifecycle, candidate communications, screening, and HR compliance under Indian labor regulations.",
        required_skills=["Talent Sourcing", "Candidate Screening", "ATS Management", "HR Operations", "Onboarding"],
        preferred_skills=["Indian Labor Laws", "Payroll Coordination", "Campus Hiring", "HR Analytics"],
        screening_weights={"skills": 35, "experience": 35, "education": 15, "logistics": 15},
        status="ACTIVE",
        is_demo=True,
        indeed_reference_id="IND-DEMO-2026-HR02",
        indeed_post_url=None,
        posted_at=datetime.utcnow() - timedelta(days=10)
    )

    job3 = Job(
        title="Inside Sales & Business Development Associate",
        department="Sales & Revenue",
        employment_type="FULL_TIME",
        location="Delhi NCR",
        work_model="REMOTE",
        experience_level="1 - 3 Years",
        salary_min=500000,
        salary_max=850000,
        currency="INR",
        job_description="Drive pipeline growth by qualifying leads, scheduling prospect demonstrations, and nurturing customer relationships for our B2B SaaS platform.",
        required_skills=["Lead Generation", "Cold Calling", "CRM / Salesforce", "Client Communication", "Negotiation"],
        preferred_skills=["B2B SaaS Sales", "Email Outreach", "Product Demos", "Inbound Qualification"],
        screening_weights={"skills": 40, "experience": 25, "education": 15, "logistics": 20},
        status="ACTIVE",
        is_demo=True,
        indeed_reference_id="IND-DEMO-2026-SALES03",
        indeed_post_url=None,
        posted_at=datetime.utcnow() - timedelta(days=8)
    )

    db.add_all([job1, job2, job3])
    db.flush()

    # 3. 16 Realistic Candidates spanning ALL 6 Categories
    raw_candidates = [
        # RELEVANT / SUITABLE
        {
            "name": "Arjun Mehta",
            "email": "arjun.mehta@devmail.in",
            "phone": "+919810123456",
            "city": "Bangalore",
            "title": "Senior Frontend Developer",
            "exp": 5.5,
            "edu": "B.Tech in Computer Science",
            "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs", "Tailwind CSS"],
            "job": job1,
            "category": "RELEVANT_SUITABLE",
            "cat_reason": "High skill alignment across React and Node.js stack with 5.5 years verified full-stack experience in Bangalore.",
            "score": 92,
            "ai_rec": "SHORTLISTED",
            "call_outcome": "ANSWERED_INTERESTED",
            "interview": True
        },
        {
            "name": "Neha Patil",
            "email": "neha.patil@talentrec.com",
            "phone": "+919820234567",
            "city": "Mumbai",
            "title": "Talent Acquisition Specialist",
            "exp": 4.0,
            "edu": "MBA in Human Resources",
            "skills": ["Talent Sourcing", "Candidate Screening", "ATS Management", "HR Operations", "Onboarding"],
            "job": job2,
            "category": "RELEVANT_SUITABLE",
            "cat_reason": "Strong HR talent acquisition background with 4 years experience matching core sourcing and onboarding requirements in Mumbai.",
            "score": 88,
            "ai_rec": "SHORTLISTED",
            "call_outcome": "ANSWERED_INTERESTED",
            "interview": True
        },
        {
            "name": "Vikram Malhotra",
            "email": "vikram.m@growthmail.in",
            "phone": "+919899345678",
            "city": "Delhi NCR",
            "title": "Inside Sales Executive",
            "exp": 2.5,
            "edu": "B.Com / Marketing",
            "skills": ["Lead Generation", "Cold Calling", "CRM / Salesforce", "Client Communication", "Negotiation"],
            "job": job3,
            "category": "RELEVANT_SUITABLE",
            "cat_reason": "Exemplary track record in B2B phone outreach, CRM hygiene, and lead qualification.",
            "score": 85,
            "ai_rec": "SHORTLISTED",
            "call_outcome": "ANSWERED_INTERESTED",
            "interview": True
        },
        # EXPERIENCED
        {
            "name": "Rajesh Nair",
            "email": "rajesh.nair@techcorp.in",
            "phone": "+919845456789",
            "city": "Bangalore",
            "title": "Principal Architect / Lead",
            "exp": 9.0,
            "edu": "M.Tech in Software Engineering",
            "skills": ["React", "TypeScript", "Node.js", "Docker", "PostgreSQL", "AWS", "Microservices"],
            "job": job1,
            "category": "EXPERIENCED",
            "cat_reason": "Senior practitioner with 9.0 years of deep engineering experience, architecture leadership, and technical breadth.",
            "score": 95,
            "ai_rec": "SHORTLISTED",
            "call_outcome": "ANSWERED_INTERESTED",
            "interview": True
        },
        {
            "name": "Sunita Menon",
            "email": "sunita.menon@hrmanagers.in",
            "phone": "+919821567890",
            "city": "Mumbai",
            "title": "Senior Manager - People Operations",
            "exp": 7.5,
            "edu": "Master of Social Work / HR",
            "skills": ["Talent Sourcing", "HR Operations", "Indian Labor Laws", "ATS Management", "Employee Relations"],
            "job": job2,
            "category": "EXPERIENCED",
            "cat_reason": "Deep HR leadership with 7.5 years domain expertise in statutory compliance and talent acquisition.",
            "score": 90,
            "ai_rec": "SHORTLISTED",
            "call_outcome": "CALLBACK_REQUESTED",
            "interview": False
        },
        # PARTIALLY RELEVANT
        {
            "name": "Ananya Rao",
            "email": "ananya.rao@webdevs.in",
            "phone": "+919880678901",
            "city": "Hyderabad",
            "title": "Frontend Engineer",
            "exp": 3.0,
            "edu": "B.E in Information Technology",
            "skills": ["React", "JavaScript", "HTML/CSS", "Git"],
            "job": job1,
            "category": "PARTIALLY_RELEVANT",
            "cat_reason": "Strong frontend capabilities in React, but lacks backend Node.js and PostgreSQL production experience; based in Hyderabad.",
            "score": 64,
            "ai_rec": "ON_HOLD",
            "call_outcome": "NO_ANSWER",
            "interview": False
        },
        {
            "name": "Rohan Gupta",
            "email": "rohan.gupta@bizdev.in",
            "phone": "+919711789012",
            "city": "Jaipur",
            "title": "Customer Support Representative",
            "exp": 2.0,
            "edu": "BBA",
            "skills": ["Client Communication", "CRM / Salesforce", "Ticketing"],
            "job": job3,
            "category": "PARTIALLY_RELEVANT",
            "cat_reason": "Customer-facing background with good communication, but lacks proactive cold calling and outbound prospecting experience.",
            "score": 58,
            "ai_rec": "ON_HOLD",
            "call_outcome": "BUSY",
            "interview": False
        },
        # FRESHER
        {
            "name": "Sneha Deshmukh",
            "email": "sneha.deshmukh@campusgrads.in",
            "phone": "+919822890123",
            "city": "Pune",
            "title": "Graduate Trainee / Intern",
            "exp": 0.6,
            "edu": "B.Tech in Computer Science (2025)",
            "skills": ["React", "JavaScript", "Node.js", "Python"],
            "job": job1,
            "category": "FRESHER",
            "cat_reason": "Recent 2025 engineering graduate with 6 months internship experience; demonstrates solid academic foundational skills.",
            "score": 52,
            "ai_rec": "ON_HOLD",
            "call_outcome": "ANSWERED_NOT_INTERESTED",
            "interview": False
        },
        {
            "name": "Pooja Iyer",
            "email": "pooja.iyer@salesfresh.in",
            "phone": "+919840901234",
            "city": "Chennai",
            "title": "Junior Business Development Intern",
            "exp": 0.4,
            "edu": "B.A in Economics",
            "skills": ["Lead Generation", "Client Communication", "Canva"],
            "job": job3,
            "category": "FRESHER",
            "cat_reason": "High-energy entry level candidate with 4 months internship; enthusiastic communication style.",
            "score": 50,
            "ai_rec": "ON_HOLD",
            "call_outcome": "ANSWERED_INTERESTED",
            "interview": False
        },
        # NOT RELEVANT
        {
            "name": "Dinesh Kumar",
            "email": "dinesh.k@autotech.in",
            "phone": "+919830012345",
            "city": "Kolkata",
            "title": "Mechanical Maintenance Supervisor",
            "exp": 6.0,
            "edu": "Diploma in Mechanical Engineering",
            "skills": ["AutoCAD", "Plant Maintenance", "Hydraulics", "Safety Auditing"],
            "job": job1,
            "category": "NOT_RELEVANT",
            "cat_reason": "Candidate skillset is in industrial mechanical maintenance with zero overlap with software engineering requisites.",
            "score": 22,
            "ai_rec": "NOT_SHORTLISTED",
            "call_outcome": None,
            "interview": False
        },
        {
            "name": "Alok Sharma",
            "email": "alok.s@financeops.in",
            "phone": "+919920123789",
            "city": "Mumbai",
            "title": "Accounts & Bookkeeping Assistant",
            "exp": 3.0,
            "edu": "B.Com",
            "skills": ["Tally ERP", "Tax Filing", "Invoicing", "Bank Reconciliation"],
            "job": job2,
            "category": "NOT_RELEVANT",
            "cat_reason": "Candidate experience is in commercial accounting and tax auditing rather than talent acquisition and HR management.",
            "score": 28,
            "ai_rec": "NOT_SHORTLISTED",
            "call_outcome": None,
            "interview": False
        },
        # INCOMPLETE PROFILE
        {
            "name": "Karthik Sundaram",
            "email": "karthik.s@tempmail.in",
            "phone": "+919980234890",
            "city": "Bangalore",
            "title": "",
            "exp": 0.0,
            "edu": "",
            "skills": [],
            "job": job1,
            "category": "INCOMPLETE_PROFILE",
            "cat_reason": "Application submitted without resume document, work history, or education qualifications listed.",
            "score": 15,
            "ai_rec": "NOT_SHORTLISTED",
            "call_outcome": "INVALID_NUMBER",
            "interview": False
        },
        # OPT-OUT DEMO CANDIDATE
        {
            "name": "Manish Verma",
            "email": "manish.verma@salesout.in",
            "phone": "+919811345901",
            "city": "Delhi NCR",
            "title": "Field Sales Officer",
            "exp": 3.0,
            "edu": "BBA",
            "skills": ["Cold Calling", "Lead Generation", "Client Communication"],
            "job": job3,
            "category": "PARTIALLY_RELEVANT",
            "cat_reason": "Candidate has direct sales background but opted out during screening call.",
            "score": 62,
            "ai_rec": "ON_HOLD",
            "call_outcome": "OPTED_OUT",
            "interview": False
        }
    ]

    for item in raw_candidates:
        cand = Candidate(
            full_name=item["name"],
            email=item["email"],
            phone_raw=item["phone"],
            phone_normalized=item["phone"],
            current_city=item["city"],
            current_title=item["title"],
            total_experience_years=item["exp"],
            highest_education=item["edu"],
            skills=item["skills"],
            is_duplicate=False
        )
        db.add(cand)
        db.flush()

        # Resume text
        resume_content = f"""RESUME: {cand.full_name}
Email: {cand.email} | Phone: {cand.phone_normalized} | Location: {cand.current_city}
Current Role: {cand.current_title} | Experience: {cand.total_experience_years} Years
Education: {cand.highest_education}

CORE COMPETENCIES & SKILLS:
{', '.join(cand.skills)}

PROFESSIONAL SUMMARY:
Experienced professional dedicated to delivering excellence in {item['job'].department} initiatives. Demonstrated success managing end-to-end deliverables and collaborating across cross-functional stakeholder groups.
"""
        resume = Resume(
            candidate_id=cand.id,
            file_name=f"{cand.full_name.replace(' ', '_')}_Resume.pdf",
            file_size_bytes=len(resume_content.encode('utf-8')),
            mime_type="application/pdf",
            storage_path=f"/resumes/{cand.id}_cv.pdf",
            parsed_text=resume_content,
            extracted_skills=cand.skills,
            extracted_experience=[{"title": cand.current_title, "years": cand.total_experience_years}]
        )
        db.add(resume)
        db.flush()

        # Consent record
        is_opted_out = (item.get("call_outcome") == "OPTED_OUT")
        consent = ConsentRecord(
            candidate_id=cand.id,
            phone_normalized=cand.phone_normalized,
            consent_channel="APPLICATION_FORM",
            consent_status="OPTED_OUT" if is_opted_out else "CONSENT_GRANTED",
            terms_version="v1.0-2026",
            opt_out_timestamp=datetime.utcnow() if is_opted_out else None,
            opt_out_reason="Opted out via IVR prompt Press 9" if is_opted_out else None
        )
        db.add(consent)

        # Application
        app_stage = "INTERVIEW_SCHEDULED" if item.get("interview") else ("CALLED" if item.get("call_outcome") else "SCREENED")
        app = Application(
            candidate_id=cand.id,
            job_id=item["job"].id,
            resume_id=resume.id,
            source="INDEED_IMPORT",
            category=item["category"],
            category_reason=item["cat_reason"],
            stage=app_stage,
            applied_at=datetime.utcnow() - timedelta(days=5)
        )
        db.add(app)
        db.flush()

        # Screening Result
        score = item["score"]
        sr = ScreeningResult(
            application_id=app.id,
            suitability_score=score,
            skills_score=int(score * 0.4),
            experience_score=int(score * 0.3),
            education_score=int(score * 0.15),
            logistics_score=int(score * 0.15),
            matching_strengths=[
                f"Possesses {cand.total_experience_years} years experience in {cand.current_title or 'the field'}.",
                f"Verified alignment on skills: {', '.join(cand.skills[:3]) if cand.skills else 'Entry background'}."
            ],
            missing_skills=["Advanced cloud tools"] if score < 85 else [],
            potential_concerns=["Notice period to be verified on screening call."] if score >= 70 else ["Tenure / skillset variance from core requisites."],
            suggested_interview_questions=[
                f"How would you apply your experience in {cand.skills[0] if cand.skills else 'your previous role'} to this vacancy?",
                "What is your target notice period and availability?"
            ],
            clear_explanation=f"Profile evaluated against {item['job'].title} specifications. Score: {score}/100.",
            ai_recommended_status=item["ai_rec"],
            engine_used="LOCAL_HEURISTIC",
            is_external_api=False,
            screened_at=datetime.utcnow() - timedelta(days=4)
        )
        db.add(sr)

        # HR Decision (Human in the loop approval)
        hr_dec = HRDecision(
            application_id=app.id,
            reviewer_id=admin_user.id,
            final_decision=item["ai_rec"],
            is_override=False,
            decision_notes="HR verified initial scorecard recommendation.",
            decided_at=datetime.utcnow() - timedelta(days=3)
        )
        db.add(hr_dec)

        # Call Log if called
        if item.get("call_outcome"):
            call_log = CallLog(
                application_id=app.id,
                caller_user_id=admin_user.id,
                phone_number=cand.phone_normalized,
                provider_mode="SIMULATOR",
                call_timestamp=datetime.utcnow() - timedelta(days=2),
                duration_seconds=55 if item["call_outcome"] == "ANSWERED_INTERESTED" else 15,
                outcome=item["call_outcome"],
                consent_granted=not is_opted_out,
                opt_out_requested=is_opted_out,
                callback_requested=(item["call_outcome"] == "CALLBACK_REQUESTED"),
                call_transcript=[
                    {"step": 1, "prompt": "Informed consent prompt", "response": "Opt-Out (Press 9)" if is_opted_out else "Granted (Press 1)"},
                    {"step": 2, "prompt": "Availability & Location check", "response": "Confirmed"} if not is_opted_out else {},
                    {"step": 3, "prompt": "Interview confirmation", "response": "Interested"} if item["call_outcome"] == "ANSWERED_INTERESTED" else {}
                ],
                simulation_step_reached="Step 3: Interview Willingness" if item["call_outcome"] == "ANSWERED_INTERESTED" else "Step 1: Introduction"
            )
            db.add(call_log)

        # Interview if scheduled
        if item.get("interview"):
            interview_mode = "GOOGLE_MEET" if "Eng" in item["job"].title else ("IN_PERSON" if "HR" in item["job"].title else "ZOOM")
            link_or_venue = generate_meeting_link(interview_mode, cand.full_name, item["job"].title)
            sched_time = datetime.utcnow() + timedelta(days=2, hours=3)
            
            interview = Interview(
                application_id=app.id,
                interviewer_name="Rahul Verma (Hiring Manager)" if "Eng" in item["job"].title else "Priya Sharma (HR Lead)",
                interviewer_email="interviewer@recruitment.internal",
                scheduled_at=sched_time,
                duration_minutes=45,
                interview_mode=interview_mode,
                meeting_link_or_venue=link_or_venue,
                confirmation_status="SCHEDULED",
                special_instructions="Please have your resume and code samples ready for discussion.",
                ics_uid=f"interview-{cand.id[:8]}@recruitment.internal"
            )
            db.add(interview)

            # Notification
            notif = Notification(
                application_id=app.id,
                candidate_id=cand.id,
                channel="EMAIL",
                notification_type="INTERVIEW_INVITE",
                recipient_target=cand.email,
                subject=f"Confirmed: Interview for {item['job'].title}",
                body_text=f"Dear {cand.full_name}, your technical interview is scheduled for {sched_time.strftime('%d %b %Y at %I:%M %p')}.",
                delivery_status="SIMULATED_SENT"
            )
            db.add(notif)

    # Add initial audit log entry
    audit = AuditLog(
        actor_id=admin_user.id,
        actor_email=admin_user.email,
        entity_type="JOB",
        entity_id=job1.id,
        action="CREATE",
        changes={"title": job1.title, "seeded": True},
        rationale="System initialization and initial seed data loading"
    )
    db.add(audit)

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()

