"""Gemini AI K-뷰티 적합도 평가 워커"""

import asyncio
import json
from datetime import datetime, timezone

import google.generativeai as genai

from config import settings
from utils.supabase_client import get_biz_client
from utils.naver_works import send_alert
from utils.logger import get_logger, log_with_data

logger = get_logger('filter')

BATCH_SIZE = 10  # Gemini 한 번에 10명씩
TOTAL_LIMIT = 100  # 1회 실행 최대 100명
GEMINI_RPM_DELAY = 5  # 초 (15 RPM 안전 마진)

SCORING_PROMPT = """다음 크리에이터들이 K-뷰티(한국 화장품/스킨케어) 관련 콘텐츠를 만드는
크리에이터인지 0~100점으로 평가해주세요.

채점 기준:
- 80~100점: 확실한 뷰티 크리에이터 (바이오/콘텐츠에 화장품, 스킨케어, 뷰티 키워드 다수)
- 50~79점: 뷰티 관련 콘텐츠가 일부 있음 (라이프스타일에 뷰티 포함)
- 0~49점: 뷰티와 무관한 크리에이터

각 크리에이터에 대해 JSON 배열로만 응답해주세요:
[{"username": "...", "score": 85, "reason": "..."}, ...]

크리에이터 목록:
{creators_json}"""


class FilterWorker:
    def __init__(self):
        self.region = settings.SERVER_REGION
        self.biz = get_biz_client()
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.stats = {
            'processed': 0,
            'high_score': 0,
            'low_score': 0,
            'errors': 0,
        }

    async def run(self):
        """필터 워커 메인 실행"""
        logger.info(f'필터 워커 시작 (리전: {self.region})')

        try:
            # kbeauty_score=0인 크리에이터 조회
            result = self.biz.table('oc_creators').select(
                'id, username, platform, bio, full_name, followers'
            ).eq('kbeauty_score', 0).eq(
                'region', self.region
            ).limit(TOTAL_LIMIT).execute()

            creators = result.data or []

            if not creators:
                logger.info('평가할 크리에이터가 없습니다.')
                return

            logger.info(f'{len(creators)}명 K-뷰티 적합도 평가 시작')

            # 10명씩 배치 처리
            for i in range(0, len(creators), BATCH_SIZE):
                batch = creators[i:i + BATCH_SIZE]
                await self._evaluate_batch(batch)

                # Gemini RPM 제한 준수
                await asyncio.sleep(GEMINI_RPM_DELAY)

        except Exception as e:
            logger.error(f'필터 워커 에러: {e}', exc_info=True)
            send_alert(f'❌ 필터 워커 에러: {e}')
        finally:
            log_with_data(logger, 'INFO', '필터 워커 완료', self.stats)

    async def _evaluate_batch(self, batch: list):
        """배치 크리에이터를 Gemini로 평가합니다."""
        # Gemini에 전달할 크리에이터 정보
        creators_for_ai = []
        for c in batch:
            creators_for_ai.append({
                'username': c['username'],
                'platform': c.get('platform', ''),
                'full_name': c.get('full_name', ''),
                'bio': (c.get('bio', '') or '')[:300],  # 바이오 300자 제한
                'followers': c.get('followers', 0),
            })

        prompt = SCORING_PROMPT.format(
            creators_json=json.dumps(creators_for_ai, ensure_ascii=False)
        )

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()

            # JSON 파싱 (```json ... ``` 래핑 제거)
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
                text = text.rsplit('```', 1)[0]

            scores = json.loads(text)

            # 점수 업데이트
            score_map = {s['username']: s for s in scores}

            for creator in batch:
                username = creator['username']
                score_data = score_map.get(username)

                if not score_data:
                    continue

                score = score_data.get('score', 0)
                reason = score_data.get('reason', '')

                update = {
                    'kbeauty_score': score,
                    'kbeauty_reason': reason[:500],
                    'kbeauty_evaluated_at': datetime.now(timezone.utc).isoformat(),
                }

                # 80점 이상 + 팔로워 10000 이상 → 특별 타겟
                if score >= 80 and (creator.get('followers', 0) or 0) > 10000:
                    update['is_special_target'] = True
                    self.stats['high_score'] += 1
                else:
                    self.stats['low_score'] += 1

                self.biz.table('oc_creators').update(update).eq(
                    'id', creator['id']
                ).execute()

                self.stats['processed'] += 1

        except json.JSONDecodeError as e:
            self.stats['errors'] += 1
            logger.error(f'Gemini 응답 JSON 파싱 실패: {e}')
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f'배치 평가 실패: {e}')


async def run():
    worker = FilterWorker()
    await worker.run()


if __name__ == '__main__':
    asyncio.run(run())
