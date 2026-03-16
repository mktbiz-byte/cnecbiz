"""환경변수 로드 및 전역 설정"""

import os
from dotenv import load_dotenv

load_dotenv()

# ===== 서버 식별 =====
SERVER_REGION = os.getenv('SERVER_REGION', 'kr')
SERVER_NAME = os.getenv('SERVER_NAME', 'cnec-disc-kr')

# ===== Supabase =====
SUPABASE_BIZ_URL = os.getenv('SUPABASE_BIZ_URL')
SUPABASE_BIZ_SERVICE_KEY = os.getenv('SUPABASE_BIZ_SERVICE_KEY')
SUPABASE_REGION_URL = os.getenv('SUPABASE_REGION_URL')
SUPABASE_REGION_SERVICE_KEY = os.getenv('SUPABASE_REGION_SERVICE_KEY')

# ===== Influencers Club =====
IC_API_KEY = os.getenv('IC_API_KEY')

# ===== Apify =====
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN')

# ===== Google Gemini =====
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# ===== ZeroBounce =====
ZEROBOUNCE_API_KEY = os.getenv('ZEROBOUNCE_API_KEY')

# ===== AWS SES =====
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

# ===== Instagram Graph API =====
INSTAGRAM_PAGE_ID = os.getenv('INSTAGRAM_PAGE_ID')
INSTAGRAM_ACCESS_TOKEN = os.getenv('INSTAGRAM_ACCESS_TOKEN')

# ===== 알림 =====
NAVER_WORKS_WEBHOOK_URL = os.getenv('NAVER_WORKS_WEBHOOK_URL')
CNECBIZ_URL = os.getenv('CNECBIZ_URL', 'https://cnecbiz.com')

# ===== 매핑 =====
REGION_LANGUAGE_MAP = {
    'kr': 'ko',
    'jp': 'ja',
    'us': 'en',
}

REGION_TIMEZONE_MAP = {
    'kr': 'Asia/Seoul',
    'jp': 'Asia/Tokyo',
    'us': 'America/New_York',
}

REGION_LOCATION_MAP = {
    'kr': 'South Korea',
    'jp': 'Japan',
    'us': 'United States',
}
