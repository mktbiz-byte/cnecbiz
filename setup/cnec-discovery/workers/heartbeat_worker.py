"""서버 상태 모니터링 Heartbeat 워커"""

import asyncio
from datetime import datetime, timezone

import psutil
import httpx

from config import settings
from utils.supabase_client import get_biz_client
from utils.logger import get_logger

logger = get_logger('heartbeat')

IC_CREDITS_URL = 'https://api.influencers.club/api/v1/account/credits'


class HeartbeatWorker:
    def __init__(self):
        self.biz = get_biz_client()
        self.region = settings.SERVER_REGION
        self.server_name = settings.SERVER_NAME

    async def run_forever(self):
        """30초 간격으로 heartbeat를 전송합니다."""
        logger.info(f'Heartbeat 시작: {self.server_name} ({self.region})')

        while True:
            try:
                await self._send_heartbeat()
            except Exception as e:
                logger.error(f'Heartbeat 실패: {e}')

            await asyncio.sleep(30)

    async def _send_heartbeat(self):
        """시스템 메트릭과 통계를 수집하여 전송합니다."""
        # 시스템 메트릭
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        # 오늘 날짜 기준 통계
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        stats = self._get_today_stats(today)

        # IC 크레딧 잔액
        ic_credits = await self._get_ic_credits()

        # UPSERT
        record = {
            'server_region': self.region,
            'server_name': self.server_name,
            'status': 'alive',
            'cpu_percent': round(cpu_percent, 1),
            'memory_percent': round(memory.percent, 1),
            'disk_percent': round(disk.percent, 1),
            'today_discovered': stats.get('today_discovered', 0),
            'today_emails_sent': stats.get('today_emails_sent', 0),
            'today_dms_sent': stats.get('today_dms_sent', 0),
            'ic_credits_remaining': ic_credits,
            'last_heartbeat_at': datetime.now(timezone.utc).isoformat(),
        }

        self.biz.table('oc_server_heartbeats').upsert(
            record,
            on_conflict='server_region,server_name',
        ).execute()

    def _get_today_stats(self, today: str) -> dict:
        """오늘 날짜 기준 통계를 조회합니다."""
        stats = {}

        try:
            # 오늘 발견된 크리에이터 수
            result = self.biz.table('oc_creators').select(
                'id', count='exact'
            ).eq('region', self.region).gte(
                'created_at', f'{today}T00:00:00Z'
            ).execute()
            stats['today_discovered'] = result.count or 0
        except Exception:
            stats['today_discovered'] = 0

        try:
            # 오늘 발송된 이메일 수
            result = self.biz.table('oc_email_queue').select(
                'id', count='exact'
            ).eq('server_region', self.region).eq(
                'status', 'sent'
            ).gte('sent_at', f'{today}T00:00:00Z').execute()
            stats['today_emails_sent'] = result.count or 0
        except Exception:
            stats['today_emails_sent'] = 0

        try:
            # 오늘 발송된 DM 수
            result = self.biz.table('oc_dm_queue').select(
                'id', count='exact'
            ).eq('server_region', self.region).eq(
                'status', 'sent'
            ).gte('sent_at', f'{today}T00:00:00Z').execute()
            stats['today_dms_sent'] = result.count or 0
        except Exception:
            stats['today_dms_sent'] = 0

        return stats

    async def _get_ic_credits(self) -> int:
        """Influencers Club 크레딧 잔액을 조회합니다."""
        try:
            if not settings.IC_API_KEY:
                return -1
            headers = {'x-api-key': settings.IC_API_KEY}
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(IC_CREDITS_URL, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return data.get('remaining_credits', -1)
        except Exception:
            pass
        return -1


async def run():
    """워커 실행 엔트리포인트"""
    worker = HeartbeatWorker()
    await worker.run_forever()


if __name__ == '__main__':
    asyncio.run(run())
