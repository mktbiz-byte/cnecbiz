"""대화 이력 관리"""

import uuid
from datetime import datetime, timezone
from utils.supabase_client import get_supabase
from config.settings import get_settings


async def get_or_create_conversation(kakao_user_key: str, bot_type: str) -> dict:
    """활성 대화 세션 조회 또는 생성"""
    sb = get_supabase()

    # 최근 30분 이내 대화 세션 찾기
    result = sb.table("chatbot_conversations").select("*").eq(
        "kakao_user_key", kakao_user_key
    ).eq("bot_type", bot_type).order(
        "created_at", desc=True
    ).limit(1).execute()

    if result.data:
        conv = result.data[0]
        created = datetime.fromisoformat(conv["created_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        # 30분 이내면 기존 세션 사용
        if (now - created).total_seconds() < 1800:
            return conv

    # 새 세션 생성
    session_id = str(uuid.uuid4())
    new_conv = {
        "kakao_user_key": kakao_user_key,
        "bot_type": bot_type,
        "session_id": session_id,
        "messages": [],
    }
    insert_result = sb.table("chatbot_conversations").insert(new_conv).execute()
    return insert_result.data[0] if insert_result.data else new_conv


async def append_message(conversation_id: str, role: str, content: str) -> None:
    """대화에 메시지 추가"""
    sb = get_supabase()
    settings = get_settings()

    # 현재 대화 가져오기
    result = sb.table("chatbot_conversations").select("messages").eq("id", conversation_id).single().execute()
    messages = result.data.get("messages", []) if result.data else []

    # 메시지 상한 체크
    if len(messages) >= settings.max_messages_per_session:
        messages = messages[-(settings.max_messages_per_session - 1):]

    messages.append({
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    sb.table("chatbot_conversations").update({"messages": messages}).eq("id", conversation_id).execute()


async def get_conversation_history(conversation_id: str) -> list[dict]:
    """대화 이력 조회"""
    sb = get_supabase()
    result = sb.table("chatbot_conversations").select("messages").eq("id", conversation_id).single().execute()
    return result.data.get("messages", []) if result.data else []
