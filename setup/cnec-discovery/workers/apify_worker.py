"""Apify 소셜 미디어 스크래핑 워커"""

import asyncio
import json
import os
import re
import time
from datetime import datetime, timezone

from apify_client import ApifyClient

from config import settings
from utils.supabase_client import get_biz_client
from utils.dedup import check_duplicate
from utils.naver_works import send_alert
from utils.logger import get_logger, log_with_data

logger = get_logger('apify')

# Apify Actor IDs
ACTORS = {
    'instagram': 'apify/instagram-profile-scraper',
    'tiktok': 'datapilot/tiktok-email-scraper',
    'youtube': 'bernardo/youtube-scraper',
}

# 이메일 추출 regex
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# 필터링할 일반 이메일 접두사
GENERIC_PREFIXES = {
    'noreply', 'no-reply', 'support', 'info', 'admin', 'help',
    'contact', 'hello', 'team', 'press', 'media', 'sales',
    'webmaster', 'postmaster', 'abuse',
}


class ApifyWorker:
    def __init__(self):
        self.region = settings.SERVER_REGION
        self.client = ApifyClient(settings.APIFY_API_TOKEN)
        self.biz = get_biz_client()
        self.keywords = self._load_keywords()
        self.stats = {
            'total_scraped': 0,
            'emails_found': 0,
            'new_inserted': 0,
            'duplicates_skipped': 0,
            'errors': 0,
        }

    def _load_keywords(self) -> dict:
        keywords_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'config', 'keywords.json',
        )
        with open(keywords_path, 'r', encoding='utf-8') as f:
            all_keywords = json.load(f)
        return all_keywords.get(self.region, {})

    async def run(self):
        """Apify 워커 메인 실행"""
        run_start = datetime.now(timezone.utc)
        logger.info(f'Apify 워커 시작 (리전: {self.region})')

        try:
            platforms = self.keywords.get('platforms', ['instagram'])
            keywords = self.keywords.get('keywords', [])

            for platform in platforms:
                actor_id = ACTORS.get(platform)
                if not actor_id:
                    continue

                for keyword in keywords:
                    try:
                        await self._run_actor(actor_id, platform, keyword)
                    except Exception as e:
                        self.stats['errors'] += 1
                        logger.error(f'Actor 실행 실패 ({platform}/{keyword}): {e}')

                    # Actor 간 대기
                    await asyncio.sleep(5)

        except Exception as e:
            logger.error(f'Apify 워커 에러: {e}', exc_info=True)
            send_alert(f'❌ Apify 워커 에러: {e}')
        finally:
            self._save_run_log(run_start)
            log_with_data(logger, 'INFO', 'Apify 워커 완료', self.stats)

    async def _run_actor(self, actor_id: str, platform: str, keyword: str):
        """Apify Actor를 실행하고 결과를 처리합니다."""
        logger.info(f'Actor 시작: {actor_id} / {keyword}')

        # Actor 입력 구성
        run_input = self._build_input(platform, keyword)

        # Actor 실행 (동기 - apify_client는 내부적으로 polling)
        run = self.client.actor(actor_id).call(run_input=run_input, timeout_secs=300)

        if not run:
            logger.warning(f'Actor 실행 결과 없음: {actor_id}')
            return

        # 결과 가져오기
        dataset_id = run.get('defaultDatasetId')
        if not dataset_id:
            return

        items = list(self.client.dataset(dataset_id).iterate_items())
        self.stats['total_scraped'] += len(items)
        logger.info(f'Actor 결과: {len(items)}건')

        # 결과 처리
        for item in items:
            self._process_item(item, platform, keyword)

    def _build_input(self, platform: str, keyword: str) -> dict:
        """플랫폼별 Actor 입력을 구성합니다."""
        if platform == 'instagram':
            return {
                'search': keyword,
                'resultsType': 'users',
                'resultsLimit': 100,
            }
        elif platform == 'tiktok':
            return {
                'keywords': [keyword],
                'maxItems': 100,
            }
        elif platform == 'youtube':
            return {
                'searchKeywords': [keyword],
                'maxResults': 100,
            }
        return {}

    def _process_item(self, item: dict, platform: str, keyword: str):
        """스크래핑 결과 아이템을 처리합니다."""
        username = self._extract_username(item, platform)
        if not username:
            return

        # 이메일 추출
        email = self._extract_email(item)
        if email:
            self.stats['emails_found'] += 1

        # 중복 체크
        is_dup, reason = check_duplicate(platform, username, email)
        if is_dup:
            self.stats['duplicates_skipped'] += 1
            return

        # oc_creators INSERT
        record = {
            'region': self.region,
            'platform': platform,
            'username': username,
            'full_name': item.get('fullName', item.get('name', item.get('channelName', ''))),
            'email': email,
            'followers': self._extract_followers(item, platform),
            'engagement_rate': item.get('engagementRate', 0),
            'bio': item.get('biography', item.get('bio', item.get('description', ''))),
            'country': item.get('location', settings.REGION_LOCATION_MAP.get(self.region)),
            'language': settings.REGION_LANGUAGE_MAP.get(self.region),
            'discovery_keyword': keyword,
            'source': 'apify',
            'status': 'discovered',
            'contact_status': 'pending',
            'kbeauty_score': 0,
            'api_raw_data': item,
        }

        try:
            self.biz.table('oc_creators').insert(record).execute()
            self.stats['new_inserted'] += 1

            # 이메일이 있으면 큐에 추가
            if email:
                self.biz.table('oc_email_queue').insert({
                    'creator_username': username,
                    'email': email,
                    'platform': platform,
                    'server_region': self.region,
                    'template_key': f'discovery_intro_{self.region}',
                    'status': 'queued',
                }).execute()
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f'INSERT 실패 ({username}): {e}')

    def _extract_username(self, item: dict, platform: str) -> str:
        """플랫폼별 username을 추출합니다."""
        if platform == 'instagram':
            return item.get('username', item.get('handle', ''))
        elif platform == 'tiktok':
            return item.get('authorMeta', {}).get('name', item.get('username', ''))
        elif platform == 'youtube':
            return item.get('channelUrl', '').split('/')[-1] or item.get('channelId', '')
        return ''

    def _extract_followers(self, item: dict, platform: str) -> int:
        """플랫폼별 팔로워 수를 추출합니다."""
        if platform == 'instagram':
            return item.get('followersCount', item.get('followers', 0))
        elif platform == 'tiktok':
            return item.get('authorMeta', {}).get('fans', item.get('followers', 0))
        elif platform == 'youtube':
            return item.get('subscriberCount', item.get('subscribers', 0))
        return 0

    def _extract_email(self, item: dict) -> str:
        """아이템에서 이메일을 추출합니다."""
        # 직접 제공된 이메일 필드
        direct_email = item.get('email', item.get('business_email', item.get('contactEmail', '')))
        if direct_email and self._is_valid_email(direct_email):
            return direct_email.lower()

        # 바이오 텍스트에서 추출
        bio = item.get('biography', item.get('bio', item.get('description', '')))
        if bio:
            matches = EMAIL_REGEX.findall(bio)
            for match in matches:
                if self._is_valid_email(match):
                    return match.lower()

        # 외부 URL에서 추출
        website = item.get('externalUrl', item.get('website', ''))
        if website:
            matches = EMAIL_REGEX.findall(website)
            for match in matches:
                if self._is_valid_email(match):
                    return match.lower()

        return None

    def _is_valid_email(self, email: str) -> bool:
        """일반적인/무효한 이메일을 필터링합니다."""
        if not email or not EMAIL_REGEX.match(email):
            return False
        prefix = email.split('@')[0].lower()
        return prefix not in GENERIC_PREFIXES

    def _save_run_log(self, start_time: datetime):
        try:
            self.biz.table('oc_discovery_runs').insert({
                'server_region': self.region,
                'server_name': settings.SERVER_NAME,
                'api_source': 'apify',
                'found_count': self.stats['total_scraped'],
                'new_count': self.stats['new_inserted'],
                'skipped_count': self.stats['duplicates_skipped'],
                'error_count': self.stats['errors'],
                'emails_queued': self.stats['emails_found'],
                'started_at': start_time.isoformat(),
                'completed_at': datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f'실행 기록 저장 실패: {e}')


async def run():
    worker = ApifyWorker()
    await worker.run()


if __name__ == '__main__':
    asyncio.run(run())
