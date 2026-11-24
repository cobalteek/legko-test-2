from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    keitaro_api_url: str
    keitaro_api_key: str
    database_url: str = "sqlite:///./backend/data/adrobot.sqlite3"
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    request_timeout_seconds: float = 20.0

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
