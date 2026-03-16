"""Influencers Club Discovery API를 통한 크리에이터 발굴 워커"""

import asyncio
import json
import os
import time
from datetime import datetime, timezone

import httpx

from config import settings
from utils.supabase_client import get_biz_client
from utils.dedup import check_duplicate
from utils.naver_works import send_alert
from utils.logger import get_logger, log_with_data

logger = get_logger('discovery')

IC_API_URL = 'https://api.influencers.club/api/v1/discovery'
IC_CREDITS_URL = 'https://api.influencers.club/api/v1/account/credits'


class DiscoveryWorker:
    def __init__(self):
        self.region = settings.SERVER_REGION
        self.keywords = self._load_keywords()
        self.biz = get_biz_client()
        self.stats = {
            'total_found': 0,
            'new_inserted': 0,
            'duplicates_skipped': 0,
            'emails_queued': 0,
            'errors': 0,
        }

    def _load_keywords(self) -> dict:
        """현재 리전의 키워드를 로드합니다."""
        keywords_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'config', 'keywords.json',
        )
        with open(keywords_path, 'r', encoding='utf-8') as f:
            all_keywords = json.load(f)
        return all_keywords.get(self.region, {})

    async def run(self):
        """Discovery 워커 메인 실행"""
        run_start = datetime.now(timezone.utc)
        logger.info(f'Discovery 워커 시작 (리전: {self.region})')

        try:
            # 크레딧 잔액 체크
            credits_ok = await self._check_credits()
            if not credits_ok:
                logger.warning('크레딧 잔액 부족으로 중단합니다.')
                send_alert('⚠️ IC API 크레딧 잔액 10% 미만. Discovery 중단.')
                return

            keywords = self.keywords.get('keywords', [])
            platforms = self.keywords.get('platforms', ['instagram'])
            follower_min, follower_max = self.keywords.get('follower_range', [1000, 500000])
            engagement_min = self.keywords.get('engagement_min', 1.5)

            for platform in platforms:
                for keyword in keywords:
                    logger.info(f'검색: {platform} / {keyword}')

                    try:
                        creators = await self._search_creators(
                            platform=platform,
                            keyword=keyword,
                            follower_min=follower_min,
                            follower_max=follower_max,
                            engagement_min=engagement_min,
                        )

                        self.stats['total_found'] += len(creators)
                        await self._process_batch(creators, platform, keyword)

                        # 100건 배치 후 10초 대기
                        if self.stats['total_found'] % 100 < len(creators):
                            logger.info('100건 배치 완료, 10초 대기')
                            await asyncio.sleep(10)

                    except Exception as e:
                        self.stats['errors'] += 1
                        logger.error(f'키워드 검색 실패 ({keyword}): {e}')

                    # 1 request per second
                    await asyncio.sleep(1)

        except Exception as e:
            logger.error(f'Discovery 워커 에러: {e}', exc_info=True)
            send_alert(f'❌ Discovery 워커 에러: {e}')
        finally:
            # 실행 기록 저장
            self._save_run_log(run_start)
            log_with_data(logger, 'INFO', 'Discovery 워커 완료', self.stats)

    async def _search_creators(
        self,
        platform: str,
        keyword: str,
        follower_min: int,
        follower_max: int,
        engagement_min: float,
    ) -> list:
        """Influencers Club API 호출"""
        headers = {
            'x-api-key': settings.IC_API_KEY,
            'Content-Type': 'application/json',
        }

        body = {
            'platform': platform,
            'keywords': [keyword],
            'location': settings.REGION_LOCATION_MAP.get(self.region),
            'follower_min': follower_min,
            'follower_max': follower_max,
            'engagement_min': engagement_min,
            'limit': 100,
        }

        backoff_times = [30, 60, 120]
        retry = 0

        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                response = await client.post(IC_API_URL, headers=headers, json=body)

                if response.status_code == 200:
                    data = response.json()
                    return data.get('results', data.get('data', []))

                if response.status_code == 429:
                    if retry >= len(backoff_times):
                        raise Exception('Rate limit 초과, 최대 재시도 횟수 도달')
                    wait = backoff_times[retry]
                    logger.warning(f'429 Rate limit, {wait}초 대기 후 재시도')
                    await asyncio.sleep(wait)
                    retry += 1
                    continue

                raise Exception(f'API 에러: {response.status_code} {response.text}')

    async def _process_batch(self, creators: list, platform: str, keyword: str):
        """크리에이터 배치를 처리합니다."""
        for creator in creators:
            username = creator.get('handle', creator.get('username', ''))
            email = creator.get('email')

            if not username:
                continue

            # 중복 체크
            is_dup, reason = check_duplicate(platform, username, email)
            if is_dup:
                self.stats['duplicates_skipped'] += 1
                continue

            # oc_creators INSERT
            record = {
                'region': self.region,
                'platform': platform,
                'username': username,
                'full_name': creator.get('display_name', creator.get('full_name', '')),
                'email': email,
                'followers': creator.get('follower_count', creator.get('followers', 0)),
                'engagement_rate': creator.get('engagement_rate', 0),
                'bio': creator.get('bio', ''),
                'country': creator.get('location', settings.REGION_LOCATION_MAP.get(self.region)),
                'language': settings.REGION_LANGUAGE_MAP.get(self.region),
                'discovery_keyword': keyword,
                'source': 'influencers_club',
                'status': 'discovered',
                'contact_status': 'pending',
                'kbeauty_score': 0,
                'api_raw_data': creator,
            }

            try:
                self.biz.table('oc_creators').insert(record).execute()
                self.stats['new_inserted'] += 1

                # 이메일이 있으면 이메일 큐에도 추가
                if email:
                    self._queue_email(username, email, platform)

            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f'INSERT 실패 ({username}): {e}')

    def _queue_email(self, username: str, email: str, platform: str):
        """oc_email_queue에 이메일 발송 대기열 추가"""
        try:
            self.biz.table('oc_email_queue').insert({
                'creator_username': username,
                'email': email,
                'platform': platform,
                'server_region': self.region,
                'template_key': f'discovery_intro_{self.region}',
                'status': 'queued',
            }).execute()
            self.stats['emails_queued'] += 1
        except Exception as e:
            logger.error(f'이메일 큐 추가 실패 ({email}): {e}')

    async def _check_credits(self) -> bool:
        """IC API 크레딧 잔액을 체크합니다. 10% 미만이면 False."""
        try:
            headers = {'x-api-key': settings.IC_API_KEY}
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(IC_CREDITS_URL, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    total = data.get('total_credits', 1)
                    remaining = data.get('remaining_credits', 1)
                    if total > 0 and (remaining / total) < 0.1:
                        return False
            return True
        except Exception as e:
            logger.warning(f'크레딧 체크 실패 (계속 진행): {e}')
            return True

    def _save_run_log(self, start_time: datetime):
        """oc_discovery_runs에 실행 기록을 저장합니다."""
        try:
            self.biz.table('oc_discovery_runs').insert({
                'server_region': self.region,
                'server_name': settings.SERVER_NAME,
                'api_source': 'influencers_club',
                'found_count': self.stats['total_found'],
                'new_count': self.stats['new_inserted'],
                'skipped_count': self.stats['duplicates_skipped'],
                'error_count': self.stats['errors'],
                'emails_queued': self.stats['emails_queued'],
                'started_at': start_time.isoformat(),
                'completed_at': datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f'실행 기록 저장 실패: {e}')


async def run():
    """워커 실행 엔트리포인트"""
    worker = DiscoveryWorker()
    await worker.run()


if __name__ == '__main__':
    asyncio.run(run())
