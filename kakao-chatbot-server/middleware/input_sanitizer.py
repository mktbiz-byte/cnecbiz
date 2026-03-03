"""프롬프트 인젝션 필터"""

import re
from utils.supabase_client import get_supabase

_cached_patterns: list[dict] | None = None
_cache_time: float = 0


async def load_blocked_patterns() -> list[dict]:
    """DB에서 차단 패턴 로드 (5분 캐시)"""
    global _cached_patterns, _cache_time
    import time

    now = time.time()
    if _cached_patterns is not None and (now - _cache_time) < 300:
        return _cached_patterns

    sb = get_supabase()
    result = sb.table("chatbot_blocked_patterns").select("*").eq("is_active", True).execute()
    _cached_patterns = result.data or []
    _cache_time = now
    return _cached_patterns


async def sanitize_input(text: str) -> tuple[bool, str]:
    """
    입력 텍스트의 프롬프트 인젝션 여부 확인

    Returns:
        (is_safe, cleaned_text)
    """
    if not text or not text.strip():
        return True, text

    patterns = await load_blocked_patterns()

    for pattern_data in patterns:
        pattern_type = pattern_data.get("pattern_type", "keyword")
        pattern = pattern_data.get("pattern", "")

        if not pattern:
            continue

        if pattern_type == "keyword":
            if pattern.lower() in text.lower():
                return False, ""
        elif pattern_type == "regex":
            try:
                if re.search(pattern, text, re.IGNORECASE):
                    return False, ""
            except re.error:
                continue

    # 기본 정리
    cleaned = text.strip()
    if len(cleaned) > 2000:
        cleaned = cleaned[:2000]

    return True, cleaned
