"""CNEC Discovery 통합 테스트"""

import json
import os
import sys
import unittest
from unittest.mock import patch, MagicMock, AsyncMock

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


class TestDedup(unittest.TestCase):
    """중복 체크 로직 테스트"""

    @patch('utils.dedup.get_biz_client')
    @patch('utils.dedup.get_region_client')
    def test_duplicate_in_blocklist(self, mock_region, mock_biz):
        from utils.dedup import check_duplicate

        # 블랙리스트에 있는 경우
        mock_client = MagicMock()
        mock_biz.return_value = mock_client

        mock_result = MagicMock()
        mock_result.data = [{'id': '1', 'reason': 'manual_block'}]
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result

        is_dup, reason = check_duplicate('instagram', 'blocked_user')
        self.assertTrue(is_dup)
        self.assertIn('blocklist', reason)

    @patch('utils.dedup.get_biz_client')
    @patch('utils.dedup.get_region_client')
    def test_not_duplicate(self, mock_region, mock_biz):
        from utils.dedup import check_duplicate

        mock_client = MagicMock()
        mock_biz.return_value = mock_client

        # 모든 조회에서 빈 결과
        empty_result = MagicMock()
        empty_result.data = []

        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = empty_result
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = empty_result
        mock_client.table.return_value.select.return_value.or_.return_value.execute.return_value = empty_result

        mock_region_client = MagicMock()
        mock_region.return_value = mock_region_client
        mock_region_client.table.return_value.select.return_value.or_.return_value.limit.return_value.execute.return_value = empty_result

        is_dup, reason = check_duplicate('instagram', 'new_user')
        self.assertFalse(is_dup)
        self.assertEqual(reason, '')


class TestTemplateRenderer(unittest.TestCase):
    """템플릿 렌더러 테스트"""

    def test_substitute(self):
        from utils.template_renderer import _substitute

        template = 'Hello {{creator_name}}, you have {{follower_count}} followers!'
        result = _substitute(template, {
            'creator_name': 'TestUser',
            'follower_count': '10,000',
        })
        self.assertEqual(result, 'Hello TestUser, you have 10,000 followers!')

    def test_html_escape(self):
        from utils.template_renderer import _substitute

        template = '{{name}}'
        result = _substitute(template, {'name': '<script>alert("xss")</script>'})
        self.assertNotIn('<script>', result)
        self.assertIn('&lt;script&gt;', result)

    def test_missing_variable_kept(self):
        from utils.template_renderer import _substitute

        template = 'Hello {{unknown_var}}'
        result = _substitute(template, {})
        self.assertEqual(result, 'Hello {{unknown_var}}')

    def test_optout_link(self):
        from utils.template_renderer import generate_optout_link

        link = generate_optout_link('test@example.com')
        self.assertIn('email-optout', link)
        self.assertIn('token=', link)


class TestKeywords(unittest.TestCase):
    """키워드 설정 파일 테스트"""

    def test_keywords_file_valid(self):
        keywords_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'config', 'keywords.json',
        )
        with open(keywords_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.assertIn('kr', data)
        self.assertIn('jp', data)
        self.assertIn('us', data)

        for region in ['kr', 'jp', 'us']:
            self.assertIn('keywords', data[region])
            self.assertIn('platforms', data[region])
            self.assertIn('follower_range', data[region])
            self.assertIn('engagement_min', data[region])
            self.assertIsInstance(data[region]['keywords'], list)
            self.assertTrue(len(data[region]['keywords']) > 0)


class TestScheduleConfig(unittest.TestCase):
    """스케줄 설정 파일 테스트"""

    def test_schedule_file_valid(self):
        schedule_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'config', 'schedule.json',
        )
        with open(schedule_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 필수 워커 존재 확인
        required = ['discovery', 'apify', 'filter', 'verify', 'email', 'dm', 'heartbeat', 'daily_report']
        for worker in required:
            self.assertIn(worker, data, f'{worker} 설정이 없습니다.')

        # heartbeat는 interval_seconds 필수
        self.assertIn('interval_seconds', data['heartbeat'])
        self.assertGreater(data['heartbeat']['interval_seconds'], 0)


class TestSettings(unittest.TestCase):
    """설정 모듈 테스트"""

    def test_region_maps(self):
        from config.settings import REGION_LANGUAGE_MAP, REGION_TIMEZONE_MAP

        self.assertEqual(REGION_LANGUAGE_MAP['kr'], 'ko')
        self.assertEqual(REGION_LANGUAGE_MAP['jp'], 'ja')
        self.assertEqual(REGION_LANGUAGE_MAP['us'], 'en')

        self.assertEqual(REGION_TIMEZONE_MAP['kr'], 'Asia/Seoul')
        self.assertEqual(REGION_TIMEZONE_MAP['jp'], 'Asia/Tokyo')
        self.assertEqual(REGION_TIMEZONE_MAP['us'], 'America/New_York')


if __name__ == '__main__':
    unittest.main()
