"""FAQ 키워드 매칭 + 확신도 계산"""

from utils.supabase_client import get_supabase

_faq_cache: dict[str, list[dict]] = {}
_cache_time: float = 0


async def load_faqs(bot_type: str) -> list[dict]:
    """FAQ 목록 로드 (5분 캐시)"""
    global _faq_cache, _cache_time
    import time

    now = time.time()
    if bot_type in _faq_cache and (now - _cache_time) < 300:
        return _faq_cache[bot_type]

    sb = get_supabase()
    result = sb.table("chatbot_faq").select("*").eq("bot_type", bot_type).eq("is_active", True).execute()
    _faq_cache[bot_type] = result.data or []
    _cache_time = now
    return _faq_cache[bot_type]


async def match_faq(question: str, bot_type: str) -> list[dict]:
    """
    FAQ 매칭 결과 반환 (확신도 내림차순)

    Returns:
        [{"faq": {...}, "confidence": 0.95}, ...]
    """
    faqs = await load_faqs(bot_type)
    if not faqs:
        return []

    question_lower = question.lower().strip()
    question_words = set(question_lower.split())
    results = []

    for faq in faqs:
        confidence = _calculate_confidence(question_lower, question_words, faq)
        if confidence > 0:
            results.append({"faq": faq, "confidence": confidence})

    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results[:5]


def _calculate_confidence(question_lower: str, question_words: set[str], faq: dict) -> float:
    """키워드 기반 확신도 계산"""
    keywords = faq.get("keywords", [])
    faq_question = faq.get("question", "").lower()

    if not keywords and not faq_question:
        return 0.0

    score = 0.0

    # 1. 정확히 같은 질문 → 100%
    if question_lower == faq_question:
        return 1.0

    # 2. 키워드 매칭
    if keywords:
        matched = sum(1 for kw in keywords if kw.lower() in question_lower)
        if matched > 0:
            score = max(score, matched / len(keywords))

    # 3. 질문 단어 겹침
    faq_words = set(faq_question.split())
    if faq_words:
        overlap = question_words & faq_words
        word_score = len(overlap) / max(len(faq_words), 1)
        score = max(score, word_score * 0.8)

    # 4. 부분 문자열 포함
    if faq_question and faq_question in question_lower:
        score = max(score, 0.85)
    elif question_lower in faq_question:
        score = max(score, 0.7)

    return min(score, 1.0)
