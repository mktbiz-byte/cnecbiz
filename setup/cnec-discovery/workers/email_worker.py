"""AWS SES 이메일 발송 워커"""

import asyncio
import time
from datetime import datetime, timezone, timedelta

import boto3
from botocore.exceptions import ClientError

from config import settings
from utils.supabase_client import get_biz_client
from utils.template_renderer import render, generate_optout_link
from utils.naver_works import send_alert
from utils.logger import get_logger, log_with_data

logger = get_logger('email')

SES_SEND_RATE = 7  # 초당 최대 7건 (SES 14/s의 50%)
BATCH_SIZE = 50
BATCH_PAUSE = 5  # 배치 간 대기 시간(초)
MAX_RETRIES = 3


class EmailWorker:
    def __init__(self):
        self.region = settings.SERVER_REGION
        self.biz = get_biz_client()
        self.ses = boto3.client(
            'ses',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.stats = {
            'sent': 0,
            'failed': 0,
            'skipped': 0,
        }

    async def run(self):
        """이메일 발송 워커 메인 실행"""
        logger.info(f'이메일 워커 시작 (리전: {self.region})')

        try:
            # queued 상태 이메일 조회
            result = self.biz.table('oc_email_queue').select(
                '*, oc_creators!inner(full_name, platform, followers, username)'
            ).eq('status', 'queued').eq(
                'server_region', self.region
            ).limit(BATCH_SIZE).execute()

            emails = result.data or []

            if not emails:
                logger.info('발송할 이메일이 없습니다.')
                return

            logger.info(f'{len(emails)}건 이메일 발송 시작')

            # 재시도 대상도 조회
            retry_result = self.biz.table('oc_email_queue').select(
                '*, oc_creators!inner(full_name, platform, followers, username)'
            ).eq('status', 'failed').eq(
                'server_region', self.region
            ).lt('retry_count', MAX_RETRIES).lte(
                'next_retry_at', datetime.now(timezone.utc).isoformat()
            ).limit(10).execute()

            if retry_result.data:
                emails.extend(retry_result.data)

            for i, email_record in enumerate(emails):
                await self._send_single(email_record)

                # Rate limit: 초당 7건
                if (i + 1) % SES_SEND_RATE == 0:
                    await asyncio.sleep(1)

                # 배치 간 대기
                if (i + 1) % BATCH_SIZE == 0:
                    logger.info(f'{i + 1}건 처리 완료, {BATCH_PAUSE}초 대기')
                    await asyncio.sleep(BATCH_PAUSE)

        except Exception as e:
            logger.error(f'이메일 워커 에러: {e}', exc_info=True)
            send_alert(f'❌ 이메일 워커 에러: {e}')
        finally:
            log_with_data(logger, 'INFO', '이메일 워커 완료', self.stats)

    async def _send_single(self, email_record: dict):
        """단일 이메일 발송"""
        email_id = email_record['id']
        to_email = email_record['email']
        template_key = email_record.get('template_key', f'discovery_intro_{self.region}')

        creator = email_record.get('oc_creators', {})
        creator_name = creator.get('full_name', creator.get('username', ''))
        platform = creator.get('platform', '')
        followers = creator.get('followers', 0)

        try:
            # 템플릿 렌더링
            variables = {
                'creator_name': creator_name,
                'platform': platform,
                'follower_count': f'{followers:,}' if isinstance(followers, int) else str(followers),
                'opt_out_link': generate_optout_link(to_email),
            }

            rendered = render(template_key, variables)

            # SES 발송
            response = self.ses.send_email(
                Source='CNEC <noreply@cnecbiz.com>',
                Destination={'ToAddresses': [to_email]},
                ReplyToAddresses=['contact@cnecbiz.com'],
                Message={
                    'Subject': {'Data': rendered['subject'], 'Charset': 'UTF-8'},
                    'Body': {
                        'Html': {'Data': rendered['body'], 'Charset': 'UTF-8'},
                    },
                },
            )

            message_id = response.get('MessageId', '')

            # 성공 업데이트
            self.biz.table('oc_email_queue').update({
                'status': 'sent',
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'message_id': message_id,
            }).eq('id', email_id).execute()

            # oc_creators 상태 업데이트
            self.biz.table('oc_creators').update({
                'contact_status': 'contacted',
                'email_1_sent_at': datetime.now(timezone.utc).isoformat(),
            }).eq('username', creator.get('username', '')).eq(
                'platform', platform
            ).execute()

            # 블랙리스트 등록 (재발송 방지)
            self.biz.table('oc_global_blocklist').upsert({
                'identifier': to_email,
                'identifier_type': 'email',
                'reason': 'already_contacted',
                'source': 'email_worker',
            }, on_conflict='identifier').execute()

            self.stats['sent'] += 1

        except ClientError as e:
            error_msg = e.response['Error']['Message']
            self._handle_failure(email_id, error_msg, email_record)

        except Exception as e:
            self._handle_failure(email_id, str(e), email_record)

    def _handle_failure(self, email_id: str, error_message: str, email_record: dict):
        """발송 실패 처리"""
        retry_count = email_record.get('retry_count', 0) + 1
        update = {
            'status': 'failed',
            'error_message': error_message[:500],
            'retry_count': retry_count,
        }

        if retry_count < MAX_RETRIES:
            next_retry = datetime.now(timezone.utc) + timedelta(minutes=30)
            update['next_retry_at'] = next_retry.isoformat()

        self.biz.table('oc_email_queue').update(update).eq('id', email_id).execute()
        self.stats['failed'] += 1
        logger.error(f'이메일 발송 실패 (retry {retry_count}): {error_message}')


async def run():
    """워커 실행 엔트리포인트"""
    worker = EmailWorker()
    await worker.run()


if __name__ == '__main__':
    asyncio.run(run())
