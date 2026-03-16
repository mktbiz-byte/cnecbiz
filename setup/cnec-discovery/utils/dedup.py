"""글로벌 중복 체크"""

from utils.supabase_client import get_biz_client, get_region_client
from utils.logger import get_logger

logger = get_logger('dedup')


def check_duplicate(platform: str, username: str, email: str = None) -> tuple[bool, str]:
    """
    크리에이터의 중복 여부를 체크합니다.

    Returns:
        (is_duplicate: bool, reason: str)
    """
    biz = get_biz_client()

    # 1. 글로벌 블랙리스트 체크
    blocklist_query = biz.table('oc_global_blocklist').select('id, reason')

    if email:
        # username 또는 email로 체크
        result = blocklist_query.or_(
            f'identifier.eq.{username},identifier.eq.{email}'
        ).execute()
    else:
        result = blocklist_query.eq('identifier', username).execute()

    if result.data:
        reason = result.data[0].get('reason', 'blocklisted')
        return True, f'blocklist: {reason}'

    # 2. oc_creators 기존 레코드 체크
    creator_query = biz.table('oc_creators').select('id').eq(
        'platform', platform
    ).eq('username', username).limit(1).execute()

    if creator_query.data:
        return True, 'already_in_oc_creators'

    # 3. 이메일로 추가 체크
    if email:
        email_query = biz.table('oc_creators').select('id').eq(
            'email', email
        ).limit(1).execute()
        if email_query.data:
            return True, 'email_already_exists'

    # 4. 리전 DB에서 기존 회원 체크
    try:
        region = get_region_client()
        # user_profiles에서 username으로 체크
        member_query = region.table('user_profiles').select('id').or_(
            f'instagram_id.eq.{username},tiktok_id.eq.{username},youtube_id.eq.{username}'
        ).limit(1).execute()
        if member_query.data:
            return True, 'existing_member'
    except Exception as e:
        logger.warning(f'리전 DB 회원 체크 실패 (무시): {e}')

    return False, ''
