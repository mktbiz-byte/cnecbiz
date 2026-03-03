"""에스컬레이션 처리 → cnecbiz chatbot-process-escalation 호출"""

import httpx
from config.settings import get_settings


# 민감 키워드 (에스컬레이션 트리거)
SENSITIVE_KEYWORDS = [
    "환불", "클레임", "불만", "상담원", "사람", "담당자",
    "입금", "결제", "충전", "출금", "인출", "정산",
    "전화번호", "계좌", "주소", "변경",
    "계약 해지", "위약금", "해지",
    "비밀번호", "로그인 안됨", "로그인",
]

_escalation_cache: list[str] | None = None
_cache_time: float = 0


async def load_escalation_triggers(bot_type: str) -> list[str]:
    """DB에서 에스컬레이션 트리거 키워드 로드 (5분 캐시)"""
    global _escalation_cache, _cache_time
    import time
    from utils.supabase_client import get_supabase

    now = time.time()
    if _escalation_cache is not None and (now - _cache_time) < 300:
        return _escalation_cache

    sb = get_supabase()
    result = sb.table("chatbot_guardrails").select("rule_value").eq(
        "bot_type", bot_type
    ).eq("rule_type", "escalation_triggers").eq("is_active", True).execute()

    db_triggers = [r["rule_value"] for r in (result.data or [])]
    _escalation_cache = list(set(SENSITIVE_KEYWORDS + db_triggers))
    _cache_time = now
    return _escalation_cache


async def check_escalation(text: str, bot_type: str) -> bool:
    """에스컬레이션 필요 여부 확인"""
    triggers = await load_escalation_triggers(bot_type)
    text_lower = text.lower()
    return any(trigger.lower() in text_lower for trigger in triggers)


async def process_escalation(
    question: str,
    kakao_user_key: str,
    bot_type: str,
    session_id: str = "",
) -> bool:
    """cnecbiz에 에스컬레이션 요청"""
    settings = get_settings()
    url = f"{settings.cnecbiz_base_url}/.netlify/functions/chatbot-process-escalation"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                url,
                json={
                    "question": question,
                    "kakao_user_key": kakao_user_key,
                    "bot_type": bot_type,
                    "session_id": session_id,
                },
                headers={
                    "Content-Type": "application/json",
                    "X-Chatbot-API-Key": settings.chatbot_api_secret,
                },
            )
            return resp.status_code == 200
    except Exception as e:
        print(f"[escalation] Error: {e}")
        return False
