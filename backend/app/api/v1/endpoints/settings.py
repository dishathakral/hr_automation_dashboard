from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.core.config import settings
from app.models.entities import AuditLog, User
from app.schemas import SystemSettingsResponse, SystemSettingsUpdate

router = APIRouter()


def _serialize_settings() -> SystemSettingsResponse:
    return SystemSettingsResponse(
        ai_provider=settings.AI_PROVIDER,
        allow_external_ai_processing=settings.ALLOW_EXTERNAL_AI_PROCESSING,
        gemini_model=settings.GEMINI_MODEL,
        gemini_api_key_configured=bool(settings.GEMINI_API_KEY),
        gemini_temperature=settings.GEMINI_TEMPERATURE,
        calling_window_start_hour=settings.CALLING_WINDOW_START_HOUR,
        calling_window_end_hour=settings.CALLING_WINDOW_END_HOUR,
        calling_timezone=settings.CALLING_TIMEZONE,
        max_calls_per_24_hours=settings.MAX_CALLS_PER_24_HOURS,
        min_cooldown_hours=settings.MIN_COOLDOWN_HOURS,
        simulation_mode=settings.SIMULATION_MODE,
        bulk_calls_enabled=settings.BULK_CALLS_ENABLED,
        exotel_configured=bool(settings.EXOTEL_ACCOUNT_SID and settings.EXOTEL_API_KEY),
    )


@router.get("", response_model=SystemSettingsResponse)
@router.get("/", response_model=SystemSettingsResponse, include_in_schema=False)
def get_system_settings(current_user: User = Depends(get_current_user)):
    return _serialize_settings()


@router.patch("", response_model=SystemSettingsResponse)
@router.patch("/", response_model=SystemSettingsResponse, include_in_schema=False)
def update_system_settings(
    payload: SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR_ADMIN"]))
):
    changes = payload.model_dump(exclude_unset=True)
    if "calling_window_start_hour" in changes and "calling_window_end_hour" in changes:
        if changes["calling_window_start_hour"] >= changes["calling_window_end_hour"]:
            raise HTTPException(status_code=400, detail="Calling start hour must be earlier than end hour.")

    if payload.ai_provider is not None:
        settings.AI_PROVIDER = payload.ai_provider.upper()
    if payload.allow_external_ai_processing is not None:
        settings.ALLOW_EXTERNAL_AI_PROCESSING = payload.allow_external_ai_processing
    if payload.gemini_model is not None:
        settings.GEMINI_MODEL = payload.gemini_model.strip()
    if payload.gemini_temperature is not None:
        settings.GEMINI_TEMPERATURE = payload.gemini_temperature
    if payload.calling_window_start_hour is not None:
        settings.CALLING_WINDOW_START_HOUR = payload.calling_window_start_hour
    if payload.calling_window_end_hour is not None:
        settings.CALLING_WINDOW_END_HOUR = payload.calling_window_end_hour
    if payload.max_calls_per_24_hours is not None:
        settings.MAX_CALLS_PER_24_HOURS = max(1, payload.max_calls_per_24_hours)
    if payload.min_cooldown_hours is not None:
        settings.MIN_COOLDOWN_HOURS = max(0, payload.min_cooldown_hours)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="JOB",
        entity_id="system-settings",
        action="UPDATE",
        changes=changes,
        rationale="HR Admin updated AI screening governance or calling compliance settings",
    )
    db.add(audit)
    db.commit()

    return _serialize_settings()

