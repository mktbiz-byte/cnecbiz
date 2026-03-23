# CLAUDE.md - cnecbiz 프로젝트 컨텍스트

## 프로젝트 개요

**cnecbiz**는 크리에이터 마케팅 플랫폼의 기업/관리자용 웹 애플리케이션입니다.
기업이 크리에이터와 캠페인을 관리하고, 포인트/결제 시스템을 운영하며, 계약서를 발송하는 등의 기능을 제공합니다.

- **도메인**: https://cnecbiz.com
- **서비스명**: 크넥 (CNEC)
- **운영사**: 주식회사 하우파파 (HOWPAPA Inc.)

---

## 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.x | UI 프레임워크 |
| Vite | 6.x | 빌드 도구 |
| react-router-dom | 7.x | 라우팅 |
| Tailwind CSS | 4.x | 스타일링 |
| shadcn/ui (Radix UI) | - | UI 컴포넌트 |
| lucide-react | - | 아이콘 |
| recharts | - | 차트 |
| TipTap | 3.x | Rich Text Editor |
| framer-motion | - | 애니메이션 |

### Backend
- **Serverless Functions**: Netlify Functions
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage

### 외부 서비스
| 서비스 | 용도 |
|--------|------|
| Stripe | 해외 결제 |
| Toss Payments | 국내 결제 |
| Popbill | 세금계산서/현금영수증 |
| Nodemailer (Gmail) | 이메일 발송 |
| LINE Bot SDK | 라인 메시지 |
| Naver Works | 네이버 웍스 메시지 |
| OpenAI / Gemini | AI 기능 |
| Stibee | 뉴스레터 |

---

## 삭제된 파일 (Phase 0에서 정리 완료)

2026-03-20 코드베이스 정리로 아래 파일들이 삭제되었습니다:
- src/ 내 .backup, .old, _OLD 파일 29개
- test-*, check-*, debug-* 함수 28개
- 루트 SQL/MD 잡파일 → database/, docs/ 폴더로 이동

새로운 백업 파일을 만들지 마세요. git으로 버전 관리하세요.

---

## 프로젝트 구조

```
cnecbiz/
├── src/
│   ├── App.jsx                    # 메인 앱 + 모든 라우팅 정의
│   ├── main.jsx                   # 앱 진입점
│   ├── components/
│   │   ├── ui/                    # shadcn/ui 컴포넌트 (Button, Card, Dialog 등)
│   │   ├── admin/                 # /admin/* 관리자 페이지 컴포넌트
│   │   ├── company/               # /company/* 기업 대시보드 컴포넌트
│   │   ├── creator/               # /creator/* 크리에이터 관련 컴포넌트
│   │   ├── payment/               # 결제 관련 컴포넌트
│   │   ├── tax/                   # 세금 관련 컴포넌트
│   │   └── ...                    # 기타 공통 컴포넌트
│   ├── pages/                     # 독립 페이지 컴포넌트
│   ├── lib/                       # 유틸리티 & 서비스
│   │   ├── supabaseClients.js     # 멀티-리전 Supabase 클라이언트 ★중요
│   │   └── ...
│   ├── templates/                 # 계약서/이메일 HTML 템플릿
│   │   ├── CompanyContractTemplate.jsx   # 기업용 계약서 템플릿
│   │   └── CreatorConsentTemplate.jsx    # 크리에이터 동의서 템플릿
│   └── contexts/                  # React Context
├── netlify/
│   └── functions/                 # Netlify 서버리스 함수 (130+개)
├── public/                        # 정적 파일
└── database/                      # SQL 마이그레이션 파일
```

---

## 데이터베이스 (Supabase)

### 멀티-리전 구조
| Client | 용도 | Import |
|--------|------|--------|
| `supabaseBiz` | **중앙 비즈니스 DB (주 사용)** | `import { supabaseBiz } from '@/lib/supabaseClients'` |
| `supabaseKorea` | 한국 리전 | `import { supabaseKorea } from '@/lib/supabaseClients'` |
| `supabaseJapan` | 일본 리전 | `import { supabaseJapan } from '@/lib/supabaseClients'` |
| `supabaseUS` | 미국 리전 | `import { supabaseUS } from '@/lib/supabaseClients'` |
| `supabaseTaiwan` | 대만 리전 | `import { supabaseTaiwan } from '@/lib/supabaseClients'` |

### 주요 테이블 (supabaseBiz)

#### 핵심 테이블
| 테이블 | 용도 |
|--------|------|
| `campaigns` | 캠페인 정보 |
| `applications` | 캠페인 신청 |
| `companies` | 기업 정보 |
| `creators` | 크리에이터 정보 |
| `admin_users` | 관리자 계정 |
| `featured_creators` | 추천 크리에이터 (threads_username, x_username, threads_followers, x_followers 포함) |

#### 계약서 시스템
| 테이블 | 용도 |
|--------|------|
| `contracts` | 계약서 (status: pending/sent/signed/expired) |
| `contract_signature_logs` | 서명 로그 |

