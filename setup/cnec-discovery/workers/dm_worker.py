"""Instagram DM 발송 워커"""

import asyncio
import random
from datetime import datetime, timezone

import httpx

from config import settings
from utils.supabase_client import get_biz_client
from utils.template_renderer import render, clear_cache
from utils.naver_works import send_alert
from utils.logger import get_logger, log_with_data

logger = get_logger('dm')

GRAPH_API_URL = 'https://graph.facebook.com/v19.0'
DAILY_LIMIT = 40  # 하루 최대 40건 (락 방지)
SEND_INTERVAL_MIN = 45  # 최소 45초
SEND_INTERVAL_MAX = 120  # 최대 120초 (랜덤 간격)
CONSECUTIVE_FAIL_LIMIT = 3  # 연속 실패 시 중단


class DMWorker:
    def __init__(self):
        self.region = settings.SERVER_REGION
        self.biz = get_biz_client()
        self.page_id = settings.INSTAGRAM_PAGE_ID
        self.access_token = settings.INSTAGRAM_ACCESS_TOKEN
        self.consecutive_fails = 0
        self.stats = {
            'sent': 0,
            'failed': 0,
            'skipped': 0,
        }

    def _get_today_sent_count(self) -> int:
        """오늘 이미 발송한 DM 수를 조회"""
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        result = self.biz.table('oc_dm_queue').select(
            'id', count='exact'
        ).eq('server_region', self.region).eq(
            'status', 'sent'
        ).gte('sent_at', f'{today}T00:00:00Z').execute()
        return result.count or 0

    def _load_dm_templates(self) -> list:
        """DM 템플릿 키 목록 로드 (dm_intro_로 시작하는 활성 템플릿)"""
        result = self.biz.table('oc_outreach_templates').select(
            'template_key'
        ).like('template_key', f'dm_%_{self.region}%').eq(
            'is_active', True
        ).execute()
        keys = [t['template_key'] for t in (result.data or [])]
        if not keys:
            keys = [f'dm_intro_{self.region}']
        return keys

    async def run(self):
        """DM 발송 워커 메인 실행"""
        logger.info(f'DM 워커 시작 (리전: {self.region})')

        if not self.page_id or not self.access_token:
            logger.warning('Instagram API 설정이 없습니다. DM 발송을 건너뜁니다.')
            return

        try:
            # 오늘 발송량 체크
            today_sent = self._get_today_sent_count()
            remaining = DAILY_LIMIT - today_sent
            if remaining <= 0:
                logger.info(f'오늘 일일 한도 도달 ({today_sent}/{DAILY_LIMIT}건). 내일까지 대기합니다.')
                return

            # 템플릿 목록 로드 + 캐시 초기화 (매 실행마다 최신 반영)
            clear_cache()
            template_keys = self._load_dm_templates()
            logger.info(f'DM 템플릿 {len(template_keys)}개 로드: {template_keys}')

            # queued 상태 DM 조회
            result = self.biz.table('oc_dm_queue').select(
                '*, oc_creators!inner(full_name, platform, followers, username, instagram_scoped_id)'
            ).eq('status', 'queued').eq(
                'server_region', self.region
            ).limit(remaining).execute()

            dms = result.data or []

            if not dms:
                logger.info('발송할 DM이 없습니다.')
                return

            logger.info(f'{len(dms)}건 DM 발송 시작 (오늘 {today_sent}건 발송 완료, 잔여 {remaining}건)')

            for dm in dms:
                if self.consecutive_fails >= CONSECUTIVE_FAIL_LIMIT:
                    logger.warning(f'연속 {CONSECUTIVE_FAIL_LIMIT}회 실패. 락 가능성 → 발송 중단')
                    send_alert(f'⚠️ DM 워커 연속 실패 {CONSECUTIVE_FAIL_LIMIT}회 — 자동 중단 (리전: {self.region})')
                    break

                await self._send_single(dm, template_keys)

                # 랜덤 간격 대기 (봇 패턴 방지)
                interval = random.uniform(SEND_INTERVAL_MIN, SEND_INTERVAL_MAX)
                await asyncio.sleep(interval)

        except Exception as e:
            logger.error(f'DM 워커 에러: {e}', exc_info=True)
            send_alert(f'❌ DM 워커 에러: {e}')
        finally:
            log_with_data(logger, 'INFO', 'DM 워커 완료', self.stats)

    async def _send_single(self, dm_record: dict, template_keys: list):
        """단일 DM 발송"""
        dm_id = dm_record['id']
        creator = dm_record.get('oc_creators', {})
        scoped_id = creator.get('instagram_scoped_id')

        if not scoped_id:
            self.biz.table('oc_dm_queue').update({
                'status': 'skipped',
                'error_message': 'instagram_scoped_id 없음',
            }).eq('id', dm_id).execute()
            self.stats['skipped'] += 1
            return

        try:
            # 랜덤 템플릿 선택 (메시지 다양화)
            template_key = dm_record.get('template_key') or random.choice(template_keys)
            variables = {
                'creator_name': creator.get('full_name', creator.get('username', '')),
                'platform': creator.get('platform', ''),
                'follower_count': f"{creator.get('followers', 0):,}",
            }

            rendered = render(template_key, variables)
            message_text = rendered.get('body', rendered.get('subject', ''))

            # Instagram Graph API 호출
            url = f'{GRAPH_API_URL}/{self.page_id}/messages'
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(url, json={
                    'recipient': {'id': scoped_id},
                    'message': {'text': message_text},
                    'access_token': self.access_token,
                })

                if response.status_code == 200:
                    result = response.json()
                    self.biz.table('oc_dm_queue').update({
                        'status': 'sent',
                        'sent_at': datetime.now(timezone.utc).isoformat(),
                        'message_id': result.get('message_id', ''),
                        'template_key': template_key,
                    }).eq('id', dm_id).execute()

                    # oc_creators 상태 업데이트
                    self.biz.table('oc_creators').update({
                        'contact_status': 'dm_sent',
                    }).eq('username', creator.get('username', '')).execute()

                    self.stats['sent'] += 1
                    self.consecutive_fails = 0
                else:
                    error_msg = response.text[:500]
                    self.biz.table('oc_dm_queue').update({
                        'status': 'failed',
                        'error_message': error_msg,
                    }).eq('id', dm_id).execute()
                    self.stats['failed'] += 1
                    self.consecutive_fails += 1
                    logger.error(f'DM 발송 실패: {response.status_code} {error_msg}')

        except Exception as e:
            self.biz.table('oc_dm_queue').update({
                'status': 'failed',
                'error_message': str(e)[:500],
            }).eq('id', dm_id).execute()
            self.stats['failed'] += 1
            self.consecutive_fails += 1
            logger.error(f'DM 발송 에러: {e}')


async def run():
    worker = DMWorker()
    await worker.run()


if __name__ == '__main__':
    asyncio.run(run())
