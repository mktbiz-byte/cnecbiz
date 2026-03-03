from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Gemini
    gemini_api_key: str = ""

    # Chatbot API Secret (shared with Netlify Functions)
    chatbot_api_secret: str = ""

    # cnecbiz base URL
    cnecbiz_base_url: str = "https://cnecbiz.com"

    # Kakao signature
    kakao_skill_secret: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Rate limit
    rate_limit_per_minute: int = 60

    # Conversation
    max_messages_per_session: int = 50

    # FAQ matching thresholds
    faq_high_confidence: float = 0.9
    faq_medium_confidence: float = 0.5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
