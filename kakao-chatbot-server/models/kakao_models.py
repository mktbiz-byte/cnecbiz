"""카카오 i 오픈빌더 스킬 요청/응답 Pydantic 모델"""

from pydantic import BaseModel
from typing import Any


class KakaoUser(BaseModel):
    id: str  # 사용자 고유 ID (== user_key)
    type: str = "botUserKey"
    properties: dict[str, Any] = {}


class KakaoBot(BaseModel):
    id: str = ""
    name: str = ""


class KakaoIntent(BaseModel):
    id: str = ""
    name: str = ""


class KakaoAction(BaseModel):
    id: str = ""
    name: str = ""
    params: dict[str, str] = {}
    detailParams: dict[str, Any] = {}
    clientExtra: dict[str, Any] = {}


class KakaoUserRequest(BaseModel):
    block: dict[str, Any] = {}
    user: KakaoUser
    utterance: str
    params: dict[str, Any] = {}
    lang: str = "ko"
    timezone: str = "Asia/Seoul"
    callbackUrl: str | None = None


class KakaoSkillRequest(BaseModel):
    intent: KakaoIntent = KakaoIntent()
    userRequest: KakaoUserRequest
    bot: KakaoBot = KakaoBot()
    action: KakaoAction = KakaoAction()
    contexts: list[dict[str, Any]] = []


# --- 응답 모델 ---

class SimpleText(BaseModel):
    text: str


class SimpleTextOutput(BaseModel):
    simpleText: SimpleText


class QuickReply(BaseModel):
    label: str
    action: str = "message"
    messageText: str = ""


class SkillTemplate(BaseModel):
    outputs: list[dict[str, Any]]
    quickReplies: list[QuickReply] = []


class KakaoSkillResponse(BaseModel):
    version: str = "2.0"
    template: SkillTemplate


def make_text_response(text: str, quick_replies: list[QuickReply] | None = None) -> dict:
    """간단한 텍스트 응답 생성"""
    response = KakaoSkillResponse(
        template=SkillTemplate(
            outputs=[{"simpleText": {"text": text}}],
            quickReplies=quick_replies or [],
        )
    )
    return response.model_dump()


def make_choices_response(text: str, choices: list[str]) -> dict:
    """선택지(Quick Reply) 응답 생성"""
    quick_replies = [
        QuickReply(label=choice, action="message", messageText=choice)
        for choice in choices
    ]
    return make_text_response(text, quick_replies)
