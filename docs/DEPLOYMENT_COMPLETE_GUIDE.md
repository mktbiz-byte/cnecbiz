# CNEC BIZ 플랫폼 배포 완료 가이드

## 📋 개요

CNEC BIZ는 글로벌 인플루언서 마케팅 플랫폼으로, 일본/미국/대만 시장을 대상으로 캠페인을 관리하고 결제, 포인트, 세금계산서 등을 통합 관리하는 B2B 플랫폼입니다.

## 🎯 주요 기능

### 1. 랜딩 페이지
- 전문적인 비즈니스 디자인
- 서비스 소개 및 주요 기능 안내
- 통계 정보 표시
- 레퍼런스 영상 갤러리

### 2. 인증 시스템
- **구글 OAuth 로그인** (권장)
- 이메일/비밀번호 로그인
- 회원가입 시 약관 동의 시스템

### 3. 기업 대시보드
- 캠페인 생성 및 관리
- 포인트 충전 (신용카드/계좌이체)
- 결제 내역 조회
- 세금계산서 발급 요청
- 캠페인 진행 상황 모니터링

### 4. 관리자 대시보드 (mkt_biz@cnec.co.kr)
- 전체 캠페인 관리
- 결제 승인 처리
- 포인트 충전 승인
- 세금계산서 발급
- 매출 통계 대시보드
- 추천 크리에이터 관리
- 레퍼런스 영상 관리

### 5. 결제 시스템
- **Stripe 신용카드 결제**
- **계좌이체** (관리자 승인 필요)
- **포인트 결제**
- VAT 10% 자동 계산
- 영수증 자동 발급

### 6. 포인트 시스템
- 1포인트 = 1원
- 선충전 후 사용
- 충전 내역 및 사용 내역 조회
- 관리자 포인트 지급 기능

### 7. 세금계산서 시스템
- 계좌이체 결제 시 발급 가능
- 사업자 정보 입력
- PDF 자동 생성
- 이메일 발송

## 🚀 배포 단계

### Step 1: Supabase 프로젝트 설정

