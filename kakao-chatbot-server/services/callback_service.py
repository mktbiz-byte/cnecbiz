"""카카오 콜백 API 비동기 응답"""

import httpx
from models.kakao_models import make_text_response


async def send_callback(callback_url: str, text: str) -> bool:
    """
    카카오 콜백 URL로 비동기 응답 전송
    5초 초과 시 카카오가 제공하는 callbackUrl로 응답
    """
    if not callback_url:
        return False

    payload = make_text_response(text)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                callback_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            return resp.status_code == 200
    except Exception as e:
        print(f"[callback] Error: {e}")
        return False
