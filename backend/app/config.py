"""Application configuration settings."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server settings
    PORT: int = 8000
    DEBUG: bool = False
    
    # GitHub API endpoint
    GITHUB_API_ENDPOINT: str = "http://103.98.213.149:8510"
    CLAUDE_TASK_ENDPOINT: str = "http://103.98.213.149:8520"
    
    # Anthropic API
    ANTHROPIC_API_KEY: str = ""
    
    # CORS settings
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
