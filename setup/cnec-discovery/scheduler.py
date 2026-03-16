"""APScheduler 크론잡 스케줄러"""

import json
import os
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from config import settings
from utils.logger import get_logger
from utils.naver_works import send_alert

logger = get_logger('scheduler')

# 워커 모듈 매핑
WORKER_MAP = {
    'discovery': 'workers.discovery_worker',
    'apify': 'workers.apify_worker',
    'filter': 'workers.filter_worker',
    'verify': 'workers.verify_worker',
    'email': 'workers.email_worker',
    'dm': 'workers.dm_worker',
    'heartbeat': 'workers.heartbeat_worker',
}


def load_schedule():
    """schedule.json에서 스케줄 설정을 로드합니다."""
    schedule_path = os.path.join(
        os.path.dirname(__file__), 'config', 'schedule.json'
    )
    with open(schedule_path, 'r', encoding='utf-8') as f:
        return json.load(f)


async def run_worker(worker_name: str):
    """워커를 실행합니다."""
    import importlib
    try:
        module = importlib.import_module(WORKER_MAP[worker_name])
        logger.info(f'워커 실행: {worker_name}')
        await module.run()
    except Exception as e:
        logger.error(f'워커 실행 실패 ({worker_name}): {e}', exc_info=True)
        send_alert(f'❌ 워커 실행 실패: {worker_name} - {e}')


async def send_daily_report():
    """일일 리포트를 네이버웍스로 발송합니다."""
    from utils.supabase_client import get_biz_client

    try:
        biz = get_biz_client()
        today = datetime.utcnow().strftime('%Y-%m-%d')

        # 오늘 통계
        discovered = biz.table('oc_creators').select(
            'id', count='exact'
        ).eq('region', settings.SERVER_REGION).gte(
            'created_at', f'{today}T00:00:00Z'
        ).execute()

        emails_sent = biz.table('oc_email_queue').select(
            'id', count='exact'
        ).eq('server_region', settings.SERVER_REGION).eq(
            'status', 'sent'
        ).gte('sent_at', f'{today}T00:00:00Z').execute()

        msg = (
            f'📊 Discovery 일일 리포트\n'
            f'━━━━━━━━━━━━━━━━━\n'
            f'📅 {today}\n'
            f'🌏 서버: {settings.SERVER_NAME}\n\n'
            f'🔍 오늘 발굴: {discovered.count or 0}명\n'
            f'📧 오늘 이메일: {emails_sent.count or 0}건\n'
        )

        send_alert(msg)
        logger.info('일일 리포트 발송 완료')

    except Exception as e:
        logger.error(f'일일 리포트 발송 실패: {e}')


def create_scheduler() -> AsyncIOScheduler:
    """스케줄러를 생성하고 구성합니다."""
    timezone = settings.REGION_TIMEZONE_MAP.get(settings.SERVER_REGION, 'UTC')
    scheduler = AsyncIOScheduler(timezone=timezone)
    schedule = load_schedule()

    # 시간 제한 워커 등록
    time_limited_workers = ['discovery', 'apify', 'filter', 'verify', 'email', 'dm']
    for worker_name in time_limited_workers:
        config = schedule.get(worker_name)
        if not config:
            continue

        start_hour = config.get('start_hour', 0)
        end_hour = config.get('end_hour', 24)
        interval_minutes = config.get('interval_minutes', 30)

        trigger = CronTrigger(
            hour=f'{start_hour}-{end_hour - 1}',
            minute=f'*/{interval_minutes}',
            timezone=timezone,
        )

        scheduler.add_job(
            run_worker,
            trigger=trigger,
            args=[worker_name],
            id=f'worker_{worker_name}',
            name=f'{worker_name} worker',
            replace_existing=True,
        )
        logger.info(f'스케줄 등록: {worker_name} ({start_hour}:00~{end_hour}:00, 매 {interval_minutes}분)')

    # Heartbeat (30초 간격, 상시)
    heartbeat_config = schedule.get('heartbeat', {})
    scheduler.add_job(
        run_worker,
        trigger=IntervalTrigger(seconds=heartbeat_config.get('interval_seconds', 30)),
        args=['heartbeat'],
        id='worker_heartbeat',
        name='heartbeat worker',
        replace_existing=True,
    )
    logger.info('스케줄 등록: heartbeat (매 30초)')

    # 일일 리포트 (22:00)
    report_config = schedule.get('daily_report', {})
    scheduler.add_job(
        send_daily_report,
        trigger=CronTrigger(
            hour=report_config.get('hour', 22),
            minute=report_config.get('minute', 0),
            timezone=timezone,
        ),
        id='daily_report',
        name='daily report',
        replace_existing=True,
    )
    logger.info('스케줄 등록: daily_report (22:00)')

    return scheduler