#### 포인트/결제 시스템
| 테이블 | 용도 |
|--------|------|
| `points` | 포인트 내역 |
| `payments` | 결제 내역 |

#### 콘텐츠 제출/성과 시스템 (2026년 3월 추가)
| 테이블 | 용도 |
|--------|------|
| `text_submissions` | 스레드/X 포스트 텍스트 제출물 |
| `story_submissions` | 스토리 숏폼 콘텐츠 제출물 |
| `campaign_post_metrics` | 콘텐츠 성과 지표 (views, likes, replies, reposts, impressions 등) |

#### 상담/스프레드시트 시스템 (2026년 3월 추가)
| 테이블 | 용도 |
|--------|------|
| `consultation_spreadsheets` | 상담 스프레드시트 컨테이너 |
| `consultation_spreadsheet_rows` | 스프레드시트 개별 행 데이터 |

#### 출금/결재 시스템 ★ 중요
| 테이블 | DB | 용도 |
|--------|-----|------|
| `withdrawals` | **Korea DB** | 한국 크리에이터 출금 신청 (실 데이터) |
| `withdrawal_requests` | **Japan DB** | 일본 크리에이터 출금 신청 |
| `creator_withdrawal_requests` | BIZ DB | BIZ DB 직접 출금 (현재 비어있음, 한국 데이터 없음) |
| `withdrawal_entity_map` | BIZ DB | 입금처(하우랩/하우파파) 분류 매핑 + 결재 상태 |
| `withdrawal_audit_logs` | BIZ DB | 출금 관련 감사 로그 |

**⚠️ 한국 출금 데이터 흐름 (반드시 숙지)**
- 한국 출금 데이터는 **Korea DB `withdrawals`** 테이블에 저장됨
- 입금처 분류(하우랩/하우파파)는 **BIZ DB `withdrawal_entity_map`**에 저장
- 결재 상신 시: Korea DB `withdrawals` + BIZ DB `withdrawal_entity_map` 조인 조회
- `creator_withdrawal_requests`는 한국 데이터가 **없음** → 이 테이블로 한국 출금 조회 금지

**Korea DB `withdrawals` 컬럼 매핑:**
| Korea DB 컬럼 | 일반 사용명 |
|--------------|------------|
| `amount` | `requested_amount` |
| `bank_account_number` | `account_number` |
| `bank_account_holder` | `account_holder` / `creator_name` |
| `resident_number_encrypted` | `resident_registration_number` |

**`withdrawal_entity_map` 주요 컬럼:**
| 컬럼 | 용도 |
|------|------|
| `withdrawal_id` | Korea DB withdrawals.id 참조 |
| `source_db` | 'korea' 등 |
| `paying_entity` | 'howlab' / 'howpapa' |
| `approval_status` | 'NONE' / 'PENDING' / 'APPROVED' |
| `approval_doc_id` | 네이버웍스 결재 문서 ID |

#### 이메일/뉴스레터
| 테이블 | 용도 |
|--------|------|
| `email_templates` | 이메일 템플릿 |
| `newsletters` | 뉴스레터 |

### email_templates 테이블 상세
```sql
-- 주의: 컬럼명 정확히 확인 필요
id             uuid
template_type  text     -- CHECK: 'company' (유효값)
template_key   text     -- 예: 'contract_sign_request'
template_name  text     -- 표시 이름
subject        text     -- 이메일 제목
body           text     -- HTML 본문 (★ html_content 아님!)
variables      jsonb    -- 변수 목록
is_active      boolean
```

---

## 라우팅 매핑 (App.jsx)

### 공개 페이지
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | LandingPage | 랜딩 페이지 |
| `/login` | LoginPageNew | 로그인 |
| `/signup` | SignupWithVerification | 회원가입 |
| `/newsletters` | NewsletterShowcase | 뉴스레터 목록 |
| `/newsletter/:id` | NewsletterDetail | 뉴스레터 상세 |
| `/sign-contract/:contractId` | SignContract | 계약서 서명 |
| `/guidebook` | Guidebook | 가이드북 |

### 기업 대시보드 (/company/*)
| 경로 | 컴포넌트 |
|------|----------|
| `/company/dashboard` | CompanyDashboard |
| `/company/campaigns` | MyCampaigns |
| `/company/campaigns/:id` | CampaignDetail |
| `/company/contracts` | ContractManagement |
| `/company/payments` | PaymentHistory |
| `/company/profile-edit` | CompanyProfileEdit |

### 관리자 (/admin/*)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/admin/login` | AdminLogin | 관리자 로그인 |
| `/admin/dashboard` | AdminDashboard | 관리자 대시보드 |
| `/admin/campaigns` | CampaignsManagement | 캠페인 관리 |
| `/admin/contracts` | AdminContractManagement | 계약서 관리 |
| `/admin/point-history` | CreatorPointHistory | 포인트 내역 |
| `/admin/withdrawals` | WithdrawalManagement | 출금 관리 |
| `/admin/newsletters` | NewsletterShowcaseManagement | 뉴스레터 관리 |
| `/admin/revenue-charts` | RevenueManagementNew | 수익 관리 (현재 사용) |

