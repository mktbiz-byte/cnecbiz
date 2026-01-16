# CLAUDE.md - cnecbiz 프로젝트 컨텍스트

## 프로젝트 개요

**cnecbiz**는 크리에이터 마케팅 플랫폼의 기업/관리자용 웹 애플리케이션입니다.
기업이 크리에이터와 캠페인을 관리하고, 포인트/결제 시스템을 운영하며, 계약서를 발송하는 등의 기능을 제공합니다.

- **도메인**: https://cnecbiz.com
- **서비스명**: 씨넥비즈 (CNEC Biz)
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

## 무시해야 할 파일 목록

> 아래 파일들은 **백업/구버전 파일**로, 참조하지 마세요.

### src/ 내 백업 파일
```
src/App_Old.jsx
src/components/CampaignCreatePage.jsx.backup_20251209_020246
src/components/LandingPage.jsx.backup
src/components/LoginPageNew.jsx.backup
src/components/admin/AdminCampaignEdit.jsx.backup
src/components/admin/AllCreatorsPage.jsx.backup
src/components/admin/FeaturedCreatorManagementPage_OLD.jsx
src/components/admin/OurChannelReport.jsx.backup
src/components/admin/SiteManagement.jsx.backup
src/components/admin/SiteManagement.jsx.old
src/components/company/CampaignDetail.jsx.backup
src/components/company/CampaignDetail.jsx.backup2
src/components/company/CampaignGuide4WeekChallenge.jsx.backup_20251209_022629
src/components/company/CampaignGuideEditor.jsx.backup_20251209_020713
src/components/company/CampaignGuideJapan.jsx.backup
src/components/company/CampaignGuideJapan.jsx.backup_20251209_022629
src/components/company/CampaignGuideOliveYoung.jsx.backup_20251209_022629
src/components/company/CreateCampaignJapan.jsx.backup
src/components/company/CreateCampaignJapan.jsx.backup2
src/components/company/CreateCampaignKorea.jsx.backup
src/components/company/CreateCampaignKorea_OLD_BACKUP.jsx
src/components/company/CreateCampaignUS.jsx.backup
src/components/company/FourWeekChallengeInvoice.jsx.old
src/components/company/FourWeekGuideModal.jsx.backup
src/components/company/OliveYoungGuideModal.jsx.backup
src/components/company/PaymentMethodSelection.jsx.backup_20251209_021005
src/components/creator/CreatorMyPage.jsx.backup
src/pages/FourWeekChallengeCampaignIntro.jsx.old
src/pages/OliveYoungCampaignIntro.jsx.old
src/pages/RegularCampaignIntro.jsx.old
```

### 루트 폴더 참고 문서 (개발 가이드용, 코드 아님)
```
*.md (CLAUDE.md 제외)
*.sql
check_*.js, check_*.mjs
test-*.js, test-*.cjs
migrate_*.py
```

### 사용하지 않는 또는 deprecated 컴포넌트
```
src/components/LoginPageOld.jsx         # /login-old에서만 사용
src/components/SignupPageNew.jsx        # /signup-old에서만 사용
src/components/admin/RevenueManagement.jsx       # deprecated → RevenueManagementNew 사용
src/components/admin/RevenueManagementEnhanced.jsx  # deprecated
src/components/admin/RevenueManagementWithCharts.jsx  # deprecated
src/components/company/GuideReview.jsx  # deprecated → CampaignGuideReview 사용
```

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
backfill-campaign-company-info.js # 캠페인 기업 정보 백필
```

### 결제/포인트
```
confirm-payment.js        # 결제 확인
confirm-toss-payment.js   # 토스 결제 확인
confirm-campaign-payment.js # 캠페인 결제 확인
create-charge-request.js  # 충전 요청 생성
confirm-charge-complete.js # 충전 완료 확인
precharge-points.js       # 포인트 선충전
award-bonus-points.js     # 보너스 포인트 지급
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

### 예약 작업 (Scheduled)
```
scheduled-daily-report.js           # 일일 리포트
scheduled-campaign-deadline-notification.js # 캠페인 마감 알림
scheduled-video-deadline-notification.js    # 영상 마감 알림
scheduled-collect-transactions.js   # 거래 수집
scheduled-creator-monitoring.js     # 크리에이터 모니터링
scheduled-weekly-withdrawal-report.js # 주간 출금 리포트
```

### 테스트/디버그 (무시해도 됨)
```
test-*.js                 # 모든 테스트 함수
debug-*.js                # 모든 디버그 함수
check-*.js                # 모든 체크 함수
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
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

exports.handler = async (event) => {
  try {
    const { param1, param2 } = JSON.parse(event.body)

    // 비즈니스 로직

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: result })
    }
  } catch (error) {
    console.error('[function-name] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    }
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

### 4. 빌드 & 배포
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
# Netlify에 자동 배포 (Git push)
```

---

## 환경변수 (.env)

```env
# Supabase BIZ (주 사용)
VITE_SUPABASE_BIZ_URL=
VITE_SUPABASE_BIZ_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Netlify Functions 전용

# 기타 리전
VITE_SUPABASE_KOREA_URL=
VITE_SUPABASE_KOREA_ANON_KEY=
VITE_SUPABASE_JAPAN_URL=
VITE_SUPABASE_JAPAN_ANON_KEY=
VITE_SUPABASE_US_URL=
VITE_SUPABASE_US_ANON_KEY=

# 이메일 (Gmail SMTP)
GMAIL_USER=
GMAIL_APP_PASSWORD=

# Popbill
POPBILL_LINK_ID=
POPBILL_SECRET_KEY=

# Stibee
STIBEE_API_KEY=

# Stripe / Toss
STRIPE_SECRET_KEY=
TOSS_SECRET_KEY=
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

## 연락처

문제 발생 시 GitHub Issues에 등록: https://github.com/anthropics/claude-code/issues
