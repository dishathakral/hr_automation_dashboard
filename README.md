# Antigravity HR — Enterprise Recruitment Workflow Automation Platform

**An end-to-end, compliance-first HR Recruitment Lifecycle Automation System** covering job requisition tracking, deduplicated candidate intake & 6-tier taxonomy classification, explainable AI resume screening with mandatory Human-in-the-Loop governance, Indian telecom (`+91`) TRAI-aware automated IVR call simulation, conflict-free interview scheduling with `.ics` calendar exports, and one-click CSV deliverables.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0%20%2B%20Alembic-D71F00?style=flat-square)](https://www.sqlalchemy.org/)
[![React](https://img.shields.io/badge/React-18%20%2B%20TypeScript-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Privacy](https://img.shields.io/badge/AI%20Privacy-Local--First%20(DPDP%20Ready)-16A34A?style=flat-square)](#demo-vs-live-integration-transparency)
[![Telephony](https://img.shields.io/badge/Telephony-%2B91%20TRAI%20Simulator-2563EB?style=flat-square)](#5-automated-calling-hub-91--interactive-ivr-simulator-task-4)

![Antigravity HR Executive Dashboard](docs/screenshots/01-executive-dashboard.png)

---

## Table of Contents

- [Why Antigravity HR?](#why-antigravity-hr)
- [Demo vs. Live Integration Transparency](#demo-vs-live-integration-transparency)
- [Platform Screenshots & Workflow Walkthrough](#platform-screenshots--workflow-walkthrough)
- [System Architecture & Compliance Diagrams](#system-architecture--compliance-diagrams)
- [Core Modules (Tasks 1–5 + Governance)](#core-modules-tasks-15--governance)
- [Project Structure](#project-structure)
- [REST API Reference & RBAC Matrix](#rest-api-reference--rbac-matrix)
- [Quick Start & Setup](#quick-start--setup)
- [Configuration (`.env`) & Production PostgreSQL + Alembic](#configuration-env--production-postgresql--alembic)
- [Automated Test Suite & Build Verification](#automated-test-suite--build-verification)

---

## Why Antigravity HR?

Most recruitment prototypes stop at basic CRUD forms. **Antigravity HR** is engineered around real operational, legal, and audit requirements:

1. **Separated Candidate & Application Data Model (12 Normalized Tables):** One `Candidate` can apply across multiple `Jobs` (`UniqueConstraint("candidate_id", "job_id")` on `applications`) while maintaining unified identity, cross-job application history, resume versions, and consent records.
2. **Privacy-First Explainable AI (Never Auto-Rejects):** Defaults to an offline `LOCAL_HEURISTIC` scoring engine (`40%` Skills / `30%` Experience / `15%` Education / `15%` Location) so candidate PII never leaves the server without explicit organizational opt-in (`ALLOW_EXTERNAL_AI_PROCESSING=True`). Supports configurable `gemini-2.5-flash` with automatic local fallback if the external API fails. Human recruiters hold final decision authority via mandatory Human-in-the-Loop overrides.
3. **India Telecom (`+91`) TRAI & DPDP Compliance Guardrails:** Validates Indian mobile numbers (`^[6-9]\d{9}$` normalized to `+91XXXXXXXXXX`), resolves telecom circles, enforces configurable calling hours (`10:00–18:00 Asia/Kolkata`), caps outbound attempts (`2` calls/24h, `4h` cooldown), logs explicit consent, and immediately blocks permanently opted-out / DNC numbers.
4. **Honest Engineering:** Clearly labels sample requisitions, simulated calling, simulated notifications, and `[SIMULATED PLACEHOLDER]` meeting links rather than fabricating fake Indeed job URLs or fake live calls.

---

## Demo vs. Live Integration Transparency

| Capability | Current Mode | Details & Requirements for Live Production |
| :--- | :--- | :--- |
| **Database, Auth, RBAC, Deduplication & Exports** | **100% Functional** | Real SQLite (`backend/data/recruitment.db`) or PostgreSQL via SQLAlchemy 2.0 + Alembic migrations, JWT HS256 auth, `bcrypt` passwords, backend `require_role` checks, and live RFC 4180 CSV + RFC 5545 `.ics` generation. |
| **Indeed Job Postings Tracker (Task 1)** | **Local Tracker + Sample Requisitions** | Preloaded demo vacancies use `is_demo=True` and synthetic reference IDs (`IND-DEMO-2026-ENG01`, `IND-DEMO-2026-HR02`, `IND-DEMO-2026-SALES03`) with `indeed_post_url=None`. No fake Indeed URLs are generated. |
| **Applicant Intake & CSV Import (Task 2)** | **Functional (Local + CSV Import)** | Supports manual entry, CSV/Indeed export ingestion (`POST /api/v1/applicants/import-indeed`), skill extraction, 6-tier categorization, multi-job email reuse, and cross-email phone duplicate detection. |
| **AI Screening Co-Pilot (Task 3)** | **Functional (Local Default) / Optional Live Gemini** | Runs offline `LocalHeuristicScreeningProvider` by default. Enabling live `GeminiAIScreeningProvider` (`gemini-2.5-flash`) requires setting `ALLOW_EXTERNAL_AI_PROCESSING=true` and providing a valid `GEMINI_API_KEY`. |
| **Automated Calling & IVR (Task 4)** | **Interactive Simulator (`SIMULATION_MODE=true`)** | Full 3-step interactive IVR (`CALLING_SCRIPTS`), Web Audio dial tone, Web Speech API (`en-IN`) playback, DTMF Press `1`/`2`/`9` handling, consent logging, and DNC suppression. Live Exotel calls remain inactive until `SIMULATION_MODE=false` and `EXOTEL_*` credentials are set; bulk mass calling is locked (`BULK_CALLS_ENABLED=false`). |
| **Notifications & Video Meeting Links (Task 5)** | **Simulated Dispatch / Functional `.ics`** | Notification dispatches (Email/SMS/WhatsApp) are recorded as audit entries in the `notifications` table. Online Google Meet/Zoom URLs default to `[SIMULATED PLACEHOLDER]` unless supplied manually or connected to a calendar API. Downloadable `.ics` invites are real RFC 5545 calendar files with `TRIGGER:-PT15M` reminders. |

---

## Platform Screenshots & Workflow Walkthrough

### 1. Executive Dashboard & Conversion Funnel
Real-time recruitment KPIs (Active Vacancies, Total Applicants across 6 categories, AI Shortlisted, Interviews Booked), end-to-end conversion funnel progress bars, and the Recruiter Action Center.

![Executive Dashboard](docs/screenshots/01-executive-dashboard.png)

---

### 2. Indeed Job Postings & Requisition Tracker (`Task 1`)
Manage active requisitions with salary ranges (INR), skill requirements, work models (`REMOTE`, `HYBRID`, `ON_SITE`), transparent **Sample Requisition** indicators, and one-click `Deliverable_1_Indeed_Posting_Tracker.csv` export.

![Indeed Postings Tracker](docs/screenshots/02-indeed-postings.png)

---

### 3. Applicant Central Database & Candidate 360° Drawer (`Task 2`)
Filter candidates across the 6 assignment tiers (`Relevant / Suitable`, `Experienced`, `Partially Relevant`, `Fresher`, `Not Relevant`, `Incomplete Profile`), inspect duplicate flags, and open the slide-over **Candidate Drawer** to view multi-job application history, activity timeline, parsed resumes, and consent/DND history.

![Applicant Central Database](docs/screenshots/03-applicant-central.png)

![Candidate 360 Drawer](docs/screenshots/04-candidate-drawer.png)

---

### 4. Explainable AI Screening Co-Pilot (`Task 3`)
Displays the 4-pillar score breakdown (`Skills Overlap 40%`, `Experience Fit 30%`, `Education 15%`, `Location/Logistics 15%`), matching strengths, potential gaps, suggested screening interview questions, batch screening, and HR Override governance.

![AI Screening Co-Pilot](docs/screenshots/05-ai-screening-copilot.png)

---

### 5. Automated Calling Hub `+91` & Interactive IVR Simulator (`Task 4`)
Includes the Indian Mobile Number Validator (`+91` E.164 normalization & telecom circle detection), Instant DNC Opt-Out Suppression tool, TRAI window guard (`10:00 AM – 6:00 PM IST`), and the interactive 3-step IVR Call Simulation Console with voice synthesis and DTMF controls.

![Automated Calling Hub](docs/screenshots/06-calling-hub.png)

---

### 6. Interview Calendar, Availability Matrix & `.ics` Logistics (`Task 5`)
Schedule interviews while automatically checking interviewer overlap (`check_interviewer_availability`), filter by interviewer slot load, update confirmation status, and download RFC 5545 `.ics` calendar invitations.

![Interview Calendar](docs/screenshots/07-interview-calendar.png)

---

### 7. Assignment Deliverables & Compliance Settings
Export all 5 assignment deliverables directly as CSVs from the Deliverables Center, and manage external AI PII sharing gates plus TRAI frequency limits inside **AI & Compliance Settings** (`HR_ADMIN` only).

![Deliverables & Reports](docs/screenshots/08-deliverables-reports.png)

![AI & Compliance Settings](docs/screenshots/09-ai-compliance-settings.png)

---

## System Architecture & Compliance Diagrams

### High-Level System Architecture

```mermaid
flowchart LR
    UI["React 18 + TypeScript + Tailwind SPA (Vite :5173)"] -->|"JWT Bearer Auth / REST JSON"| API["FastAPI v1 Router + RBAC Guards (:8000)"]

    subgraph Services["Backend Domain Services"]
        ING["ingestion_service.py (6-Tier Taxonomy & Deduplication)"]
        AI["ai_screening_service.py (Local Heuristic Default / Optional Gemini 2.5)"]
        TEL["telephony_service.py (+91 TRAI Rules, DNC & IVR Scripts)"]
        INT["interview_service.py (Overlap Check, Slots & RFC 5545 .ics)"]
    end

    API --> Services
    Services --> DB[("SQLAlchemy 2.0 + Alembic (SQLite / PostgreSQL - 12 Tables)")]
    AI -.->|"Gated by ALLOW_EXTERNAL_AI_PROCESSING"| GEM["Google Gemini API (gemini-2.5-flash)"]
    TEL -.->|"Inactive when SIMULATION_MODE=true"| EXO["Exotel Cloud Telephony (BULK_CALLS_ENABLED=false)"]
```

### 12-Table Database Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ JOBS : "creates"
    USERS ||--o{ HR_DECISIONS : "approves_or_overrides"
    USERS ||--o{ AUDIT_LOGS : "triggers"

    JOBS ||--o{ APPLICATIONS : "receives"

    CANDIDATES ||--o{ APPLICATIONS : "submits"
    CANDIDATES ||--o{ RESUMES : "uploads"

    APPLICATIONS ||--o| SCREENING_RESULTS : "evaluated_by"
    APPLICATIONS ||--o{ HR_DECISIONS : "reviewed_with"
    APPLICATIONS ||--o{ CONSENT_RECORDS : "tracks_consent"
    APPLICATIONS ||--o{ CALL_LOGS : "generates_calls"
    APPLICATIONS ||--o{ INTERVIEWS : "schedules"
    APPLICATIONS ||--o{ NOTIFICATIONS : "dispatches"
```

### Automated Calling Compliance & IVR Workflow (`Task 4`)

```mermaid
flowchart TD
    START["Initiate Call for Application"] --> OPT{"Candidate Phone in DNC / OPTED_OUT?"}
    OPT -->|"Yes"| BLOCK1["Block Call Immediately (403 / Ineligible)"]
    OPT -->|"No"| PHONE["Validate Indian Mobile (+91XXXXXXXXXX & Circle)"]
    PHONE -->|"Invalid Prefix/Length"| BLOCK2["Reject Invalid Number"]
    PHONE -->|"Valid"| FREQ{"Calls in last 24h < MAX_CALLS_PER_24_HOURS (2)?"}
    FREQ -->|"No"| BLOCK3["Block: Daily Frequency Cap / 4h Cooldown"]
    FREQ -->|"Yes"| WIN{"Within 10:00-18:00 IST or Test Override?"}
    WIN -->|"No"| BLOCK4["Hold Until TRAI Calling Window"]
    WIN -->|"Yes"| STEP1["IVR Step 1: Consent Prompt"]
    STEP1 -->|"Press 9"| DNCLOG["Record OPTED_OUT in ConsentRecord & DNC"]
    STEP1 -->|"Press 2"| CB["Log CALLBACK_REQUESTED"]
    STEP1 -->|"Press 1"| STEP2["IVR Step 2: Location & Notice Period Check"]
    STEP2 --> STEP3["IVR Step 3: Interview Scheduling Interest -> Log CallLog & AuditLog"]
```

---

## Core Modules (Tasks 1–5 + Governance)

1. **Task 1 — Indeed Job Postings Tracker (`backend/app/api/v1/endpoints/jobs.py`):**
   - Full CRUD for job requisitions (`ACTIVE`, `PAUSED`, `CLOSED`, `DRAFT`), department, salary range, experience range, core skills, work model, and optional screening weight overrides.
   - Export: `Deliverable_1_Indeed_Posting_Tracker.csv`.
2. **Task 2 — Applicant Central & 6-Tier Classification (`backend/app/services/ingestion_service.py`):**
   - Extracts known skills from resume text (`extract_skills_from_text`), normalizes phone numbers, detects existing candidates by email (enabling multi-job applications) and flags cross-email duplicate phone numbers.
   - Automatically classifies candidates into `RELEVANT_SUITABLE`, `PARTIALLY_RELEVANT`, `NOT_RELEVANT`, `EXPERIENCED`, `FRESHER`, or `INCOMPLETE_PROFILE` (`classify_applicant_category`).
   - Export: `Deliverable_2_Applicant_Categorisation_Summary.csv`.
3. **Task 3 — Explainable AI Screening & HR Overrides (`backend/app/services/ai_screening_service.py`):**
   - Abstracted `BaseAIScreeningProvider` with offline `LocalHeuristicScreeningProvider` and opt-in `GeminiAIScreeningProvider` (`gemini-2.5-flash`, `temperature=0.2`, `top_p=0.95`, `max_output_tokens=1024`).
   - Automatic transparent fallback to local heuristic scoring if external API calls fail or `ALLOW_EXTERNAL_AI_PROCESSING=false`.
   - Export: `Deliverable_3_Filtered_Candidate_Database.csv`.
4. **Task 4 — Indian Telecom (`+91`) Calling Compliance & Simulator (`backend/app/services/telephony_service.py`):**
   - Normalizes valid 10-digit Indian numbers starting with `[6-9]` into `+91XXXXXXXXXX` (`validate_and_normalize_indian_phone`) and maps carrier telecom circles (`CARRIER_CIRCLES`).
   - Tracks granular `ConsentRecord` entries and provides instant Opt-Out / DNC suppression (`POST /api/v1/consent/opt-out`).
   - Export: `Deliverable_4_Calling_Workflow_Log.csv`.
5. **Task 5 — Interview Scheduling & Calendar Exports (`backend/app/services/interview_service.py`):**
   - Validates conflicting bookings for the same interviewer (`check_interviewer_availability`) using naive UTC timestamps (`normalize_utc_naive`).
   - Provides per-interviewer slot timelines (`GET /api/v1/interviews/interviewer-slots`) and generates RFC 5545 `.ics` files (`generate_ics_calendar_content`) with 15-minute `VALARM` reminders.
   - Export: `Deliverable_5_Interview_Schedule_Master.csv`.
6. **Governance, Audit Trail & Role-Based Access Control:**
   - Two roles enforced server-side in `backend/app/api/deps.py`: `HR_ADMIN` (full operational write access) and `HIRING_MANAGER` (read access, interview status updates, KPI & CSV export views).
   - Every sensitive workflow action appends immutable entries to `audit_logs` and candidate communication history to `notifications`.

---

## Project Structure

```text
hr_recruitment_automation/
├── .gitignore
├── README.md
├── start.sh                                     # Launches Uvicorn backend + Vite frontend dev server
├── docs/
│   └── screenshots/                             # Verified UI screenshots (01 through 09)
├── backend/
│   ├── .env.example                             # Template environment variables
│   ├── alembic.ini                              # Alembic configuration
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── f531dc20fb54_initial_schema_12_tables.py
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                              # FastAPI app, lifespan DB bootstrap/seeding, CORS, /health
│   │   ├── api/
│   │   │   ├── deps.py                          # get_current_user & require_role RBAC dependencies
│   │   │   └── v1/
│   │   │       ├── api.py                       # V1 router aggregator (/api/v1)
│   │   │       └── endpoints/
│   │   │           ├── applicants.py            # /applicants (+ /import-indeed, /{id}/category)
│   │   │           ├── audit.py                 # /audit
│   │   │           ├── auth.py                  # /auth (/token, /demo-login, /me)
│   │   │           ├── calling.py               # /calling (/validate-phone, /compliance-status, /simulate-call, /logs)
│   │   │           ├── candidates.py            # /candidates (+ /{id}/history, /{id}/timeline, /{id}/resumes)
│   │   │           ├── consent.py               # /consent (/record, /opt-out, /history/{phone})
│   │   │           ├── interviews.py            # /interviews (+ /availability, /interviewer-slots, /{id}/ics)
│   │   │           ├── jobs.py                  # /jobs CRUD
│   │   │           ├── notifications.py         # /notifications
│   │   │           ├── reports.py               # /reports (/kpis, /deliverable/{sheet_type}/export)
│   │   │           ├── screening.py             # /screening (/evaluate, /evaluate-batch, /decision)
│   │   │           └── settings.py              # /settings runtime AI & telephony governance config
│   │   ├── core/
│   │   │   ├── config.py                        # Pydantic BaseSettings defaults & env bindings
│   │   │   └── security.py                      # JWT HS256 & bcrypt password hashing helpers
│   │   ├── db/
│   │   │   ├── session.py                       # SQLAlchemy engine & SessionLocal
│   │   │   └── seed.py                          # Initial seed: 2 users, 3 demo jobs, 13 applications, logs & interviews
│   │   ├── models/
│   │   │   └── entities.py                      # 12 SQLAlchemy 2.0 ORM tables
│   │   ├── schemas/
│   │   │   └── __init__.py                      # Pydantic request/response schemas
│   │   └── services/
│   │       ├── ai_screening_service.py          # Local heuristic & Gemini screening providers
│   │       ├── ingestion_service.py             # Deduplication, skill extraction & 6-tier classifier
│   │       ├── interview_service.py             # Conflict detection, .ics generator & meeting placeholders
│   │       └── telephony_service.py             # +91 validation, TRAI windows, caps & IVR scripts
│   └── tests/
│       └── test_recruitment_workflow.py         # 7 end-to-end pytest integration suites
└── frontend/
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── vite.config.ts                           # Proxies /api -> http://127.0.0.1:8000
    └── src/
        ├── App.tsx                              # Workspace state, auth hydration & dark/light toggle
        ├── api/client.ts                        # Typed Fetch client with Bearer token injection
        ├── types/index.ts                       # Shared TypeScript interfaces
        ├── components/
        │   ├── applicants/                      # CandidateDrawer.tsx, ImportModal.tsx, ManualApplicantModal.tsx
        │   ├── interviews/                      # ScheduleModal.tsx
        │   ├── jobs/                            # CreateJobModal.tsx
        │   ├── layout/                          # Sidebar.tsx, StatusBanner.tsx, TopNav.tsx
        │   └── shared/                          # ScoreBadge.tsx, StatusBadge.tsx
        └── pages/                               # 11 full pages (Dashboard, Jobs, Applicants, Screening, Calling, Interviews, Reports, Audit, Notifications, Settings, Login)
```

---

## REST API Reference & RBAC Matrix

All `/api/v1/*` endpoints (except `/auth/token`, `/auth/demo-login`, `/health`, and `/`) require a valid JWT Bearer token (`get_current_user`). Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

| Domain | Endpoints | Access Control |
| :--- | :--- | :--- |
| **System & Auth** | `GET /health`, `POST /api/v1/auth/token`, `POST /api/v1/auth/demo-login`, `GET /api/v1/auth/me` | Public (`/health`, login) / Authenticated (`/me`) |
| **Jobs (Task 1)** | `GET /api/v1/jobs`, `GET /api/v1/jobs/{id}`<br>`POST /api/v1/jobs`, `PUT /api/v1/jobs/{id}`, `DELETE /api/v1/jobs/{id}` | All Authenticated Users<br>`HR_ADMIN` only |
| **Applicants (Task 2)** | `GET /api/v1/applicants`<br>`POST /api/v1/applicants`, `POST /api/v1/applicants/import-indeed`, `PATCH /api/v1/applicants/{id}/category` | All Authenticated Users<br>`HR_ADMIN` only |
| **Candidates & Resumes** | `GET /api/v1/candidates`, `GET /api/v1/candidates/{id}`, `GET /api/v1/candidates/{id}/history`, `GET /api/v1/candidates/{id}/timeline`, `GET /api/v1/candidates/{id}/resumes`<br>`POST /api/v1/candidates/{id}/resumes` | All Authenticated Users<br>`HR_ADMIN` only |
| **AI Screening (Task 3)** | `GET /api/v1/screening/{application_id}`<br>`POST /api/v1/screening/evaluate/{application_id}`, `POST /api/v1/screening/evaluate-batch`, `POST /api/v1/screening/decision` | All Authenticated Users<br>`HR_ADMIN` only |
| **Calling & Consent (Task 4)** | `POST /api/v1/calling/validate-phone`, `GET /api/v1/calling/compliance-status/{application_id}`, `GET /api/v1/calling/logs`, `GET /api/v1/consent`, `GET /api/v1/consent/history/{phone}`<br>`POST /api/v1/calling/simulate-call`, `POST /api/v1/consent/record`, `POST /api/v1/consent/opt-out` | All Authenticated Users<br>`HR_ADMIN` only |
| **Interviews (Task 5)** | `GET /api/v1/interviews`, `GET /api/v1/interviews/availability`, `GET /api/v1/interviews/interviewer-slots`, `PATCH /api/v1/interviews/{id}/status`, `GET /api/v1/interviews/{id}/ics`<br>`POST /api/v1/interviews` | All Authenticated Users<br>`HR_ADMIN` only |
| **Reports & Deliverables** | `GET /api/v1/reports/kpis`, `GET /api/v1/reports/deliverable/{sheet_type}/export`<br>(`indeed-tracker`, `applicant-summary`, `filtered-database`, `call-log-report`, `interview-schedule`) | All Authenticated Users |
| **Governance & Settings** | `GET /api/v1/audit`, `GET /api/v1/notifications`, `GET /api/v1/settings`<br>`PATCH /api/v1/settings` | All Authenticated Users<br>`HR_ADMIN` only |

---

## Quick Start & Setup

### Prerequisites
- **Python 3.10+** (verified on Python with FastAPI, SQLAlchemy 2.0, Alembic)
- **Node.js 18+ & npm** (for the React + Vite frontend)

### 1. One-Time Installation

```bash
# 1. Clone the repository
git clone <your-github-repo-url>
cd hr_recruitment_automation

# 2. Set up Python virtual environment & install backend packages
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 3. Install frontend packages
npm install --prefix frontend

# 4. Copy backend environment template (optional - works out of the box with local defaults)
cp backend/.env.example backend/.env
```

### 2. Run the Application

Use the bundled launcher script:

```bash
chmod +x start.sh
./start.sh
```

Or start the two servers manually in separate terminals:

```bash
# Terminal 1: FastAPI Backend (port 8000)
source venv/bin/activate
export PYTHONPATH=backend
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: React Vite Frontend (port 5173)
npm run dev --prefix frontend
```

Once running:
- **Web Application:** `http://localhost:5173`
- **Interactive API Docs (Swagger UI):** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/health`

### Seeded Demo Accounts (RBAC Verification)

On first startup, `seed_database()` populates **3 sample vacancies**, **13 candidates/applications** spanning all 6 tiers (including opted-out edge case *Manish Verma*), call logs, interviews, and audit logs.

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **`HR_ADMIN`** | `admin@recruitment.internal` | `Admin@HR2026!` | Full access: create/edit jobs, import CSVs, trigger AI screening & HR overrides, simulate calls, record consent/opt-out, schedule interviews, edit compliance settings. |
| **`HIRING_MANAGER`** | `manager@recruitment.internal` | `Manager@HR2026!` | Review candidates, inspect AI rationale & audit logs, update interview confirmation statuses, download CSV deliverables & `.ics` invites (write mutations return `403 Forbidden`). |

---

## Configuration (`.env`) & Production PostgreSQL + Alembic

All runtime secrets and compliance knobs are documented in [`backend/.env.example`](backend/.env.example):

```ini
# Security & JWT
SECRET_KEY=change-this-to-a-strong-random-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database (PostgreSQL recommended for production; defaults to local SQLite if omitted)
# DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/hr_recruitment

# AI Screening (External processing disabled by default until organizational approval)
ALLOW_EXTERNAL_AI_PROCESSING=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# Indian Telephony Compliance (TRAI guidelines)
CALLING_WINDOW_START_HOUR=10
CALLING_WINDOW_END_HOUR=18
CALLING_TIMEZONE=Asia/Kolkata
MAX_CALLS_PER_24_HOURS=2
MIN_COOLDOWN_HOURS=4
SIMULATION_MODE=true
BULK_CALLS_ENABLED=false

# Live Cloud Telephony Adapter (Exotel - Inactive while SIMULATION_MODE=true)
EXOTEL_ACCOUNT_SID=
EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
EXOTEL_CALLER_ID=
```

### Running Alembic Migrations (SQLite or PostgreSQL)

```bash
cd backend
alembic upgrade head
```

---

## Automated Test Suite & Build Verification

The backend integration suite ([`backend/tests/test_recruitment_workflow.py`](backend/tests/test_recruitment_workflow.py)) runs against an isolated temporary SQLite database and tests all core compliance and workflow invariants:

1. `test_system_health` — API health check & router boot
2. `test_authentication_and_rbac_permissions` — JWT login, `HR_ADMIN` access, and `403` enforcement for `HIRING_MANAGER` mutations
3. `test_task_1_indeed_postings_minimum_three_and_no_fake_urls` — Demo job seeding and non-fabrication of Indeed URLs
4. `test_task_2_six_tiers_duplicates_multijob_and_missing_resume` — 6-tier categorization, multi-job candidate linkage, duplicate phone flagging, and incomplete profile handling
5. `test_task_3_ai_screening_override_and_external_api_failure_fallback` — Local heuristic evaluation, Gemini API error fallback, and mandatory audit logging on HR overrides
6. `test_task_4_indian_phone_validation_consent_withdrawal_and_call_blocking` — `+91` validation, opt-out DNC suppression, and automatic blocking of subsequent call attempts
7. `test_task_5_interview_conflict_ics_and_export_accuracy` — Interviewer time-overlap prevention, `.ics` generation, and CSV deliverable export accuracy

Run the full verification suite:

```bash
# Backend integration tests
source venv/bin/activate
PYTHONPATH=backend pytest -v backend/tests/test_recruitment_workflow.py

# Frontend TypeScript check & production Vite build
npm run build --prefix frontend
```