### 크리에이터 (/creator/*)
| 경로 | 컴포넌트 |
|------|----------|
| `/creator/mypage` | CreatorMyPage |
| `/creator/withdrawal` | WithdrawalRequest |
| `/creator/apply` | CreatorProfileApplication |

---

## Netlify Functions 분류

### 인증/회원
```
complete-signup.js        # 회원가입 완료
find-email.js             # 이메일 찾기
find-email-by-phone.js    # 전화번호로 이메일 찾기
request-password-reset.js # 비밀번호 재설정 요청
reset-password.js         # 비밀번호 재설정
admin-reset-password.js   # 관리자 비밀번호 재설정
verify-sms-code.js        # SMS 인증 코드 확인
```

### 캠페인
```
approve-campaign.js       # 캠페인 승인
update-campaign-status.js # 캠페인 상태 업데이트
update-campaign-details.js # 캠페인 상세 수정 (리전 DB service role key 사용)
```

### 결제/포인트
```
confirm-payment.js        # 결제 확인
confirm-toss-payment.js   # 토스 결제 확인
confirm-campaign-payment.js # 캠페인 입금 확인 (관리자 수동, 자동 승인+활성화, 알림톡+이메일 발송) ★
create-charge-request.js  # 충전 요청 생성
confirm-charge-complete.js # 충전 완료 확인
precharge-points.js       # 포인트 선충전
award-bonus-points.js     # 보너스 포인트 지급
```

### 알림/에러
```
send-naver-works-message.js  # 네이버웍스 메시지 전송
send-kakao-notification.js   # 카카오 알림톡 발송
send-error-alert.js          # 에러 발생 시 네이버웍스 에러 채널 자동 알림 ★
notify-creator-application.js # 크리에이터 캠페인 지원 알림
```

### 이메일 발송
```
send-email.js             # 기본 이메일 발송
send-template-email.js    # 템플릿 이메일 발송 ★
send-campaign-invitation.js # 캠페인 초대 이메일
send-creator-invitation.js  # 크리에이터 초대 이메일
send-notification-helper.js # 알림 헬퍼
send-notifications.js     # 알림 발송
send-outreach-email.js    # 아웃리치 이메일
```

### 계약서
```
create-contract.js        # 계약서 생성
sign-contract.js          # 계약서 서명 ★
```

### 뉴스레터
```
fetch-stibee-newsletters.js    # Stibee 뉴스레터 가져오기
extract-newsletter-thumbnail.js # 썸네일 추출
newsletter-sitemap.js          # 사이트맵 생성
subscribe-newsletter.js        # 뉴스레터 구독
```

### 세금계산서 (Popbill)
```
issue-tax-invoice.js      # 세금계산서 발행
issue-tax-invoice-cancel.js # 세금계산서 취소
popbill-issue-cashbill.js # 현금영수증 발행
popbill-issue-taxinvoice.js # 세금계산서 발행 (다른 버전)
popbill-webhook.js        # Popbill 웹훅
get-tax-invoice-requests.js # 세금계산서 요청 조회
```

### 콘텐츠 제출/성과 (2026년 3월 추가)
```
get-text-submissions.js       # 스레드/X 텍스트 제출물 조회
review-text-submission.js     # 텍스트 제출물 승인/반려
get-story-submissions.js      # 스토리 제출물 조회
review-story-submission.js    # 스토리 제출물 승인/반려
save-post-metrics.js          # 콘텐츠 성과 지표 저장 (UPSERT)
get-post-metrics.js           # 콘텐츠 성과 지표 조회
```

### 상담/유틸리티 (2026년 3월 추가)
```
manage-consultation-spreadsheet.js # 상담 스프레드시트 CRUD
generate-utm-link.js              # UTM 추적 링크 생성
```

### 예약 작업 (Scheduled)
```
scheduled-daily-report.js           # 일일 리포트
scheduled-campaign-deadline-notification.js # 캠페인 마감 알림
scheduled-video-deadline-notification.js    # 영상 마감 알림
scheduled-collect-transactions.js   # 거래 수집
scheduled-creator-monitoring.js     # 크리에이터 모니터링
scheduled-weekly-withdrawal-report.js # 주간 출금 리포트
scheduled-daily-withdrawal-approval.js # 출금 자동 결재 (월~금 10am KST)
scheduled-unmatched-deposits-alert.js  # 미매칭 입금 알림 (매일 4pm KST)
scheduled-chatbot-cleanup.js        # 챗봇 데이터 정리 (매일 3am UTC)
```

---

## 코딩 컨벤션

