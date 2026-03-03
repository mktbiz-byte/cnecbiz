"""DB 관련 Pydantic 모델"""

from pydantic import BaseModel
from typing import Any


class FAQ(BaseModel):
    id: str
    bot_type: str
    category: str = ""
    question: str
    answer: str
    keywords: list[str] = []
    confidence_threshold: float = 0.8
    is_active: bool = True


class Conversation(BaseModel):
    id: str | None = None
    kakao_user_key: str
    bot_type: str
    session_id: str
    messages: list[dict[str, Any]] = []


class UserLink(BaseModel):
    id: str | None = None
    kakao_user_key: str
    user_type: str  # 'creator' | 'company'
    user_id: str
    region: str
    display_name: str | None = None
