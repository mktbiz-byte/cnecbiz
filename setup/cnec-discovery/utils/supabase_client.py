"""Supabase 클라이언트 (싱글톤 패턴)"""

from supabase import create_client, Client
from config import settings

_biz_client: Client = None
_region_client: Client = None


def get_biz_client() -> Client:
    """BIZ DB 클라이언트를 반환합니다 (싱글톤)."""
    global _biz_client
    if _biz_client is None:
        if not settings.SUPABASE_BIZ_URL or not settings.SUPABASE_BIZ_SERVICE_KEY:
            raise ValueError('SUPABASE_BIZ_URL과 SUPABASE_BIZ_SERVICE_KEY가 필요합니다.')
        _biz_client = create_client(
            settings.SUPABASE_BIZ_URL,
            settings.SUPABASE_BIZ_SERVICE_KEY,
        )
    return _biz_client


def get_region_client() -> Client:
    """현재 서버 리전의 DB 클라이언트를 반환합니다 (싱글톤)."""
    global _region_client
    if _region_client is None:
        if not settings.SUPABASE_REGION_URL or not settings.SUPABASE_REGION_SERVICE_KEY:
            raise ValueError('SUPABASE_REGION_URL과 SUPABASE_REGION_SERVICE_KEY가 필요합니다.')
        _region_client = create_client(
            settings.SUPABASE_REGION_URL,
            settings.SUPABASE_REGION_SERVICE_KEY,
        )
    return _region_client