### Import 순서
```javascript
// 1. React & hooks
import { useState, useEffect } from 'react'

// 2. React Router
import { useNavigate, useParams } from 'react-router-dom'

// 3. UI 컴포넌트 (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 4. 아이콘
import { Plus, Edit, Trash, Loader2 } from 'lucide-react'

// 5. 로컬 imports
import { supabaseBiz } from '../../lib/supabaseClients'
```

### 컴포넌트 구조
```javascript
export default function ComponentName() {
  // 1. Hooks
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // 2. useEffect
  useEffect(() => {
    fetchData()
  }, [])

  // 3. 핸들러 함수
  const handleSubmit = async () => {
    try {
      setLoading(true)
      // ...
    } catch (error) {
      console.error('오류:', error)
      alert(`실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 4. 로딩 UI
  if (loading) {
    return <Loader2 className="animate-spin" />
  }

  // 5. 메인 렌더링
  return (
    <div>...</div>
  )
}
```

### API 호출 패턴

#### Supabase 직접 호출
```javascript
const { data, error } = await supabaseBiz
  .from('table_name')
  .select('*')
  .eq('column', value)
  .single()

if (error) throw error
```

#### Netlify Function 호출
```javascript
const response = await fetch('/.netlify/functions/function-name', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: value })
})

const result = await response.json()
if (!result.success) {
  throw new Error(result.error)
}
```

### Netlify Function 구조
```javascript
// ✅ 공유 모듈 사용 (권장)
const { getBizClient, getKoreaClient } = require('./lib/supabase');
const { CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const { param1, param2 } = JSON.parse(event.body)
    const supabase = getBizClient();

    // 비즈니스 로직

    return successResponse({ success: true, data: result })
  } catch (error) {
    console.error('[function-name] Error:', error)

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'function-name',
          errorMessage: error.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return errorResponse(500, error.message)
  }
}
```

---

## 자주 사용하는 패턴

### 날짜 포맷
```javascript
new Date().toLocaleDateString('ko-KR')  // 2024. 1. 15.
new Date().toISOString()                 // DB 저장용
```

### 로딩 상태
```javascript
import { Loader2 } from 'lucide-react'

{loading && <Loader2 className="w-4 h-4 animate-spin" />}
```

### 확인 다이얼로그
```javascript
if (!confirm('정말 삭제하시겠습니까?')) return
```

### 관리자 인증 체크
```javascript
const checkAuth = async () => {
  const { data: { user } } = await supabaseBiz.auth.getUser()
  if (!user) {
    navigate('/admin/login')
    return
  }
  // admin_users 테이블에서 확인
}

useEffect(() => {
  checkAuth()
}, [])
```

---

## 주의사항

### 1. Supabase 클라이언트 선택
- **대부분의 경우 `supabaseBiz` 사용**
- 멀티-리전 데이터 필요 시 `getSupabaseClient(region)` 사용

### 2. 이메일 템플릿 테이블
- `template_type`: `'company'`만 유효 (CHECK constraint)
- HTML 컬럼: `body` (html_content 아님!)

### 3. 계약서 시스템
- 상태 흐름: `pending` → `sent` → `signed` / `expired`
- 서명 페이지: `/sign-contract/:contractId`

### 4. Korea DB `user_profiles` 스키마 주의
- Korea DB `user_profiles`에는 **`user_id` 컬럼이 없음** (id = auth user id)
- `withdrawals.user_id` → `user_profiles.id`로 조회해야 함
- `.eq('user_id', ...)` 사용 시 400 Bad Request 발생
- Japan DB `user_profiles`에는 `user_id` 컬럼이 있어 혼동 주의

### 5. 올리브영 캠페인 광고코드 컬럼
- **통합 코드**: `step1_2_partnership_code` (step1~2 공유)
- **개별 코드**: `step1_partnership_code`, `step2_partnership_code` (step별 개별)
- 표시 시 fallback 체인: `step1_2_partnership_code || step1_partnership_code || partnership_code || ad_code`
- DB에 따라 통합/개별 중 하나만 저장되어 있을 수 있으므로 반드시 fallback 필요

### 6. 빌드 & 배포
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
# Netlify에 자동 배포 (Git push)
```

---

## 환경변수 (.env)

> ⚠️ **중요**: 환경변수 이름은 정확히 아래와 같이 사용해야 합니다. 오타 주의!

### Supabase 환경변수 (올바른 이름)

| 변수명 | 용도 | 사용처 |
|--------|------|--------|
| `VITE_SUPABASE_BIZ_URL` | BIZ DB URL | Frontend + Netlify Functions |
| `VITE_SUPABASE_BIZ_ANON_KEY` | BIZ DB Anon Key | Frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | BIZ DB Service Key | Netlify Functions 전용 |
| `VITE_SUPABASE_KOREA_URL` | Korea DB URL | Frontend + Netlify Functions |
| `VITE_SUPABASE_KOREA_ANON_KEY` | Korea DB Anon Key | Frontend |
| `SUPABASE_KOREA_SERVICE_ROLE_KEY` | Korea DB Service Key | Netlify Functions 전용 |
| `VITE_SUPABASE_JAPAN_URL` | Japan DB URL | Frontend |
| `VITE_SUPABASE_JAPAN_ANON_KEY` | Japan DB Anon Key | Frontend |
| `VITE_SUPABASE_US_URL` | US DB URL | Frontend |
| `VITE_SUPABASE_US_ANON_KEY` | US DB Anon Key | Frontend |
| `VITE_SUPABASE_TAIWAN_URL` | Taiwan DB URL | Frontend |
| `VITE_SUPABASE_TAIWAN_ANON_KEY` | Taiwan DB Anon Key | Frontend |

