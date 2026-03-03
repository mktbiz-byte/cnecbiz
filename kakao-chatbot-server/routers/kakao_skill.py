"""카카오 스킬 서버 핵심 엔드포인트"""

import asyncio
from fastapi import APIRouter, Request, HTTPException

from models.kakao_models import KakaoSkillRequest, make_text_response, make_choices_response
from middleware.rate_limiter import rate_limiter
from middleware.input_sanitizer import sanitize_input
from middleware.kakao_signature import verify_kakao_signature
from services.faq_service import match_faq
from services.gemini_service import generate_response
from services.conversation_service import (
    get_or_create_conversation,
    append_message,
    get_conversation_history,
)
from services.escalation_service import check_escalation, process_escalation
from services.callback_service import send_callback
from utils.prompt_builder import build_system_prompt, build_user_context
from utils.supabase_client import get_supabase
from config.settings import get_settings
import httpx

router = APIRouter()


@router.post("/api/kakao/skill")
async def kakao_skill(request: Request):
    """
    카카오 스킬 서버 메인 엔드포인트

    플로우:
    1. 시그니처 검증 → 입력 필터링 → Rate Limit
    2. 사용자 연동 확인
    3. 대화 이력 로드
    4. 민감 키워드 → 에스컬레이션
    5. 데이터 조회 의도 → 크리에이터 데이터 로드
    6. FAQ 매칭 (확신도)
    7. 90%+ → 즉답 | 50~89% → 선택지 | <50% → Gemini → 에스컬레이션
    8. 대화 저장
    """
    settings = get_settings()

    # 1. 시그니처 검증
    if not await verify_kakao_signature(request):
        raise HTTPException(status_code=401, detail="Invalid signature")

    body = await request.json()
    skill_request = KakaoSkillRequest(**body)
    user_key = skill_request.userRequest.user.id
    utterance = skill_request.userRequest.utterance
    callback_url = skill_request.userRequest.callbackUrl

    # Rate Limit
    rate_limiter.check(user_key)

    # 입력 필터링
    is_safe, cleaned_text = await sanitize_input(utterance)
    if not is_safe:
        return make_text_response("죄송합니다. 해당 질문에는 답변할 수 없습니다.")

    # bot_type 결정 (action params 또는 기본값)
    bot_type = skill_request.action.params.get("bot_type", "creator")

    # 2. 사용자 연동 확인
    user_link = await _get_user_link(user_key)
    user_data = None

    # 3. 대화 이력 로드
    conversation = await get_or_create_conversation(user_key, bot_type)
    conv_id = conversation.get("id")
    history = conversation.get("messages", [])

    # 사용자 메시지 저장
    if conv_id:
        await append_message(conv_id, "user", cleaned_text)

    # 4. 민감 키워드 체크 → 에스컬레이션
    if await check_escalation(cleaned_text, bot_type):
        await process_escalation(
            cleaned_text, user_key, bot_type,
            session_id=conversation.get("session_id", ""),
        )
        response_text = "해당 문의는 담당자에게 전달되었습니다. 빠른 시일 내에 답변 드리겠습니다. 🙏"
        if conv_id:
            await append_message(conv_id, "assistant", response_text)
        return make_text_response(response_text)

    # 5. 데이터 조회 의도 감지
    if user_link and _is_data_query(cleaned_text):
        user_data = await _fetch_user_data(user_link, user_key)
    elif not user_link and _is_data_query(cleaned_text):
        response_text = "본인 확인이 필요합니다. 크넥에 가입하신 이름과 이메일을 알려주세요. (예: 홍길동 hong@email.com)"
        if conv_id:
            await append_message(conv_id, "assistant", response_text)
        return make_text_response(response_text)

    # 6. FAQ 매칭
    faq_results = await match_faq(cleaned_text, bot_type)

    # 7. 확신도 기반 분기
    if faq_results and faq_results[0]["confidence"] >= settings.faq_high_confidence:
        # 90%+ → FAQ 즉답
        response_text = faq_results[0]["faq"]["answer"]
        _log_choices(user_key, cleaned_text, [faq_results[0]["faq"]["question"]], faq_results[0]["faq"]["question"])
    elif faq_results and faq_results[0]["confidence"] >= settings.faq_medium_confidence:
        # 50~89% → 선택지 제공
        choices = [r["faq"]["question"] for r in faq_results[:3]]
        if conv_id:
            await append_message(conv_id, "assistant", f"[선택지 제공: {', '.join(choices)}]")
        return make_choices_response(
            "혹시 아래 질문 중 해당하는 것이 있으신가요?",
            choices + ["다른 질문이에요"],
        )
    else:
        # <50% → Gemini 응답
        if callback_url:
            # 비동기 처리 (5초 초과 방지)
            asyncio.create_task(_async_gemini_response(
                callback_url, cleaned_text, bot_type, history, user_data, conv_id
            ))
            return make_text_response("잠시만 기다려 주세요. 답변을 준비 중입니다... ⏳")
        else:
            system_prompt = await build_system_prompt(bot_type)
            user_context = build_user_context(user_data) if user_data else ""
            response_text = await generate_response(system_prompt, cleaned_text, history, user_context)

    # 8. 대화 저장
    if conv_id:
        await append_message(conv_id, "assistant", response_text)

    return make_text_response(response_text)


