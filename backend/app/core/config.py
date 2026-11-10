import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_DB_URL = f"sqlite:///{DATA_DIR / 'recruitment.db'}"


class Settings(BaseSettings):
    PROJECT_NAME: str = "HR Recruitment Automation Platform"
    API_V1_STR: str = "/api/v1"

    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-recruitment-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database: Supports PostgreSQL or local SQLite for zero-friction execution
    DATABASE_URL: str = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

    # AI Screening Configuration
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "LOCAL_HEURISTIC")  # LOCAL_HEURISTIC | GEMINI_API
    ALLOW_EXTERNAL_AI_PROCESSING: bool = os.getenv("ALLOW_EXTERNAL_AI_PROCESSING", "false").lower() == "true"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_TEMPERATURE: float = float(os.getenv("GEMINI_TEMPERATURE", "0.2"))
    GEMINI_TOP_P: float = float(os.getenv("GEMINI_TOP_P", "0.95"))
    GEMINI_MAX_OUTPUT_TOKENS: int = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "1024"))

    # Indian Telephony Compliance Configuration
    CALLING_WINDOW_START_HOUR: int = int(os.getenv("CALLING_WINDOW_START_HOUR", "10"))  # 10:00 AM IST
    CALLING_WINDOW_END_HOUR: int = int(os.getenv("CALLING_WINDOW_END_HOUR", "18"))    # 06:00 PM IST
    CALLING_TIMEZONE: str = os.getenv("CALLING_TIMEZONE", "Asia/Kolkata")
    MAX_CALLS_PER_24_HOURS: int = int(os.getenv("MAX_CALLS_PER_24_HOURS", "2"))
    MIN_COOLDOWN_HOURS: int = int(os.getenv("MIN_COOLDOWN_HOURS", "4"))
    SIMULATION_MODE: bool = os.getenv("SIMULATION_MODE", "true").lower() == "true"
    BULK_CALLS_ENABLED: bool = False

    # Exotel Adapter Settings (Disabled by default)
    EXOTEL_ACCOUNT_SID: str = os.getenv("EXOTEL_ACCOUNT_SID", "")
    EXOTEL_API_KEY: str = os.getenv("EXOTEL_API_KEY", "")
    EXOTEL_API_TOKEN: str = os.getenv("EXOTEL_API_TOKEN", "")
    EXOTEL_CALLER_ID: str = os.getenv("EXOTEL_CALLER_ID", "")

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
