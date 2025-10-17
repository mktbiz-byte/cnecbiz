# CNEC BIZ - 글로벌 인플루언서 마케팅 통합 관리 플랫폼

일본, 미국, 대만 등 전 세계 인플루언서 마케팅 캠페인을 한 곳에서 관리하는 플랫폼입니다.

## 주요 기능

### 1. 다중 지역 캠페인 관리
- 🇯🇵 일본 (cnec-jp.com)
- 🇺🇸 미국 (cnec-us.com)
- 🇹🇼 대만 (cnec-tw.com)
- 한 번의 캠페인 생성으로 여러 지역에 동시 배포

### 2. 패키지 시스템
- **20만원 패키지**: 기본형
- **30만원 패키지**: 스탠다드 (영상 수정 1회)
- **40만원 패키지**: 프리미엄
- **60만원 패키지**: 4주 연속 캠페인

### 3. 자동 문서 생성
- 견적서 자동 생성 및 PDF 다운로드
- 계약서 자동 생성 및 PDF 다운로드

### 4. 통합 대시보드
- 모든 지역의 캠페인 현황 한눈에 확인
- 실시간 통계 및 성과 분석

## 기술 스택

- **Frontend**: React 19 + Vite
- **UI**: TailwindCSS + shadcn/ui
- **Database**: Supabase (다중 인스턴스)
- **PDF**: jsPDF + jspdf-autotable
- **Routing**: React Router v7

## 설치 및 실행

### 1. 의존성 설치
```bash
pnpm install
```

### 2. 환경 변수 설정
`.env.example` 파일을 `.env`로 복사하고 Supabase 정보를 입력하세요:

```bash
cp .env.example .env
```

### 3. Supabase 데이터베이스 설정

#### BIZ 데이터베이스 (중앙 관리)
```sql
-- companies 테이블
CREATE TABLE companies (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  business_number TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- campaigns 테이블
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  package_type INTEGER NOT NULL,
  regions TEXT[] NOT NULL,
  title TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_url TEXT,
  brand_identity TEXT,
  required_dialogue TEXT,
  required_scenes TEXT,
  reference_urls TEXT[],
  product_description TEXT,
  guidelines TEXT,
  recruitment_count INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quotations 테이블
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  amount INTEGER NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- contracts 테이블
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  pdf_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 지역별 데이터베이스 (일본, 미국, 대만)
각 지역의 Supabase에도 동일한 `campaigns` 테이블을 생성하세요.

### 4. 개발 서버 실행
```bash
pnpm run dev
```

브라우저에서 http://localhost:5173 으로 접속하세요.

## 프로젝트 구조

```
cnecbzi/
├── src/
│   ├── components/
│   │   ├── HomePage.jsx              # 메인 페이지 (회사 소개)
│   │   ├── SignupPage.jsx            # 기업 회원가입
│   │   ├── LoginPage.jsx             # 로그인
│   │   ├── DashboardPage.jsx         # 대시보드
│   │   └── CampaignCreatePage.jsx    # 캠페인 생성
│   ├── lib/
│   │   ├── supabaseClients.js        # 다중 Supabase 연결
│   │   └── pdfGenerator.js           # 견적서/계약서 PDF 생성
│   ├── App.jsx                       # 라우팅
│   └── main.jsx                      # 엔트리 포인트
├── .env.example                      # 환경 변수 예시
└── README.md
```

## 사용 흐름

### 1. 기업 회원가입
- 회사 정보 입력
- 사업자등록번호, 담당자 정보 등록

### 2. 로그인
- 이메일/비밀번호로 로그인

### 3. 캠페인 생성
**Step 1: 패키지 & 지역 선택**
- 원하는 패키지 선택 (20만원/30만원/40만원/60만원)
- 진행할 지역 선택 (일본/미국/대만 - 다중 선택 가능)

**Step 2: 기업/브랜드 정보**
- 캠페인명, 브랜드명, 제품명
- 제품 URL, 브랜드 아이덴티티

**Step 3: 제품 정보**
- 필수 대사, 필수 장면
- 레퍼런스 URL
- 제품 설명, 가이드라인

**Step 4: 확인 및 생성**
- 캠페인 정보 최종 확인
- 견적서/계약서 자동 다운로드

### 4. 대시보드에서 관리
- 생성된 캠페인 목록 확인
- 지역별 진행 상황 모니터링
- 통계 및 성과 확인

## 환경 변수

| 변수명 | 설명 |
|--------|------|
| `VITE_SUPABASE_BIZ_URL` | 중앙 BIZ Supabase URL |
| `VITE_SUPABASE_BIZ_ANON_KEY` | 중앙 BIZ Supabase Anon Key |
| `VITE_SUPABASE_JAPAN_URL` | 일본 Supabase URL |
| `VITE_SUPABASE_JAPAN_ANON_KEY` | 일본 Supabase Anon Key |
| `VITE_SUPABASE_US_URL` | 미국 Supabase URL |
| `VITE_SUPABASE_US_ANON_KEY` | 미국 Supabase Anon Key |
| `VITE_SUPABASE_TAIWAN_URL` | 대만 Supabase URL |
| `VITE_SUPABASE_TAIWAN_ANON_KEY` | 대만 Supabase Anon Key |

## 배포

### Netlify 배포
1. GitHub에 푸시
2. Netlify에서 프로젝트 연결
3. 빌드 설정:
   - Build command: `pnpm run build`
   - Publish directory: `dist`
4. 환경 변수 설정
5. 배포

## 확장 예정 지역

- 🇰🇷 한국 (별도 문의)
- 🇷🇺 러시아 (오픈 예정)
- 🇨🇳 중국 (오픈 예정)
- 🇦🇪 중동 (오픈 예정)
- 🇸🇬 동남아 (오픈 예정)
- 🇪🇺 유럽 (오픈 예정)
- 🇧🇷 남미 (오픈 예정)

## 라이선스

© 2025 CNEC BIZ. All rights reserved.

