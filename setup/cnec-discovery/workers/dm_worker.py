"""Instagram DM 발송 워커"""

import asyncio
from datetime import datetime, timezone

import httpx

from config import settings
from utils.supabase_client import get_biz_client
from utils.template_renderer import render
from utils.naver_works import send_alert
from utils.logger import get_logger, log_with_data

logger = get_logger('dm')

GRAPH_API_URL = 'https://graph.facebook.com/v19.0'
HOURLY_LIMIT = 160  # 200 한도의 80%
SEND_INTERVAL = 3600 / HOURLY_LIMIT  # 약 22.5초


class DMWorker:
    def __init__(self):
        self.region = settings.SERVER_REGION
        self.biz = get_biz_client()
        self.page_id = settings.INSTAGRAM_PAGE_ID
        self.access_token = settings.INSTAGRAM_ACCESS_TOKEN
        self.stats = {
            'sent': 0,
            'failed': 0,
            'skipped': 0,
        }

    async def run(self):
        """DM 발송 워커 메인 실행"""
        logger.info(f'DM 워커 시작 (리전: {self.region})')

        if not self.page_id or not self.access_token:
            logger.warning('Instagram API 설정이 없습니다. DM 발송을 건너뜁니다.')
            return

        try:
            # queued 상태 DM 조회
            result = self.biz.table('oc_dm_queue').select(
                '*, oc_creators!inner(full_name, platform, followers, username, instagram_scoped_id)'
            ).eq('status', 'queued').eq(
                'server_region', self.region
            ).limit(HOURLY_LIMIT).execute()

            dms = result.data or []

            if not dms:
                logger.info('발송할 DM이 없습니다.')
                return

            logger.info(f'{len(dms)}건 DM 발송 시작')

            for dm in dms:
                await self._send_single(dm)
                await asyncio.sleep(SEND_INTERVAL)

        except Exception as e:
            logger.error(f'DM 워커 에러: {e}', exc_info=True)
            send_alert(f'❌ DM 워커 에러: {e}')
        finally:
            log_with_data(logger, 'INFO', 'DM 워커 완료', self.stats)

    async def _send_single(self, dm_record: dict):
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
            # 템플릿 렌더링
            template_key = dm_record.get('template_key', f'dm_intro_{self.region}')
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
                    }).eq('id', dm_id).execute()

                    # oc_creators 상태 업데이트
                    self.biz.table('oc_creators').update({
                        'contact_status': 'dm_sent',
                    }).eq('username', creator.get('username', '')).execute()

                    self.stats['sent'] += 1
                else:
                    error_msg = response.text[:500]
                    self.biz.table('oc_dm_queue').update({
                        'status': 'failed',
                        'error_message': error_msg,
                    }).eq('id', dm_id).execute()
                    self.stats['failed'] += 1
                    logger.error(f'DM 발송 실패: {response.status_code} {error_msg}')

        except Exception as e:
            self.biz.table('oc_dm_queue').update({
                'status': 'failed',
                'error_message': str(e)[:500],
            }).eq('id', dm_id).execute()
            self.stats['failed'] += 1
            logger.error(f'DM 발송 에러: {e}')


async def run():
    worker = DMWorker()
    await worker.run()


if __name__ == '__main__':
    asyncio.run(run())
