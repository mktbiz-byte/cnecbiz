"""네이버웍스 알림 발송"""

import requests
from config import settings
from utils.logger import get_logger

logger = get_logger('naver_works')

# 에러 알림 전용 채널
ERROR_CHANNEL_ID = '54220a7e-0b14-1138-54ec-a55f62dc8b75'


def send_alert(message: str, channel_id: str = None):
    """네이버웍스 채널에 알림을 발송합니다."""
    if not settings.CNECBIZ_URL:
        logger.warning('CNECBIZ_URL이 설정되지 않아 알림을 발송할 수 없습니다.')
        return

    url = f'{settings.CNECBIZ_URL}/.netlify/functions/send-naver-works-message'

    payload = {
        'message': f'[Discovery-{settings.SERVER_NAME}] {message}',
        'channelId': channel_id or ERROR_CHANNEL_ID,
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code != 200:
            logger.error(f'알림 발송 실패: {response.status_code} {response.text}')
    except Exception as e:
        logger.error(f'알림 발송 에러: {e}')
