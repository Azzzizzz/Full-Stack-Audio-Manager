from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT = Path(__file__).resolve().parents[3]  # project root


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(_ROOT / ".env"), ".env"],
        extra="ignore",
    )

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017/meeami"

    # JWT
    JWT_SECRET: str = "changeme-use-a-long-random-string"
    JWT_TTL_MINUTES: int = 60

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_BUCKET: str = ""
    S3_ENDPOINT_URL: Optional[str] = None

    # CORS — comma-separated string; split at point of use
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:8080"

    # Rate limits (SlowAPI format)
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_AUTH: str = "5/15minutes"
    RATE_LIMIT_UPLOAD: str = "20/hour"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