### ❌ 잘못된 환경변수 이름 (사용 금지)

```
# 아래 이름들은 잘못된 것입니다. 절대 사용하지 마세요!
VITE_SUPABASE_URL_BIZ      ❌ → VITE_SUPABASE_BIZ_URL ✅
SUPABASE_SERVICE_ROLE_KEY_BIZ ❌ → SUPABASE_SERVICE_ROLE_KEY ✅
SUPABASE_URL               ❌ → VITE_SUPABASE_BIZ_URL ✅
SUPABASE_ANON_KEY          ❌ → VITE_SUPABASE_BIZ_ANON_KEY ✅
```

### Netlify Functions에서 Supabase 사용 패턴

```javascript
// ✅ 올바른 사용법
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
)
```

### 네이버웍스 환경변수

| 변수명 | 용도 |
|--------|------|
| `NAVER_WORKS_CLIENT_ID` | 클라이언트 ID |
| `NAVER_WORKS_CLIENT_SECRET` | 클라이언트 시크릿 |
| `NAVER_WORKS_BOT_ID` | 봇 ID |
| `NAVER_WORKS_CHANNEL_ID` | 기본 채널 ID |
| `NAVER_WORKS_WITHDRAWAL_CHANNEL_ID` | 출금 알림 채널 ID (선택) |

### AI 서비스 환경변수

| 변수명 | 용도 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini API |
| `OPENAI_API_KEY` | OpenAI API |

### 결제 서비스 환경변수

| 변수명 | 용도 |
|--------|------|
| `STRIPE_SECRET_KEY` | Stripe 시크릿 키 |
| `TOSS_SECRET_KEY` | 토스페이먼츠 시크릿 키 |

### 이메일/SMS 환경변수

| 변수명 | 용도 |
|--------|------|
| `GMAIL_EMAIL` | Gmail 사용자 (⚠️ GMAIL_USER 아님!) |
| `GMAIL_APP_PASSWORD` | Gmail 앱 비밀번호 |

### 기타 환경변수

| 변수명 | 용도 |
|--------|------|
| `POPBILL_LINK_ID` | 팝빌 연동 ID |
| `POPBILL_SECRET_KEY` | 팝빌 시크릿 키 |
| `STIBEE_API_KEY` | 스티비 API 키 |
| `VITE_ENCRYPTION_KEY` | 암호화 키 |

---

## ⚠️ 필수 개발 규칙 (2026년 3월 업데이트)

> **모든 세션에서 반드시 지켜야 하는 규칙입니다. 위반 시 프로덕션 오류가 발생합니다.**

### 1. 네이버웍스 채널 라우팅 (3개 채널)

| 채널 ID | 용도 | 사용처 |
|---------|------|--------|
| `75c24874-e370-afd5-9da3-72918ba15a3c` | 결제/캠페인/크리에이터 알림 | confirm-toss-payment, confirm-payment, approve-campaign, notify-creator-application 등 |
| `b9387420-be2a-11ef-8fa1-4b920cfbb00a` | 상담신청/가입 알림 | complete-signup, 상담 관련 함수 |
| `54220a7e-0b14-1138-54ec-a55f62dc8b75` | 에러 알림 전용 | send-error-alert, send-naver-works-message (자체 에러) |

**규칙:**
- 네이버웍스 메시지 보낼 때 반드시 위 채널 ID 중 올바른 것을 사용
- `NAVER_WORKS_CHANNEL_ID` 환경변수는 기본 채널용. 특정 채널이 필요하면 channelId를 직접 지정

### 2. 에러 알림 시스템 (send-error-alert)

모든 Netlify Function의 catch 블록에서 에러 알림을 발송해야 합니다:

```javascript
} catch (error) {
  console.error('[function-name] Error:', error)

  // 에러 알림 발송 (반드시 추가!)
  try {
    const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
    await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        functionName: 'function-name',      // 함수명
        errorMessage: error.message,         // 에러 메시지
        context: { key: 'value' }            // 추가 정보 (선택)
      })
    })
  } catch (e) { console.error('Error alert failed:', e.message) }

  return {
    statusCode: 500,
    body: JSON.stringify({ success: false, error: error.message })
  }
}
```

**⚠️ 예외**: `send-naver-works-message.js`는 순환 호출 방지를 위해 내부 함수로 직접 에러 알림 처리

