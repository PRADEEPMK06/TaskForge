import os
from functools import lru_cache


class Settings:
    project_name = "TaskFlow API"
    api_prefix = "/api/v1"
    database_url = os.getenv("DATABASE_URL", "sqlite:///./data/taskflow.db")
    secret_key = os.getenv("SECRET_KEY", "change-this-secret-key-before-production")
    access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
    cors_origins = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080",
        ).split(",")
        if origin.strip()
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

