"""카카오 X-KakaoI-Signature 검증 (선택적)"""

import hmac
import hashlib
from fastapi import Request
from config.settings import get_settings


async def verify_kakao_signature(request: Request) -> bool:
    """
    카카오 스킬 서버 시그니처 검증
    KAKAO_SKILL_SECRET 미설정 시 검증 건너뜀
    """
    settings = get_settings()
    secret = settings.kakao_skill_secret

    if not secret:
        return True

    signature = request.headers.get("X-KakaoI-Signature", "")
    if not signature:
        return False

    body = await request.body()
    expected = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(signature, expected)
