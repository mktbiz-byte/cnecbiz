# 카카오톡 AI 챗봇 구현 계획서

## 개요

크넥(CNEC) 카카오톡 AI 챗봇 시스템을 구현합니다.
- **크리에이터용 챗봇** + **기업용 챗봇** (카카오 i 오픈빌더)
- **GCP 스킬 서버** (FastAPI/Python) → `cnecbiz/kakao-chatbot-server/`
- **관리자 UI** (cnecbiz.com/admin/chatbot/*)
- **DB** (Supabase BIZ DB 11개 테이블)

---

## Phase 1: 데이터베이스 구축 (Supabase MCP 직접 적용)

### 1-1. 코어 테이블 (7개)

**chatbot_faq** — FAQ 데이터
```sql
CREATE TABLE chatbot_faq (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_type text NOT NULL CHECK (bot_type IN ('creator', 'business')),
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[] DEFAULT '{}',
  confidence numeric DEFAULT 1.0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**chatbot_conversations** — 대화 이력
```sql
CREATE TABLE chatbot_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kakao_user_key text NOT NULL,       -- 카카오 user_key (해시)
  bot_type text NOT NULL CHECK (bot_type IN ('creator', 'business')),
  session_id text NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,  -- [{role, content, timestamp}]
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  total_messages integer DEFAULT 0,
  satisfaction_rating integer,         -- 1~5
  created_at timestamptz DEFAULT now()
);
```

**chatbot_unanswered** — 미답변 큐 (에스컬레이션)
```sql
CREATE TABLE chatbot_unanswered (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kakao_user_key text,
  bot_type text NOT NULL CHECK (bot_type IN ('creator', 'business')),
  question text NOT NULL,
  user_context jsonb DEFAULT '{}'::jsonb,  -- 이전 대화, 사용자 정보
  confidence numeric,                      -- AI 확신도
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'answered', 'rejected')),
  assigned_to text,                        -- 담당자
  answer text,                             -- 담당자 답변
  answered_at timestamptz,
  naver_works_sent boolean DEFAULT false,
  callback_sent boolean DEFAULT false,     -- 카카오 콜백 전송 여부
  created_at timestamptz DEFAULT now()
);
```

**chatbot_choices_log** — 선택지 클릭 학습
```sql
CREATE TABLE chatbot_choices_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kakao_user_key text,
  bot_type text NOT NULL CHECK (bot_type IN ('creator', 'business')),
  original_question text NOT NULL,
  choices jsonb NOT NULL,              -- [{label, value}]
  selected_choice text,
  session_id text,
  created_at timestamptz DEFAULT now()
);
```

**chatbot_feedback** — 만족도 평가
```sql
CREATE TABLE chatbot_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES chatbot_conversations(id),
  kakao_user_key text,
  bot_type text NOT NULL CHECK (bot_type IN ('creator', 'business')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);
```

**chatbot_prompts** — AI 프롬프트 버전 관리
```sql
CREATE TABLE chatbot_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_type text NOT NULL CHECK (bot_type IN ('creator', 'business')),
  system_prompt text NOT NULL,
  tone_config jsonb DEFAULT '{}'::jsonb,    -- {tone, emoji_level, formality}
  guardrails jsonb DEFAULT '[]'::jsonb,     -- 인라인 가드레일
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**chatbot_learning_queue** — 학습 대기열
```sql
CREATE TABLE chatbot_learning_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type text NOT NULL CHECK (source_type IN ('choice', 'staff_answer', 'conversation', 'manual')),
  source_id uuid,                      -- 원본 레코드 ID
  source_data jsonb NOT NULL,          -- {question, answer, context}
  bot_type text NOT NULL CHECK (bot_type IN ('creator', 'business')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  result jsonb,                        -- 처리 결과
  created_at timestamptz DEFAULT now()
);
```

### 1-2. 보안/관리 테이블 (4개)

**chatbot_guardrails** — 기준틀 규칙
```sql
CREATE TABLE chatbot_guardrails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_type text NOT NULL CHECK (bot_type IN ('creator', 'business')),
  rule_type text NOT NULL CHECK (rule_type IN ('allowed_topic', 'blocked_topic', 'escalation_trigger', 'tone_rule', 'response_limit')),
  rule_value text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  version integer DEFAULT 1,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**chatbot_guardrails_history** — 기준틀 변경 이력
```sql
CREATE TABLE chatbot_guardrails_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guardrail_id uuid REFERENCES chatbot_guardrails(id) ON DELETE SET NULL,
  previous_value jsonb NOT NULL,
  new_value jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now()
);
```

**chatbot_audit_logs** — 감사 로그
```sql
CREATE TABLE chatbot_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid,
  admin_email text,
  action text NOT NULL,                -- 'create', 'update', 'delete'
  target_table text NOT NULL,          -- 'chatbot_faq', 'chatbot_prompts' 등
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,   -- 변경 내용 상세
  created_at timestamptz DEFAULT now()
);
```

**chatbot_blocked_patterns** — 프롬프트 인젝션 차단
```sql
CREATE TABLE chatbot_blocked_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern text NOT NULL,
  pattern_type text DEFAULT 'keyword' CHECK (pattern_type IN ('keyword', 'regex')),
  bot_type text CHECK (bot_type IN ('creator', 'business')),  -- NULL이면 전체 적용
  reason text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### 1-3. 인덱스 & RLS

```sql
-- 인덱스
CREATE INDEX idx_chatbot_faq_bot_type ON chatbot_faq(bot_type) WHERE is_active = true;
CREATE INDEX idx_chatbot_faq_category ON chatbot_faq(bot_type, category) WHERE is_active = true;
CREATE INDEX idx_chatbot_conversations_user ON chatbot_conversations(kakao_user_key, bot_type);
CREATE INDEX idx_chatbot_conversations_session ON chatbot_conversations(session_id);
CREATE INDEX idx_chatbot_conversations_created ON chatbot_conversations(created_at);
CREATE INDEX idx_chatbot_unanswered_status ON chatbot_unanswered(status, bot_type);
CREATE INDEX idx_chatbot_learning_queue_status ON chatbot_learning_queue(status, bot_type);
CREATE INDEX idx_chatbot_audit_logs_created ON chatbot_audit_logs(created_at);
CREATE INDEX idx_chatbot_guardrails_type ON chatbot_guardrails(bot_type, rule_type) WHERE is_active = true;
CREATE INDEX idx_chatbot_blocked_patterns_active ON chatbot_blocked_patterns(bot_type) WHERE is_active = true;

-- RLS (Service Role만 접근)
ALTER TABLE chatbot_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_unanswered ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_choices_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_learning_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_guardrails_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_blocked_patterns ENABLE ROW LEVEL SECURITY;
```

---

## Phase 2: Netlify Functions (챗봇 데이터 관리 API)

### 생성할 함수 목록

| 파일 | 용도 | HTTP |
|------|------|------|
| `netlify/functions/chatbot-manage-faq.js` | FAQ CRUD (목록/생성/수정/삭제/토글) | POST |
| `netlify/functions/chatbot-manage-guardrails.js` | 기준틀 CRUD + 변경 이력 자동 기록 | POST |
| `netlify/functions/chatbot-manage-prompts.js` | 프롬프트 CRUD + 버전 관리 | POST |
| `netlify/functions/chatbot-manage-blocked-patterns.js` | 차단 패턴 CRUD | POST |
| `netlify/functions/chatbot-process-escalation.js` | 스킬 서버→에스컬레이션 처리 (미답변 저장 + 네이버웍스 발송) | POST |
| `netlify/functions/chatbot-answer-escalation.js` | 담당자 답변 저장 + 카카오 콜백 전송 + 학습큐 추가 | POST |
| `netlify/functions/chatbot-stats.js` | 대시보드 통계 (대화수, 응답률, 만족도, 에스컬레이션 비율) | GET |
| `netlify/functions/chatbot-test-prompt.js` | 프롬프트 테스트 (Gemini API 호출 + 샘플 응답 생성) | POST |
| `netlify/functions/chatbot-bulk-upload-faq.js` | FAQ CSV/JSON 일괄 업로드 | POST |
| `netlify/functions/chatbot-conversation-logs.js` | 대화 로그 검색/조회 | POST |
| `netlify/functions/chatbot-learning-review.js` | 학습 큐 조회 + 승인/거부 처리 | POST |
| `netlify/functions/chatbot-audit-logs.js` | 감사 로그 조회 | POST |

### 스케줄 함수

| 파일 | 용도 | 스케줄 |
|------|------|--------|
| `netlify/functions/scheduled-chatbot-cleanup.js` | 90일 이상 대화 이력 삭제 | 매일 03:00 |
| `netlify/functions/scheduled-chatbot-daily-report.js` | 일일 챗봇 통계 → 네이버웍스 리포트 | 매일 09:00 |

### 함수 구조 패턴 (기존 cnecbiz 컨벤션)

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  try {
    const { action, ...params } = JSON.parse(event.body)

    // action 별 분기: 'list', 'create', 'update', 'delete', 'toggle'
    let result
    switch (action) {
      case 'list': result = await listItems(params); break
      case 'create': result = await createItem(params); break
      // ...
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: result })
    }
  } catch (error) {
    console.error('[chatbot-manage-faq] Error:', error)

    // 에러 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'chatbot-manage-faq',
          errorMessage: error.message,
          context: {}
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
```

---

## Phase 3: 관리자 UI (4개 페이지)

### 3-1. AdminNavigation.jsx 수정

`src/components/admin/AdminNavigation.jsx`에 새 메뉴 그룹 추가 (openclo와 settings 사이):

```javascript
{
  id: 'chatbot',
  type: 'group',
  icon: MessageSquareBot,  // lucide-react
  label: 'AI 챗봇',
  items: [
    { path: '/admin/chatbot/dashboard', icon: BarChart3, label: '대시보드' },
    { path: '/admin/chatbot/faq', icon: HelpCircle, label: 'FAQ 관리' },
    { path: '/admin/chatbot/guardrails', icon: Shield, label: '기준틀 관리' },
    { path: '/admin/chatbot/prompts', icon: FileCode, label: '프롬프트 관리' },
  ]
}
```

### 3-2. App.jsx 라우팅 추가

```javascript
import ChatbotDashboard from './components/admin/chatbot/ChatbotDashboard'
import ChatbotFaqManagement from './components/admin/chatbot/ChatbotFaqManagement'
import ChatbotGuardrails from './components/admin/chatbot/ChatbotGuardrails'
import ChatbotPromptManagement from './components/admin/chatbot/ChatbotPromptManagement'

// Routes 내부
<Route path="/admin/chatbot/dashboard" element={<ChatbotDashboard />} />
<Route path="/admin/chatbot/faq" element={<ChatbotFaqManagement />} />
<Route path="/admin/chatbot/guardrails" element={<ChatbotGuardrails />} />
<Route path="/admin/chatbot/prompts" element={<ChatbotPromptManagement />} />
```

### 3-3. 페이지별 상세 설계

#### 페이지 1: ChatbotDashboard (`src/components/admin/chatbot/ChatbotDashboard.jsx`)
- **통계 카드 4개**: 오늘 대화수, 응답률(%), 평균 만족도, 미답변 건수
- **차트**: 일별 대화 추이 (recharts Line), 봇 유형별 비율 (Pie)
- **미답변 큐 테이블**: status별 필터, 직접 답변 입력, 카카오 콜백 전송 버튼
- **학습 승인 목록**: AI 제안 FAQ 목록, 승인/수정/거부 액션
- **대화 로그 검색**: 키워드/날짜/봇유형 필터, 대화 내용 모달 뷰

#### 페이지 2: ChatbotFaqManagement (`src/components/admin/chatbot/ChatbotFaqManagement.jsx`)
- **탭**: 크리에이터 | 기업 (bot_type 전환)
- **카테고리 필터 + 검색**
- **FAQ 테이블**: 질문, 카테고리, 키워드, 활성/비활성 토글, 수정/삭제
- **FAQ 추가/수정 모달**: TipTap 에디터로 답변 작성, 키워드 태그 입력
- **일괄 업로드**: CSV 파일 드래그앤드롭 업로드
- **내보내기**: CSV 다운로드

#### 페이지 3: ChatbotGuardrails (`src/components/admin/chatbot/ChatbotGuardrails.jsx`)
- **탭**: 크리에이터 | 기업
- **규칙 유형별 섹션**: 허용 주제, 금지 주제, 에스컬레이션 트리거, 톤 규칙, 응답 제한
- **규칙 추가/수정/삭제/토글**
- **차단 패턴 관리**: 키워드/정규식 패턴 CRUD
- **변경 이력**: 모든 변경 기록 테이블 + 롤백 버튼
- **감사 로그**: 관리 행위 전체 조회

#### 페이지 4: ChatbotPromptManagement (`src/components/admin/chatbot/ChatbotPromptManagement.jsx`)
- **탭**: 크리에이터 | 기업
- **시스템 프롬프트 에디터**: 코드 에디터 (textarea + syntax highlight)
- **변수 삽입**: `{bot_type}`, `{faq_data}`, `{guardrails}` 등 변수 목록 사이드바
- **톤 설정**: formality, emoji_level 슬라이더
- **테스트**: 샘플 질문 입력 → Gemini API 호출 → 응답 미리보기
- **버전 관리**: 이전 버전 목록, 비교 뷰, 롤백
- **활성 프롬프트 전환**: 버전별 활성/비활성 토글

### 3-4. UI 디자인 규칙 (기존 디자인 시스템 준수)

- 배경: `#F8F9FA`, 카드: `#FFFFFF`, Border: `#DFE6E9`
- Primary: `#6C5CE7`, 통계 아이콘: `#F0EDFF` bg + `#6C5CE7`
- 태그: border 없이 배경색만
- 폰트: Pretendard(한글), Outfit(영문/숫자)
- border-radius: 카드 16px, 버튼 12px, 태그 6px

---

## Phase 4: GCP 스킬 서버 (FastAPI/Python)

### 디렉토리 구조

```
cnecbiz/
└── kakao-chatbot-server/
    ├── main.py                  # FastAPI 앱 진입점
    ├── requirements.txt         # 의존성
    ├── Dockerfile               # 컨테이너 배포용
    ├── .env.example             # 환경변수 템플릿
    ├── config/
    │   └── settings.py          # 설정 관리
    ├── routers/
    │   ├── kakao_skill.py       # 카카오 스킬 엔드포인트 (/api/kakao/skill)
    │   └── health.py            # 헬스체크
    ├── services/
    │   ├── gemini_service.py    # Gemini 2.0 Flash API 호출
    │   ├── faq_service.py       # FAQ 매칭 로직 (키워드 + 의미 검색)
    │   ├── conversation_service.py  # 대화 이력 관리
    │   ├── escalation_service.py    # 에스컬레이션 (→ cnecbiz Netlify Function)
    │   └── callback_service.py      # 카카오 콜백 API 비동기 응답
    ├── middleware/
    │   ├── rate_limiter.py      # IP 기반 Rate Limit (분당 60회)
    │   ├── input_sanitizer.py   # 입력 필터링 + 프롬프트 인젝션 차단
    │   └── kakao_signature.py   # 카카오 X-KakaoI-Signature 검증
    ├── models/
    │   ├── kakao_models.py      # 카카오 요청/응답 Pydantic 모델
    │   └── db_models.py         # Supabase 데이터 모델
    └── utils/
        ├── supabase_client.py   # Supabase 클라이언트 (BIZ DB)
        └── prompt_builder.py    # 시스템 프롬프트 동적 조립
```

### 핵심 플로우 (kakao_skill.py)

```
POST /api/kakao/skill
  1. 카카오 시그니처 검증
  2. 입력 필터링 (sanitizer + blocked_patterns DB 조회)
  3. Rate Limit 체크
  4. 사용자 세션/대화 이력 로드 (Supabase)
  5. FAQ DB 매칭 시도 (키워드 매칭 → 확신도 계산)
  6. 확신도 기반 분기:
     - 90%+ → FAQ 답변 즉시 반환
     - 50~89% → 선택지 카드 반환 + choices_log 저장
     - 50% 미만 → Gemini 2.0 Flash 호출
       - 기준틀 내 응답 가능 → AI 답변 반환
       - 기준틀 외 → 에스컬레이션 (cnecbiz에 POST)
  7. 대화 이력 저장 (Supabase)
  8. 5초 초과 시 → 콜백 API로 비동기 응답
```

### 카카오 응답 포맷

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "AI 응답 텍스트"
        }
      }
    ],
    "quickReplies": [
      {
        "label": "다른 질문하기",
        "action": "message",
        "messageText": "다른 질문하기"
      },
      {
        "label": "상담원 연결",
        "action": "message",
        "messageText": "상담원 연결"
      }
    ]
  }
}
```

### 환경변수 (.env.example)

```bash
# Supabase (BIZ DB)
SUPABASE_BIZ_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini
GEMINI_API_KEY=

# 카카오 오픈빌더
KAKAO_SKILL_SECRET=          # 스킬 시그니처 검증용

# cnecbiz 에스컬레이션 엔드포인트
CNECBIZ_BASE_URL=https://cnecbiz.com

# 서버 설정
HOST=0.0.0.0
PORT=8000
RATE_LIMIT_PER_MINUTE=60
```

---

## Phase 5: 카카오 i 오픈빌더 설정 (외부 플랫폼)

이 단계는 코드가 아닌 카카오 플랫폼 설정입니다:

1. **카카오톡 비즈니스 채널 2개 개설**
   - `@크넥 크리에이터` (크리에이터용)
   - `@크넥 비즈니스` (기업용)

2. **카카오 i 오픈빌더 챗봇 생성**
   - 각 채널에 챗봇 연결
   - AI 챗봇으로 전환 신청 (콜백 API 사용 위해)

3. **스킬 서버 등록**
   - URL: `https://{GCP_VM_IP}/api/kakao/skill`
   - 타임아웃: 5초 (콜백 활용)

4. **폴백 블록 설정**
   - 모든 발화 → 스킬 서버로 전달
   - 웰컴 블록: 개인정보 처리 안내 + 동의

---

## Phase 6: 통합 테스트 & 튜닝

1. **카카오 ↔ 스킬 서버** 연동 테스트
2. **FAQ 매칭 정확도** 테스트 (확신도 임계값 조정)
3. **Gemini 프롬프트 튜닝** (말투, 톤, 기준틀 검증)
4. **에스컬레이션 ↔ 네이버웍스** E2E 테스트
5. **프롬프트 인젝션 방어** 테스트
6. **부하 테스트** (Rate Limit, 동시 요청)
7. **관리자 UI QA** (FAQ CRUD, 프롬프트 테스트, 대시보드)

---

## 실행 순서 & 의존성

```
Phase 1 (DB)
  ↓
Phase 2 (Netlify Functions) ← Phase 1 필요
  ↓
Phase 3 (Admin UI) ← Phase 2 필요
  ↓
Phase 4 (GCP Skill Server) ← Phase 1 필요 (Phase 2, 3과 병렬 가능)
  ↓
Phase 5 (카카오 설정) ← Phase 4 필요
  ↓
Phase 6 (통합 테스트) ← 전체 완료 후
```

---

## 파일 생성/수정 목록 (cnecbiz 내)

### 신규 생성 (24개)
```
src/components/admin/chatbot/ChatbotDashboard.jsx
src/components/admin/chatbot/ChatbotFaqManagement.jsx
src/components/admin/chatbot/ChatbotGuardrails.jsx
src/components/admin/chatbot/ChatbotPromptManagement.jsx
netlify/functions/chatbot-manage-faq.js
netlify/functions/chatbot-manage-guardrails.js
netlify/functions/chatbot-manage-prompts.js
netlify/functions/chatbot-manage-blocked-patterns.js
netlify/functions/chatbot-process-escalation.js
netlify/functions/chatbot-answer-escalation.js
netlify/functions/chatbot-stats.js
netlify/functions/chatbot-test-prompt.js
netlify/functions/chatbot-bulk-upload-faq.js
netlify/functions/chatbot-conversation-logs.js
netlify/functions/chatbot-learning-review.js
netlify/functions/chatbot-audit-logs.js
netlify/functions/scheduled-chatbot-cleanup.js
netlify/functions/scheduled-chatbot-daily-report.js
kakao-chatbot-server/main.py
kakao-chatbot-server/requirements.txt
kakao-chatbot-server/Dockerfile
kakao-chatbot-server/.env.example
kakao-chatbot-server/routers/kakao_skill.py
(+ 나머지 kakao-chatbot-server 파일들)
```

### 기존 수정 (3개)
```
src/components/admin/AdminNavigation.jsx  → AI 챗봇 메뉴 그룹 추가
src/App.jsx                               → 4개 라우트 + import 추가
netlify.toml                              → 스케줄 함수 + 타임아웃 설정 추가
```