### 3. Netlify Function 서버사이드 URL

서버사이드(Netlify Functions)에서 다른 함수를 호출할 때:

```javascript
// ✅ 올바른 패턴 (서버사이드)
const baseUrl = process.env.URL || 'https://cnecbiz.com'
await fetch(`${baseUrl}/.netlify/functions/send-email`, { ... })

// ❌ 절대 사용 금지 (서버사이드에서 상대 경로 안 됨!)
await fetch('/.netlify/functions/send-email', { ... })

// ❌ 절대 사용 금지 (이전 도메인)
await fetch('https://cnectotal.netlify.app/...', { ... })
```

프론트엔드에서는 상대 경로 `/.netlify/functions/...` 사용 OK.

### 4. 카카오톡 알림 (Popbill) 파라미터

```javascript
// ✅ 올바른 파라미터명
receiverNum: '01012345678'    // ⚠️ 'receiver' 아님!

// plusFriendID 구분
plusFriendID: '@크넥'           // 기업 대상
plusFriendID: '@크넥_크리에이터'  // 크리에이터 대상
```

### 5. 기업 알림 연락처 우선순위

기업에게 알림 발송 시, companies 테이블의 notification 필드를 우선 사용:

```javascript
const phone = companyRecord?.notification_phone || companyRecord?.phone || companyProfile?.phone
const email = companyRecord?.notification_email || companyRecord?.email || companyProfile?.email
```

### 6. 멀티-리전 Supabase 데이터 조회

| 데이터 | 조회 DB |
|--------|---------|
| companies, contracts, payments, admin_users | **BIZ DB만** |
| campaigns, applications, user_profiles | **리전 DB (Korea/Japan/US) 순회 → BIZ DB 폴백** |
| campaign_invitations, featured_creators | **BIZ DB만** |

리전 DB 순회 패턴:
```javascript
const regionalClients = [
  { name: 'korea', client: supabaseKorea },
  { name: 'japan', client: supabaseJapan },
  { name: 'us', client: supabaseUS },
  { name: 'biz', client: supabase }
].filter(r => r.client)

for (const region of regionalClients) {
  const { data, error } = await region.client
    .from('applications').select('*').eq('id', id).single()
  if (data && !error) { /* found */ break }
}
```

### 7. 환경변수 주의사항 (추가)

```
GMAIL_USER         ❌ → GMAIL_EMAIL ✅
VITE_URL           ❌ → VITE_SITE_URL ✅ (프론트엔드)
                        process.env.URL ✅ (Netlify Functions 서버사이드)
cnectotal.netlify.app ❌ → cnecbiz.com ✅
```

---

## 디버깅 팁

### 일반적인 에러와 해결
| 에러 | 원인 | 해결 |
|------|------|------|
| `템플릿을 찾을 수 없습니다` | email_templates에 해당 template_key 없음 | SQL로 템플릿 INSERT |
| `계약서를 찾을 수 없습니다` | contracts 테이블에 해당 ID 없음 | ID 확인 |
| `CORS 에러` | Netlify Functions 응답 헤더 문제 | 헤더 추가 |
| `template_type_check violation` | 잘못된 template_type 값 | 'company' 사용 |

### Netlify Functions 로그
- Netlify 대시보드 > Functions > 해당 함수 > Logs

### Supabase 에러
- RLS (Row Level Security) 정책 확인
- Service Role Key 필요 여부 확인

---

## 디자인 시스템

> **필독**: UI/스타일 관련 작업 시 반드시 아래 문서를 먼저 참고하세요.

### 디자인 가이드 파일
| 파일 | 적용 영역 |
|------|----------|
| `docs/DESIGN-SYSTEM-LANDING.md` | 메인페이지 (비로그인, Dark 테마) |
| `docs/DESIGN-SYSTEM-ADMIN.md` | 관리자 대시보드 (로그인 후, Light 테마) |
| `docs/cnec-design-tokens.json` | 코드용 디자인 토큰 (import용) |

### 핵심 규칙 요약
1. **랜딩 페이지**: 다크 배경 `#0A0A0F`, 액센트 `#C084FC`, 텍스트 `#FFFFFF`/`#A0A0B0`
2. **관리자 페이지**: 라이트 배경 `#F8F9FA`, Primary `#6C5CE7`, Surface `#FFFFFF`
3. **색상 절제**: 한 화면에 유채색 3개 이상 금지. 상태 컬러(성공/경고/에러)는 상태 표시에만 사용
4. **통계 카드 아이콘**: 전부 `#F0EDFF` 배경 + `#6C5CE7` 단일 색상. 카드별 다른 색상 금지
5. **캠페인 금액**: `#6C5CE7` (빨간색 금지), 폰트 Outfit Bold
6. **태그**: border 없이 배경색만 사용
7. **폰트**: 한글 Pretendard, 영문/숫자 Outfit, 일본어 Noto Sans JP
8. **border-radius**: 카드 16px, 버튼 12px, 태그 6px, 풀라운드 9999px

