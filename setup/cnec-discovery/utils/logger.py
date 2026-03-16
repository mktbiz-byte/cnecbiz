"""구조화된 JSON 로깅"""

import json
import logging
import os
import sys
from datetime import datetime, timezone

from config import settings


class JsonFormatter(logging.Formatter):
    """JSON 형태로 로그를 출력하는 포매터"""

    def format(self, record):
        log_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'worker': getattr(record, 'worker', 'system'),
            'region': settings.SERVER_REGION,
            'message': record.getMessage(),
        }

        if hasattr(record, 'data') and record.data:
            log_data['data'] = record.data

        if record.exc_info and record.exc_info[0]:
            log_data['error'] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False, default=str)


def get_logger(worker_name: str) -> logging.Logger:
    """워커별 로거를 반환합니다."""
    logger = logging.getLogger(f'cnec.{worker_name}')

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JsonFormatter())
    logger.addHandler(console_handler)

    # 파일 핸들러
    log_dir = '/home/cnec/cnec-discovery/logs'
    if os.path.isdir(log_dir):
        file_handler = logging.FileHandler(
            os.path.join(log_dir, f'{worker_name}.log'),
            encoding='utf-8',
        )
        file_handler.setFormatter(JsonFormatter())
        logger.addHandler(file_handler)

    logger.propagate = False
    return logger


def log_with_data(logger: logging.Logger, level: str, message: str, data: dict = None):
    """추가 데이터와 함께 로그를 기록합니다."""
    extra = {'data': data}
    getattr(logger, level.lower())(message, extra=extra)
