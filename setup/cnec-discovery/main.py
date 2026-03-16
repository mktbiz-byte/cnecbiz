"""CNEC Discovery — PM2 엔트리포인트"""

import argparse
import asyncio
import signal
import sys

from config import settings
from utils.logger import get_logger
from utils.naver_works import send_alert

logger = get_logger('main')

# Graceful shutdown 플래그
shutdown_event = asyncio.Event()


def handle_signal(signum, frame):
    """SIGTERM/SIGINT 시그널 핸들러"""
    sig_name = signal.Signals(signum).name
    logger.info(f'시그널 수신: {sig_name}, 종료 시작...')
    shutdown_event.set()


async def run_scheduler():
    """스케줄러 모드: 모든 워커를 크론잡으로 실행"""
    from scheduler import create_scheduler

    scheduler = create_scheduler()
    scheduler.start()

    logger.info(f'스케줄러 시작: {settings.SERVER_NAME} ({settings.SERVER_REGION})')
    send_alert(f'✅ 스케줄러 시작: {settings.SERVER_NAME}')

    try:
        while not shutdown_event.is_set():
            await asyncio.sleep(1)
    finally:
        scheduler.shutdown(wait=False)
        logger.info('스케줄러 종료')
        send_alert(f'🛑 스케줄러 종료: {settings.SERVER_NAME}')


async def run_single_worker(worker_name: str):
    """단일 워커 모드: 특정 워커만 1회 실행"""
    import importlib

    worker_map = {
        'discovery': 'workers.discovery_worker',
        'apify': 'workers.apify_worker',
        'filter': 'workers.filter_worker',
        'verify': 'workers.verify_worker',
        'email': 'workers.email_worker',
        'dm': 'workers.dm_worker',
        'heartbeat': 'workers.heartbeat_worker',
    }

    module_name = worker_map.get(worker_name)
    if not module_name:
        logger.error(f'알 수 없는 워커: {worker_name}')
        sys.exit(1)

    logger.info(f'워커 실행: {worker_name}')

    try:
        module = importlib.import_module(module_name)
        await module.run()
    except Exception as e:
        logger.error(f'워커 에러: {e}', exc_info=True)
        send_alert(f'❌ 워커 에러 ({worker_name}): {e}')
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='CNEC Discovery Worker System')
    parser.add_argument(
        '--mode',
        choices=['scheduler', 'worker'],
        required=True,
        help='실행 모드: scheduler(크론잡) 또는 worker(단일 실행)',
    )
    parser.add_argument(
        '--worker',
        choices=['discovery', 'apify', 'filter', 'verify', 'email', 'dm', 'heartbeat'],
        help='실행할 워커 이름 (--mode worker 시 필수)',
    )

    args = parser.parse_args()

    if args.mode == 'worker' and not args.worker:
        parser.error('--mode worker 사용 시 --worker 인자가 필요합니다.')

    # 시그널 핸들러 등록
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    logger.info(f'CNEC Discovery 시작: mode={args.mode}, server={settings.SERVER_NAME}')

    if args.mode == 'scheduler':
        asyncio.run(run_scheduler())
    else:
        asyncio.run(run_single_worker(args.worker))


if __name__ == '__main__':
    main()