### 디자인 수정 작업 시 체크리스트
- [ ] 해당 영역의 디자인 시스템 MD 파일을 먼저 읽었는가?
- [ ] 새로운 색상을 추가하지 않았는가? (토큰에 정의된 색상만 사용)
- [ ] 컴포넌트 스타일이 가이드와 일치하는가?
- [ ] Tailwind 클래스가 디자인 토큰 값과 일치하는가?

---

## 캠페인 타입 (campaign_type) 상세 (2026년 3월 업데이트)

| campaign_type | 이름 | 단가 | 최소 인원 | 채널 | 상태 |
|---------------|------|------|-----------|------|------|
| `planned` | 일반 캠페인 | 패키지별 | 1명 | 다중 선택 | 운영중 |
| `oliveyoung` | 올영세일 | ₩400,000 | 1명 | 올리브영 | 운영중 |
| `4week_challenge` | 4주 챌린지 | 패키지별 | 1명 | 인스타그램 | 운영중 |
| `story_short` | 스토리 숏폼 | ₩20,000 | 5명 | 인스타그램 | 운영중 |
| `threads_post` | 스레드 포스트 | ₩20,000 | 5명 | Threads | **오픈 (2026-03-23)** |
| `x_post` | X 포스트 | ₩20,000 | 5명 | X(트위터) | **오픈 (2026-03-23)** |

### 스레드/X 포스트 특징
- 텍스트 기반 콘텐츠 (3단계 퍼널: Hook → Value → Offer)
- 견적: `단가(₩20,000) × 인원 × 1.1(VAT)` → 5명 기준 ₩110,000
- 크리에이터 지급 포인트: ₩12,000 (60%)
- 제출물: 포스트 URL + 스크린샷
- 성과 지표: views, likes, replies, reposts, quotes, impressions, bookmarks
- `package_type`은 null로 저장 (CampaignDetail에서 패키지 기반 금액 계산 방지)

### 콘텐츠 제출/검수 컴포넌트 (2026년 3월 추가)

| 컴포넌트 | 위치 | 용도 |
|----------|------|------|
| `TextSubmissionReview.jsx` | admin/ | 스레드/X 텍스트 제출물 검수 |
| `StorySubmissionReview.jsx` | admin/ | 스토리 제출물 검수 (인터랙티브 스티커 등) |
| `PostMetricsForm.jsx` | admin/ | 성과 지표 입력 폼 |
| `PostMetricsSummary.jsx` | admin/ | 성과 지표 요약 표시 |
| `TextSubmissionReadonly.jsx` | company/ | 텍스트 제출물 읽기전용 (기업용) |
| `StorySubmissionReadonly.jsx` | company/ | 스토리 제출물 읽기전용 (기업용) |
| `PostMetricsReadonly.jsx` | company/ | 성과 지표 읽기전용 (기업용) |
| `TextContentGuideForm.jsx` | company/ | 스레드/X 가이드 작성 폼 |
| `StoryContentGuideForm.jsx` | company/ | 스토리 가이드 작성 폼 |
| `ReferenceUrlsInput.jsx` | company/ | 레퍼런스 URL 입력 |
| `CnecShopLinkGenerator.jsx` | company/ | CNEC Shop 어필리에이트 링크 생성 |
| `ConsultationSpreadsheet.jsx` | admin/ | 상담 스프레드시트 (멀티시트, 인라인 편집, 엑셀 내보내기) |

---

## 코드베이스 필수 규칙 (2026년 3월 업데이트)

### 1. Netlify Function에서 Supabase 클라이언트 생성 규칙

**반드시 공유 모듈을 사용할 것:**
```javascript
const { getBizClient, getKoreaClient, getJapanClient, getUSClient } = require('./lib/supabase');
const { CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');
```

