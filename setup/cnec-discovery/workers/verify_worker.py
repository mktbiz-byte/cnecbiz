"""ZeroBounce 이메일 검증 워커"""

import asyncio
import time
from datetime import datetime, timezone

import requests

from config import settings
from utils.supabase_client import get_biz_client
from utils.naver_works import send_alert
from utils.logger import get_logger, log_with_data

logger = get_logger('verify')

ZEROBOUNCE_URL = 'https://api.zerobounce.net/v2/validate'
BATCH_LIMIT = 200
RATE_LIMIT_DELAY = 1  # 초당 1건


class VerifyWorker:
    def __init__(self):
        self.region = settings.SERVER_REGION
        self.biz = get_biz_client()
        self.stats = {
            'verified': 0,
            'valid': 0,
            'invalid': 0,
            'catch_all': 0,
            'unknown': 0,
            'errors': 0,
        }

    async def run(self):
        """이메일 검증 워커 메인 실행"""
        logger.info(f'이메일 검증 워커 시작 (리전: {self.region})')

        try:
            # 검증 안 된 이메일 조회
            result = self.biz.table('oc_creators').select(
                'id, username, email'
            ).not_('email', 'is', None).eq(
                'email_verified', False
            ).eq('region', self.region).limit(BATCH_LIMIT).execute()

            creators = result.data or []

            if not creators:
                logger.info('검증할 이메일이 없습니다.')
                return

            logger.info(f'{len(creators)}건 이메일 검증 시작')

            for creator in creators:
                await self._verify_single(creator)
                await asyncio.sleep(RATE_LIMIT_DELAY)

        except Exception as e:
            logger.error(f'이메일 검증 워커 에러: {e}', exc_info=True)
            send_alert(f'❌ 이메일 검증 워커 에러: {e}')
        finally:
            log_with_data(logger, 'INFO', '이메일 검증 워커 완료', self.stats)

    async def _verify_single(self, creator: dict):
        """단일 이메일 검증"""
        email = creator['email']
        creator_id = creator['id']

        try:
            response = requests.get(
                ZEROBOUNCE_URL,
                params={
                    'api_key': settings.ZEROBOUNCE_API_KEY,
                    'email': email,
                },
                timeout=15,
            )

            if response.status_code != 200:
                self.stats['errors'] += 1
                logger.error(f'ZeroBounce API 에러: {response.status_code}')
                return

            data = response.json()
            status = data.get('status', '').lower()

            update = {}

            if status == 'valid':
                update['email_verified'] = True
                update['email_verify_status'] = 'valid'
                self.stats['valid'] += 1

            elif status == 'invalid':
                update['email_verified'] = False
                update['email_verify_status'] = 'invalid'
                self.stats['invalid'] += 1

                # invalid 이메일 → 이메일 큐에서 bounced 처리
                self.biz.table('oc_email_queue').update({
                    'status': 'bounced',
                }).eq('email', email).eq('status', 'queued').execute()

                # 블랙리스트 등록
                self.biz.table('oc_global_blocklist').upsert({
                    'identifier': email,
                    'identifier_type': 'email',
                    'reason': 'bounced',
                    'source': 'zerobounce',
                }, on_conflict='identifier').execute()

            elif status == 'catch-all':
                update['email_verified'] = True
                update['email_verify_status'] = 'catch_all'
                self.stats['catch_all'] += 1

            else:
                update['email_verify_status'] = 'unknown'
                self.stats['unknown'] += 1

            if update:
                self.biz.table('oc_creators').update(update).eq('id', creator_id).execute()

            self.stats['verified'] += 1

        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f'이메일 검증 실패 ({email}): {e}')


async def run():
    worker = VerifyWorker()
    await worker.run()


if __name__ == '__main__':
    asyncio.run(run())
