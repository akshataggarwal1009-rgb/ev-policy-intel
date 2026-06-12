from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/ev_policy_intel"
    ANTHROPIC_API_KEY: str = ""
    VOYAGE_API_KEY: str = ""
    ADMIN_TOKEN: str = "changeme"
    NOTIFY_EMAIL: str = ""
    NOTIFY_WEBHOOK: str = ""
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