절대 금지:
```javascript
// ❌ 각 함수에서 직접 createClient 하지 말 것
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_BIZ_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

### 2. 환경변수 표준명 (이것만 사용)

| DB | URL | KEY |
|----|-----|-----|
| BIZ | `VITE_SUPABASE_BIZ_URL` | `SUPABASE_SERVICE_ROLE_KEY` |
| Korea | `VITE_SUPABASE_KOREA_URL` | `SUPABASE_KOREA_SERVICE_ROLE_KEY` |
| Japan | `VITE_SUPABASE_JAPAN_URL` | `SUPABASE_JAPAN_SERVICE_ROLE_KEY` |
| US | `VITE_SUPABASE_US_URL` | `SUPABASE_US_SERVICE_ROLE_KEY` |
| Taiwan | `VITE_SUPABASE_TAIWAN_URL` | `SUPABASE_TAIWAN_SERVICE_ROLE_KEY` |

**절대 사용 금지 환경변수:**
- `SUPABASE_URL` (어느 DB인지 불명확)
- `SUPABASE_BIZ_URL` (VITE_ prefix 누락)
- `VITE_SUPABASE_URL_BIZ` (오타 — URL과 BIZ 순서 반대)
- `SUPABASE_JAPAN_URL` (VITE_ prefix 없는 별도 패턴)
- 모든 `*_ANON_KEY` (서버에서 anon key 사용 금지, SERVICE_ROLE_KEY만 사용)

### 3. 파일 네이밍 금지 패턴

새 파일을 만들 때 절대 아래 패턴 사용 금지:
- `*_backup.jsx`, `*_old.jsx`, `*_fixed.jsx`, `*_complete.jsx`
- `*Enhanced.jsx`, `*Improved.jsx`, `*New.jsx` (기존 것이 있으면 기존 파일을 직접 수정할 것)
- `*ExactReplica.jsx`, `*_no_infinite_loading.jsx`

기존 파일을 수정해야 할 때: 백업 파일을 만들지 말고 git으로 관리할 것.

### 4. 컴포넌트 중복 방지

새 컴포넌트를 만들기 전에 반드시 기존 컴포넌트를 확인:
- Guide 관련: `src/components/company/` 에 이미 40+ 가이드 컴포넌트 존재
- Revenue: `RevenueManagementNew.jsx`만 사용 (다른 Revenue* 파일 만들지 말 것)
- Creator Management: `FeaturedCreatorManagementPageNew.jsx`가 메인

### 5. 라우트 규칙

- `/admin/openclo/*` 사용 금지 → `/admin/discovery/*` 사용
- `-old` suffix 라우트 만들지 말 것 (이전 버전은 삭제하고 새 버전으로 교체)
- 테스트용 라우트(`/profile-test-beta-*` 등) 프로덕션에 넣지 말 것

### 6. OliveYoung GuideModal 구분

| 파일명 | 역할 | 사용처 |
|--------|------|--------|
| `OliveYoungGuideCreateModal.jsx` | 일반 가이드 모달 (생성용) | CampaignDetail.jsx |
| `OliveYoungGuideGroupModal.jsx` | 그룹별 가이드 모달 (편집용) | CampaignDetail.jsx |

두 파일은 서로 다른 역할. 하나로 합치지 말 것.

### 7. 멀티리전 DB 접근 패턴

프론트엔드(`src/`):
```javascript
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS } from '@/lib/supabaseClients'
```

서버(`netlify/functions/`):
```javascript
const { getBizClient, getKoreaClient } = require('./lib/supabase');
```

`supabaseKorea.js` (독립 파일) 사용 금지 — `supabaseClients.js`에서 import할 것.

### 8. scheduled 함수 등록 규칙

새 scheduled 함수를 만들면 반드시 `netlify.toml`에 등록:
```toml
[functions."scheduled-새함수이름"]
schedule = "0 9 * * *"
```

등록 안 하면 코드만 있고 실행되지 않음.

### 9. WhatsApp 함수

WhatsApp 메시지 발송은 `send-whatsapp.js` 하나만 사용:
- `mode: "single"` — 단일 템플릿 발송
- `mode: "campaign"` — 캠페인 일괄 발송
- `mode: "freeform"` — 자유 텍스트 발송

`send-whatsapp-message.js` 사용 금지 (삭제됨).

### 10. email_templates 테이블 컬럼

본문 컬럼: `body` (O) / `html_content` (X)

### 11. 프론트엔드에서 리전 DB 직접 UPDATE 금지

프론트엔드 Supabase 클라이언트(`supabaseKorea`, `supabaseJapan` 등)는 **anon key**를 사용하며,
BIZ DB에 로그인한 세션이 리전 DB에 공유되지 않습니다. 따라서:

```javascript
// ❌ 프론트엔드에서 리전 DB 직접 UPDATE (RLS 차단됨!)
const client = getSupabaseClient('korea')
await client.from('campaigns').update({...}).eq('id', id)

// ✅ Netlify Function API를 통해 수정 (service role key 사용)
await fetch('/.netlify/functions/update-campaign-details', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ campaignId, region, updates, adminEmail })
})
```

**규칙:**
- `campaigns` 테이블 UPDATE는 반드시 `update-campaign-details` API 사용
- `applications` 테이블 UPDATE도 Netlify Function을 통해 처리 권장
- SELECT(조회)는 anon key로 가능 (RLS가 허용하는 경우)

### 12. AI 추천 크리에이터 프로필 표시 규칙

- 피부타입(`skinType`)과 피부고민(`skinConcerns`)은 **항상 기본 표시 항목에 포함**
- 뷰티 플랫폼 특성상 카테고리 추론 불가 시에도 피부 정보는 기본 표시
- `skin_concerns` 데이터는 배열 또는 콤마 구분 문자열일 수 있으므로 반드시 배열 변환 처리
- `user_profiles` → `featured_creators` 순으로 폴백하여 프로필 데이터 보강

---

## 연락처

문제 발생 시 GitHub Issues에 등록: https://github.com/anthropics/claude-code/issues
