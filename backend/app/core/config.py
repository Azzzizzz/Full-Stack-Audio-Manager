import json
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:8080"]

    # Rate limits (SlowAPI format)
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_AUTH: str = "5/15minutes"
    RATE_LIMIT_UPLOAD: str = "20/hour"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


settings = Settings()
