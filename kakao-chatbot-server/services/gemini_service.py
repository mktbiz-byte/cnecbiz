"""Gemini 2.0 Flash 호출 서비스"""

import google.generativeai as genai
from config.settings import get_settings

_model = None


def _get_model():
    global _model
    if _model is None:
        settings = get_settings()
        genai.configure(api_key=settings.gemini_api_key)
        _model = genai.GenerativeModel(
            "gemini-2.0-flash",
            generation_config=genai.GenerationConfig(
                max_output_tokens=1024,
                temperature=0.7,
            ),
        )
    return _model


async def generate_response(
    system_prompt: str,
    user_message: str,
    conversation_history: list[dict] | None = None,
    user_context: str = "",
) -> str:
    """Gemini로 응답 생성"""
    model = _get_model()

    # 대화 이력 조립
    history_text = ""
    if conversation_history:
        recent = conversation_history[-10:]  # 최근 10개만
        for msg in recent:
            role = "사용자" if msg.get("role") == "user" else "챗봇"
            history_text += f"{role}: {msg.get('content', '')}\n"

    prompt = system_prompt
    if user_context:
        prompt += f"\n{user_context}"

    full_prompt = f"""{prompt}

{f"[이전 대화]" + chr(10) + history_text if history_text else ""}

사용자: {user_message}

위 질문에 대해 답변해 주세요. 답변은 간결하고 친절하게, 200자 이내로 작성해 주세요."""

    try:
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        return f"죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. (오류: {str(e)[:50]})"