#### 1.1 새 프로젝트 생성
1. [Supabase](https://supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: CNEC BIZ
   - **Database Password**: 안전한 비밀번호 설정
   - **Region**: Northeast Asia (Seoul) - 한국 서버
4. "Create new project" 클릭

#### 1.2 데이터베이스 스키마 실행
1. Supabase Dashboard → SQL Editor
2. `COMPLETE_DATABASE_SCHEMA.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. "Run" 클릭
5. 성공 메시지 확인:
   ```
   ✅ CNEC BIZ Complete Database Setup Finished!
   📊 Created 17 tables with all relationships
   🔧 Created helper functions and views
   🔒 Row Level Security enabled with admin policies
   📋 Default terms inserted
   🎉 Database is ready to use!
   ```

#### 1.3 Google OAuth 설정
1. Supabase Dashboard → Authentication → Providers
2. Google 활성화
3. Google Cloud Console에서:
   - 새 프로젝트 생성
   - OAuth 2.0 클라이언트 ID 생성
   - 승인된 리디렉션 URI 추가:
     ```
     https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
     ```
4. Client ID와 Client Secret을 Supabase에 입력
5. "Save" 클릭

#### 1.4 환경 변수 확인
Supabase Dashboard → Settings → API에서 확인:
- **Project URL**: `https://[YOUR-PROJECT-REF].supabase.co`
- **anon public key**: `eyJhbGc...` (공개 키)

### Step 2: Netlify 배포

#### 2.1 GitHub 연결
1. [Netlify](https://netlify.com) 로그인
2. "Add new site" → "Import an existing project"
3. GitHub 선택
4. `mktbiz-byte/cnecbiz` 저장소 선택

#### 2.2 빌드 설정
```
Build command: pnpm run build
Publish directory: dist
```

#### 2.3 환경 변수 설정
Netlify Dashboard → Site settings → Environment variables

**필수 환경 변수:**
```bash
# Supabase (CNEC BIZ)
VITE_SUPABASE_BIZ_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_BIZ_ANON_KEY=eyJhbGc...

# Stripe (결제)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... (또는 pk_test_...)

# Google Gemini AI (선택사항)
VITE_GEMINI_API_KEY=AIza...
```

#### 2.4 배포
1. "Deploy site" 클릭
2. 빌드 완료 대기 (약 2-3분)
3. 배포 URL 확인: `https://[site-name].netlify.app`

#### 2.5 커스텀 도메인 설정 (선택)
1. Netlify Dashboard → Domain settings
2. "Add custom domain" 클릭
3. 도메인 입력 (예: `biz.cnec.co.kr`)
4. DNS 설정:
   ```
   Type: CNAME
   Name: biz
   Value: [site-name].netlify.app
   ```

### Step 3: Stripe 설정 (결제 시스템)

#### 3.1 Stripe 계정 생성
1. [Stripe](https://stripe.com) 가입
2. 비즈니스 정보 입력
3. 은행 계좌 연결

#### 3.2 API 키 확인
1. Stripe Dashboard → Developers → API keys
2. **Publishable key** 복사
3. Netlify 환경 변수에 추가

#### 3.3 웹훅 설정 (선택)
1. Stripe Dashboard → Developers → Webhooks
2. "Add endpoint" 클릭
3. URL: `https://[your-domain]/api/stripe-webhook`
4. 이벤트 선택:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### Step 4: 관리자 계정 생성

#### 4.1 구글 OAuth로 로그인
1. 배포된 사이트 접속
2. "로그인" 클릭
3. "Google로 계속하기" 클릭
4. **mkt_biz@cnec.co.kr** 구글 계정으로 로그인

#### 4.2 관리자 권한 확인
- 로그인 성공 시 자동으로 `/admin/dashboard`로 리디렉션
- 관리자 대시보드 접근 가능 확인

### Step 5: 초기 데이터 설정

#### 5.1 레퍼런스 영상 추가
1. 관리자 대시보드 → 레퍼런스 영상 관리
2. YouTube 영상 URL 추가
3. 썸네일 및 설명 입력

#### 5.2 추천 크리에이터 추가
1. 관리자 대시보드 → 추천 크리에이터 관리
2. 크리에이터 정보 입력
3. AI 분석 실행 (선택)

## 🔧 환경 변수 전체 목록

```bash
# Supabase - CNEC BIZ
VITE_SUPABASE_BIZ_URL=https://xxxxx.supabase.co
VITE_SUPABASE_BIZ_ANON_KEY=eyJhbGc...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Google Gemini AI (선택)
VITE_GEMINI_API_KEY=AIza...
```

## 📱 주요 URL 구조

```
/ - 랜딩 페이지
/login - 로그인
/signup - 회원가입
/company/dashboard - 기업 대시보드
/admin/dashboard - 관리자 대시보드
```

## 🔐 보안 설정

### RLS (Row Level Security) 정책
- 모든 테이블에 RLS 활성화
- 사용자는 자신의 데이터만 조회/수정 가능
- 관리자(`mkt_biz@cnec.co.kr`)는 모든 데이터 접근 가능

### 인증 보안
- Google OAuth 사용 권장
- JWT 토큰 기반 인증
- 세션 자동 갱신

## 🧪 테스트 체크리스트

### 기본 기능
- [ ] 랜딩 페이지 로드
- [ ] 구글 OAuth 로그인
- [ ] 이메일 회원가입
- [ ] 약관 동의 시스템

### 기업 사용자
- [ ] 캠페인 생성
- [ ] 포인트 충전 (Stripe)
- [ ] 포인트 충전 (계좌이체)
- [ ] 결제 내역 조회
- [ ] 세금계산서 요청

### 관리자
- [ ] 관리자 대시보드 접근
- [ ] 캠페인 관리
- [ ] 결제 승인
- [ ] 포인트 충전 승인
- [ ] 세금계산서 발급
- [ ] 매출 통계 조회
- [ ] 크리에이터 관리

## 🎨 디자인 시스템

### 색상 팔레트
- **Primary**: 전문적인 블루/그레이 톤
- **Secondary**: 포인트 컬러
- **Background**: 화이트/라이트 그레이

### 폰트
- 한글: Pretendard, Noto Sans KR
- 영문: Inter, Roboto

### 컴포넌트
- TailwindCSS v4
- Radix UI
- Lucide Icons

## 📊 데이터베이스 구조

### 주요 테이블 (17개)
1. **companies** - 기업 정보
2. **teams** - 팀 관리
3. **team_members** - 팀 멤버
4. **team_invitations** - 팀 초대
5. **campaigns** - 캠페인
6. **payments** - 결제
7. **tax_invoices** - 세금계산서
8. **points_balance** - 포인트 잔액
9. **points_transactions** - 포인트 거래 내역
10. **points_charge_requests** - 포인트 충전 요청
11. **featured_creators** - 추천 크리에이터
12. **guides** - 가이드
13. **video_revisions** - 영상 수정 요청
14. **documents** - 문서
15. **reference_videos** - 레퍼런스 영상
16. **terms** - 약관
17. **user_term_agreements** - 약관 동의

## 🆘 문제 해결

### 빌드 오류
```bash
# 캐시 삭제 후 재빌드
rm -rf node_modules dist
pnpm install
pnpm run build
```

### 데이터베이스 오류
- SQL 스키마를 순서대로 실행했는지 확인
- RLS 정책이 활성화되어 있는지 확인
- 관리자 이메일이 정확한지 확인

### 인증 오류
- Supabase URL과 API 키가 정확한지 확인
- Google OAuth 리디렉션 URI 설정 확인
- 브라우저 쿠키 허용 확인

## 📞 지원

문제가 발생하면:
1. GitHub Issues 확인
2. Supabase 로그 확인
3. Netlify 빌드 로그 확인

---

**배포 완료!** 🎉

이제 `mkt_biz@cnec.co.kr` 계정으로 로그인하여 관리자 기능을 사용할 수 있습니다.

