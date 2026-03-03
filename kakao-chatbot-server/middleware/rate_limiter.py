"""분당 요청 제한 미들웨어"""

import time
from collections import defaultdict
from fastapi import Request, HTTPException
from config.settings import get_settings


class RateLimiter:
    def __init__(self):
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._limit = get_settings().rate_limit_per_minute

    def check(self, user_key: str) -> None:
        now = time.time()
        window_start = now - 60

        # 1분 이전 기록 제거
        self._requests[user_key] = [
            t for t in self._requests[user_key] if t > window_start
        ]

        if len(self._requests[user_key]) >= self._limit:
            raise HTTPException(status_code=429, detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")

        self._requests[user_key].append(now)


rate_limiter = RateLimiter()
