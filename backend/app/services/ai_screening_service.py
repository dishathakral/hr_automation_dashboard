import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseAIScreeningProvider(ABC):
    """Abstract base interface so any AI screening provider can be plugged in."""

    @abstractmethod
    async def evaluate(
        self,
        job_data: Dict[str, Any],
        candidate_data: Dict[str, Any],
        resume_text: str = "",
    ) -> Dict[str, Any]:
        pass


def run_local_heuristic_screening(
    job_data: Dict[str, Any],
    candidate_data: Dict[str, Any],
    resume_text: str = "",
) -> Dict[str, Any]:
    """
    Offline, deterministic, explainable AI screening engine.
    Ensures 100% functionality without external API dependencies or sending candidate data to 3rd parties.
    """
    weights = job_data.get("screening_weights") or {"skills": 40, "experience": 30, "education": 15, "logistics": 15}
    weight_skills = weights.get("skills", 40)
    weight_exp = weights.get("experience", 30)
    weight_edu = weights.get("education", 15)
    weight_log = weights.get("logistics", 15)

    required_skills = [s.strip().lower() for s in (job_data.get("required_skills") or [])]
    candidate_skills = [s.strip().lower() for s in (candidate_data.get("skills") or [])]
    full_text = (resume_text + " " + " ".join(candidate_skills)).lower()

    # 1. Skills Scoring
    matched_skills = []
    missing_skills = []
    for skill in required_skills:
        if skill in candidate_skills or skill in full_text:
            matched_skills.append(skill)
        else:
            missing_skills.append(skill)

    skill_ratio = len(matched_skills) / max(len(required_skills), 1)
    skills_score = int(round(skill_ratio * weight_skills))

    # 2. Experience Scoring
    candidate_exp = float(candidate_data.get("total_experience_years") or 0.0)
    exp_level_str = str(job_data.get("experience_level") or "0").lower()
    min_exp = 0.0
    for token in exp_level_str.replace("+", " ").replace("-", " ").split():
        if token.replace(".", "", 1).isdigit():
            min_exp = float(token)
            break

    if candidate_exp >= min_exp:
        exp_score = weight_exp
    elif candidate_exp > 0:
        exp_score = int(round((candidate_exp / max(min_exp, 1.0)) * weight_exp))
    else:
        exp_score = 0

    # 3. Education Scoring
    candidate_edu = str(candidate_data.get("highest_education") or "").lower()
    edu_score = int(round(weight_edu * 0.7))
    if any(deg in candidate_edu for deg in ["b.tech", "m.tech", "b.e", "mca", "bca", "mba", "master", "phd", "bachelor"]):
        edu_score = weight_edu
    elif not candidate_edu or "incomplete" in candidate_edu:
        edu_score = int(round(weight_edu * 0.3))

    # 4. Logistics & Location Scoring
    job_location = str(job_data.get("location") or "").lower()
    cand_city = str(candidate_data.get("current_city") or "").lower()
    work_model = str(job_data.get("work_model") or "HYBRID").upper()

    log_score = int(round(weight_log * 0.6))
    if work_model == "REMOTE":
        log_score = weight_log
    elif cand_city and (cand_city in job_location or job_location in cand_city):
        log_score = weight_log
    elif "bangalore" in cand_city and "bengaluru" in job_location:
        log_score = weight_log
    elif "delhi" in cand_city and "ncr" in job_location:
        log_score = weight_log

    suitability_score = min(100, max(0, skills_score + exp_score + edu_score + log_score))

    # Build Explainable Reasoning
    matching_strengths = []
    if matched_skills:
        matching_strengths.append(f"Demonstrates verified proficiency in {', '.join([s.title() for s in matched_skills[:4]])}.")
    if candidate_exp >= min_exp:
        matching_strengths.append(f"Possesses {candidate_exp:.1f} years of relevant experience, meeting the required {min_exp:.0f}+ years threshold.")
    if log_score == weight_log:
        matching_strengths.append(f"Geographically aligned with {job_data.get('location')} ({work_model} work setup).")

    potential_concerns = []
    if missing_skills:
        potential_concerns.append(f"Core job requirements not prominently verified: {', '.join([s.title() for s in missing_skills[:3]])}.")
    if candidate_exp < min_exp:
        potential_concerns.append(f"Experience ({candidate_exp:.1f} years) falls short of the target minimum ({min_exp:.0f} years).")
    if log_score < weight_log and work_model != "REMOTE":
        potential_concerns.append(f"Located in {candidate_data.get('current_city')}, while job requisition specifies {job_data.get('location')} ({work_model}). Relocation confirmation needed.")

    suggested_questions = []
    if missing_skills:
        suggested_questions.append(f"Can you describe your hands-on experience and comfort level with {missing_skills[0].title()}?")
    if candidate_exp < min_exp:
        suggested_questions.append("Can you highlight practical project achievements that showcase rapid proficiency beyond your total tenure?")
    suggested_questions.append("What is your current notice period and timeline to transition to our team?")

    if suitability_score >= 75:
        recommended_status = "SHORTLISTED"
        explanation = f"Strong candidate profile. Achieved a suitability score of {suitability_score}/100 with robust alignment across core technical competencies and required domain tenure."
    elif suitability_score >= 50:
        recommended_status = "ON_HOLD"
        explanation = f"Partially aligned profile with suitability score of {suitability_score}/100. Meets primary criteria but has notable gaps or location considerations requiring recruiter clarification."
    else:
        recommended_status = "NOT_SHORTLISTED"
        explanation = f"Low alignment profile with suitability score of {suitability_score}/100. Significant deviation from mandatory skills, experience, or role prerequisites."

    return {
        "suitability_score": suitability_score,
        "skills_score": skills_score,
        "experience_score": exp_score,
        "education_score": edu_score,
        "logistics_score": log_score,
        "matching_strengths": matching_strengths or ["General professional experience in related domains."],
        "missing_skills": [s.title() for s in missing_skills],
        "potential_concerns": potential_concerns or ["No critical red flags detected."],
        "suggested_interview_questions": suggested_questions,
        "clear_explanation": explanation,
        "ai_recommended_status": recommended_status,
        "engine_used": "LOCAL_HEURISTIC",
        "is_external_api": False,
    }