async def _get_user_link(kakao_user_key: str) -> dict | None:
    """chatbot_user_links에서 연동 정보 조회"""
    sb = get_supabase()
    result = sb.table("chatbot_user_links").select("*").eq("kakao_user_key", kakao_user_key).limit(1).execute()
    return result.data[0] if result.data else None


def _is_data_query(text: str) -> bool:
    """데이터 조회 의도 감지"""
    data_keywords = [
        "포인트", "잔액", "캠페인", "지원", "계약", "상태",
        "내 정보", "나의", "현황", "확인", "조회",
    ]
    return any(kw in text for kw in data_keywords)


async def _fetch_user_data(user_link: dict, kakao_user_key: str) -> dict | None:
    """cnecbiz chatbot-creator-data 호출"""
    settings = get_settings()
    url = f"{settings.cnecbiz_base_url}/.netlify/functions/chatbot-creator-data"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                url,
                json={"kakao_user_key": kakao_user_key, "data_type": "summary"},
                headers={
                    "Content-Type": "application/json",
                    "X-Chatbot-API-Key": settings.chatbot_api_secret,
                },
            )
            data = resp.json()
            if data.get("success"):
                return data.get("data")
    except Exception as e:
        print(f"[fetch_user_data] Error: {e}")

    return None


async def _async_gemini_response(
    callback_url: str,
    question: str,
    bot_type: str,
    history: list[dict],
    user_data: dict | None,
    conv_id: str | None,
) -> None:
    """비동기 Gemini 응답 → 콜백 전송"""
    try:
        system_prompt = await build_system_prompt(bot_type)
        user_context = build_user_context(user_data) if user_data else ""
        response_text = await generate_response(system_prompt, question, history, user_context)

        await send_callback(callback_url, response_text)

        if conv_id:
            await append_message(conv_id, "assistant", response_text)
    except Exception as e:
        print(f"[async_gemini] Error: {e}")
        await send_callback(callback_url, "죄송합니다. 답변 생성에 실패했습니다. 다시 시도해 주세요.")


def _log_choices(user_key: str, question: str, choices: list[str], selected: str) -> None:
    """선택지 로그 저장 (fire-and-forget)"""
    try:
        sb = get_supabase()
        sb.table("chatbot_choices_log").insert({
            "kakao_user_key": user_key,
            "original_question": question,
            "choices": choices,
            "selected_choice": selected,
        }).execute()
    except Exception:
        pass
