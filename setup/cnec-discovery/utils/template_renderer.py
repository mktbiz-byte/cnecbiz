"""이메일 템플릿 변수 치환"""

import base64
import re

from utils.supabase_client import get_biz_client
from utils.logger import get_logger
from config import settings

logger = get_logger('template_renderer')

# 템플릿 캐시
_template_cache: dict = {}


def render(template_key: str, variables: dict) -> dict:
    """
    oc_outreach_templates에서 템플릿을 로드하고 변수를 치환합니다.

    Returns:
        {'subject': str, 'body': str}
    """
    template = _load_template(template_key)
    if not template:
        raise ValueError(f'템플릿을 찾을 수 없습니다: {template_key}')

    subject = _substitute(template['subject'], variables)
    body = _substitute(template['body'], variables)

    return {'subject': subject, 'body': body}


def generate_optout_link(email: str) -> str:
    """수신거부 URL을 생성합니다."""
    token = base64.urlsafe_b64encode(email.encode()).decode()
    return f'{settings.CNECBIZ_URL}/.netlify/functions/email-optout?token={token}'


def _load_template(template_key: str) -> dict:
    """템플릿을 DB에서 로드합니다 (캐시 사용)."""
    if template_key in _template_cache:
        return _template_cache[template_key]

    biz = get_biz_client()
    result = biz.table('oc_outreach_templates').select(
        'subject, body'
    ).eq('template_key', template_key).eq('is_active', True).single().execute()

    if result.data:
        _template_cache[template_key] = result.data
        return result.data

    return None


def _substitute(text: str, variables: dict) -> str:
    """{{변수}} 패턴을 치환합니다."""
    def replacer(match):
        key = match.group(1).strip()
        value = variables.get(key, match.group(0))
        if isinstance(value, str):
            return _html_escape(value)
        return str(value)

    return re.sub(r'\{\{(\s*\w+\s*)\}\}', replacer, text)


def _html_escape(text: str) -> str:
    """HTML 특수 문자를 이스케이프합니다."""
    return (
        text.replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&#x27;')
    )


def clear_cache():
    """템플릿 캐시를 초기화합니다."""
    _template_cache.clear()