class LocalHeuristicScreeningProvider(BaseAIScreeningProvider):
    async def evaluate(
        self,
        job_data: Dict[str, Any],
        candidate_data: Dict[str, Any],
        resume_text: str = "",
    ) -> Dict[str, Any]:
        return run_local_heuristic_screening(job_data, candidate_data, resume_text)


class GeminiAIScreeningProvider(BaseAIScreeningProvider):
    def __init__(self, api_key: str, model_name: str, temperature: float, top_p: float, max_tokens: int):
        self.api_key = api_key
        self.model_name = model_name
        self.temperature = temperature
        self.top_p = top_p
        self.max_tokens = max_tokens

    async def evaluate(
        self,
        job_data: Dict[str, Any],
        candidate_data: Dict[str, Any],
        resume_text: str = "",
    ) -> Dict[str, Any]:
        prompt = f"""
        You are an expert HR recruiter evaluating an applicant for a job opening.
        Evaluate the candidate against the job specifications and return strict JSON.

        JOB:
        Title: {job_data.get('title')}
        Location: {job_data.get('location')} ({job_data.get('work_model')})
        Min Experience: {job_data.get('experience_level')}
        Required Skills: {json.dumps(job_data.get('required_skills') or [])}
        Screening Weights: {json.dumps(job_data.get('screening_weights') or {})}

        CANDIDATE:
        Name: {candidate_data.get('full_name')}
        Location: {candidate_data.get('current_city')}
        Experience: {candidate_data.get('total_experience_years')} years
        Education: {candidate_data.get('highest_education')}
        Skills: {json.dumps(candidate_data.get('skills') or [])}
        Resume Text Excerpt: {resume_text[:2000]}

        Return a valid JSON object with:
        - suitability_score (int 0-100)
        - skills_score (int)
        - experience_score (int)
        - education_score (int)
        - logistics_score (int)
        - matching_strengths (array of strings)
        - missing_skills (array of strings)
        - potential_concerns (array of strings)
        - suggested_interview_questions (array of strings)
        - clear_explanation (string)
        - ai_recommended_status ("SHORTLISTED", "ON_HOLD", or "NOT_SHORTLISTED")
        """

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": self.temperature,
                "topP": self.top_p,
                "maxOutputTokens": self.max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"Gemini API returned HTTP {res.status_code}: {res.text[:200]}")
            data = res.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_text)
            parsed["engine_used"] = "GEMINI_API"
            parsed["is_external_api"] = True
            return parsed


def get_screening_provider() -> BaseAIScreeningProvider:
    if (
        settings.ALLOW_EXTERNAL_AI_PROCESSING
        and settings.AI_PROVIDER.upper() == "GEMINI_API"
        and settings.GEMINI_API_KEY
    ):
        return GeminiAIScreeningProvider(
            api_key=settings.GEMINI_API_KEY,
            model_name=settings.GEMINI_MODEL,
            temperature=settings.GEMINI_TEMPERATURE,
            top_p=settings.GEMINI_TOP_P,
            max_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
        )
    return LocalHeuristicScreeningProvider()


async def screen_candidate(
    job_data: Dict[str, Any],
    candidate_data: Dict[str, Any],
    resume_text: str = "",
) -> Dict[str, Any]:
    """
    Main entry point for candidate screening.
    Respects privacy governance: external LLM processing is ONLY engaged if
    ALLOW_EXTERNAL_AI_PROCESSING is True, AI_PROVIDER is GEMINI_API, and an API key is configured.
    Falls back cleanly to LocalHeuristicScreeningProvider on any API failure.
    """
    provider = get_screening_provider()
    if isinstance(provider, GeminiAIScreeningProvider):
        try:
            return await provider.evaluate(job_data, candidate_data, resume_text)
        except Exception as e:
            logger.warning(f"External Gemini API evaluation failed: {e}. Falling back safely to Local Heuristic Engine.")

    return await LocalHeuristicScreeningProvider().evaluate(job_data, candidate_data, resume_text)
