"""시스템 프롬프트 동적 조립"""

from utils.supabase_client import get_supabase


async def build_system_prompt(bot_type: str) -> str:
    """DB에서 활성 프롬프트 + 기준틀을 읽어 시스템 프롬프트를 조립"""
    sb = get_supabase()

    # 활성 프롬프트 가져오기
    result = sb.table("chatbot_prompts").select("*").eq("bot_type", bot_type).eq("is_active", True).single().execute()
    prompt_data = result.data if result.data else {}

    system_prompt = prompt_data.get("system_prompt", _default_prompt(bot_type))
    tone_config = prompt_data.get("tone_config", {})

    # 기준틀 가져오기
    guardrails_result = sb.table("chatbot_guardrails").select("*").eq("bot_type", bot_type).eq("is_active", True).execute()
    guardrails = guardrails_result.data or []

    # 기준틀을 프롬프트에 주입
    rules_text = _format_guardrails(guardrails)
    tone_text = _format_tone(tone_config)

    return f"""{system_prompt}

{tone_text}

{rules_text}"""


def build_user_context(user_data: dict | None) -> str:
    """연동된 사용자 데이터를 컨텍스트 문자열로 변환"""
    if not user_data:
        return ""

    parts = []
    if user_data.get("display_name"):
        parts.append(f"사용자 이름: {user_data['display_name']}")
    if user_data.get("campaigns"):
        campaigns_text = "\n".join(
            f"  - 캠페인 {c['campaign_id']}: 상태 {c['status']}, 지원일 {c['applied_at']}"
            for c in user_data["campaigns"][:5]
        )
        parts.append(f"캠페인 현황:\n{campaigns_text}")
    if user_data.get("points"):
        points = user_data["points"]
        parts.append(f"포인트 잔액: {points.get('balance', 0)}P")
    if user_data.get("contracts"):
        contracts_text = "\n".join(
            f"  - 계약 상태: {c['status']}" for c in user_data["contracts"][:3]
        )
        parts.append(f"계약 현황:\n{contracts_text}")

    if not parts:
        return ""
    return "\n\n[사용자 실시간 데이터]\n" + "\n".join(parts)


def _default_prompt(bot_type: str) -> str:
    if bot_type == "creator":
        return """당신은 크넥(CNEC) 크리에이터 마케팅 플랫폼의 AI 상담 도우미입니다.
크리에이터들의 캠페인 참여, 포인트, 계약, 콘텐츠 제작 관련 질문에 친절하고 정확하게 답변해 주세요.
모르는 내용은 솔직히 모른다고 하고, 담당자 연결을 안내해 주세요."""
    else:
        return """당신은 크넥(CNEC) 크리에이터 마케팅 플랫폼의 기업용 AI 상담 도우미입니다.
기업 고객의 캠페인 등록, 크리에이터 매칭, 결제, 계약 관련 질문에 전문적으로 답변해 주세요.
모르는 내용은 솔직히 모른다고 하고, 담당자 연결을 안내해 주세요."""


def _format_guardrails(guardrails: list) -> str:
    sections = {
        "allowed_topics": [],
        "blocked_topics": [],
        "escalation_triggers": [],
        "tone": [],
        "response_limits": [],
    }

    for rule in guardrails:
        rule_type = rule.get("rule_type", "")
        if rule_type in sections:
            sections[rule_type].append(rule.get("rule_value", ""))

    parts = []
    if sections["allowed_topics"]:
        parts.append("[허용 주제]\n" + "\n".join(f"- {t}" for t in sections["allowed_topics"]))
    if sections["blocked_topics"]:
        parts.append("[금지 주제 - 절대 답변하지 마세요]\n" + "\n".join(f"- {t}" for t in sections["blocked_topics"]))
    if sections["escalation_triggers"]:
        parts.append("[에스컬레이션 트리거 - 아래 키워드가 포함되면 즉시 담당자 연결 안내]\n" + "\n".join(f"- {t}" for t in sections["escalation_triggers"]))
    if sections["response_limits"]:
        parts.append("[응답 제한]\n" + "\n".join(f"- {t}" for t in sections["response_limits"]))

    return "\n\n".join(parts) if parts else ""


def _format_tone(tone_config: dict) -> str:
    if not tone_config:
        return ""

    parts = ["[말투 설정]"]
    if tone_config.get("formality"):
        parts.append(f"- 격식: {tone_config['formality']}")
    if tone_config.get("emoji_usage"):
        parts.append(f"- 이모지 사용: {tone_config['emoji_usage']}")
    if tone_config.get("response_length"):
        parts.append(f"- 응답 길이: {tone_config['response_length']}")

    return "\n".join(parts)
