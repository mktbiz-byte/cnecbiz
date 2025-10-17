# CNEC BIZ 배포 가이드

## 개요

CNEC BIZ는 일본, 미국, 대만 등 전 세계 인플루언서 마케팅 캠페인을 한 곳에서 관리하는 통합 플랫폼입니다. 이 가이드는 Supabase 설정부터 Netlify 배포까지 전체 과정을 안내합니다.

## 1단계: Supabase 프로젝트 생성

총 4개의 Supabase 프로젝트가 필요합니다.

### 1.1 BIZ 프로젝트 (중앙 관리용)

**목적**: 기업 정보, 캠페인 메타데이터, 견적서, 계약서 관리

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `cnec-biz`
   - Database Password: 안전한 비밀번호 생성
   - Region: `Northeast Asia (Seoul)` 권장
4. "Create new project" 클릭
5. 프로젝트 생성 완료 후 다음 정보 복사:
   - Project URL
   - Project API Key (anon, public)

#### 데이터베이스 스키마 생성

SQL Editor에서 다음 쿼리 실행:

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

-- Row Level Security (RLS) 활성화
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view their own company data"
  ON companies FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own company data"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own campaigns"
  ON campaigns FOR SELECT
  USING (company_id = auth.uid());

CREATE POLICY "Users can insert their own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Users can view their own quotations"
  ON quotations FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own contracts"
  ON contracts FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = auth.uid()
    )
  );
```

### 1.2 Japan 프로젝트

**목적**: 일본 지역 캠페인 및 크리에이터 관리

기존 cnec-jp.com에서 사용 중인 Supabase 프로젝트 정보를 사용하거나, 새로 생성:

1. Name: `cnec-japan`
2. Region: `Northeast Asia (Tokyo)` 권장
3. 캠페인 테이블 생성:

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  package_type INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view campaigns"
  ON campaigns FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (true);
```

### 1.3 US 프로젝트

**목적**: 미국 지역 캠페인 및 크리에이터 관리

기존 cnec-us.com에서 사용 중인 Supabase 프로젝트 정보를 사용하거나, 새로 생성:

1. Name: `cnec-us`
2. Region: `West US (N. California)` 권장
3. 위와 동일한 캠페인 테이블 생성

### 1.4 Taiwan 프로젝트

**목적**: 대만 지역 캠페인 및 크리에이터 관리

기존 cnec-tw.com에서 사용 중인 Supabase 프로젝트 정보를 사용하거나, 새로 생성:

1. Name: `cnec-taiwan`
2. Region: `Northeast Asia (Seoul)` 또는 `Southeast Asia (Singapore)` 권장
3. 위와 동일한 캠페인 테이블 생성

## 2단계: 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```bash
# Central BIZ Supabase
VITE_SUPABASE_BIZ_URL=https://your-biz-project.supabase.co
VITE_SUPABASE_BIZ_ANON_KEY=your-biz-anon-key

# Japan Region Supabase
VITE_SUPABASE_JAPAN_URL=https://your-japan-project.supabase.co
VITE_SUPABASE_JAPAN_ANON_KEY=your-japan-anon-key

# US Region Supabase
VITE_SUPABASE_US_URL=https://your-us-project.supabase.co
VITE_SUPABASE_US_ANON_KEY=your-us-anon-key

# Taiwan Region Supabase
VITE_SUPABASE_TAIWAN_URL=https://your-taiwan-project.supabase.co
VITE_SUPABASE_TAIWAN_ANON_KEY=your-taiwan-anon-key
```

**중요**: `.env` 파일은 절대 Git에 커밋하지 마세요. 이미 `.gitignore`에 포함되어 있습니다.

## 3단계: 로컬 테스트

### 3.1 의존성 설치

```bash
cd cnecbzi
pnpm install
```

### 3.2 개발 서버 실행

```bash
pnpm run dev
```

브라우저에서 http://localhost:5173 접속하여 테스트:

1. 회원가입 테스트
2. 로그인 테스트
3. 캠페인 생성 테스트
4. 견적서/계약서 PDF 다운로드 테스트

### 3.3 빌드 테스트

```bash
pnpm run build
pnpm run preview
```

## 4단계: GitHub 저장소 생성

### 4.1 GitHub에서 새 저장소 생성

1. GitHub에 로그인
2. "New repository" 클릭
3. Repository name: `cnecbzi`
4. Visibility: Private 권장
5. "Create repository" 클릭

### 4.2 로컬 저장소 연결 및 푸시

```bash
cd /home/ubuntu/cnecbzi

# GitHub 저장소 연결
git remote add origin https://github.com/YOUR_USERNAME/cnecbzi.git

# 푸시
git push -u origin master
```

또는 GitHub CLI 사용:

```bash
cd /home/ubuntu/cnecbzi
gh repo create cnecbzi --private --source=. --remote=origin --push
```

## 5단계: Netlify 배포

### 5.1 Netlify 계정 연결

1. [Netlify](https://app.netlify.com)에 로그인
2. "Add new site" → "Import an existing project" 클릭
3. "GitHub" 선택
4. `cnecbzi` 저장소 선택

### 5.2 빌드 설정

다음 설정 입력:

- **Base directory**: (비워두기)
- **Build command**: `pnpm run build`
- **Publish directory**: `dist`
- **Node version**: 22 (Environment variables에서 설정)

### 5.3 환경 변수 설정

"Site settings" → "Environment variables"에서 다음 변수 추가:

```
VITE_SUPABASE_BIZ_URL=https://your-biz-project.supabase.co
VITE_SUPABASE_BIZ_ANON_KEY=your-biz-anon-key
VITE_SUPABASE_JAPAN_URL=https://your-japan-project.supabase.co
VITE_SUPABASE_JAPAN_ANON_KEY=your-japan-anon-key
VITE_SUPABASE_US_URL=https://your-us-project.supabase.co
VITE_SUPABASE_US_ANON_KEY=your-us-anon-key
VITE_SUPABASE_TAIWAN_URL=https://your-taiwan-project.supabase.co
VITE_SUPABASE_TAIWAN_ANON_KEY=your-taiwan-anon-key
```

### 5.4 커스텀 도메인 설정

1. "Domain settings" → "Add custom domain" 클릭
2. `cnecbzi.com` 입력
3. DNS 설정:
   - Type: `A`
   - Name: `@`
   - Value: `75.2.60.5` (Netlify Load Balancer)
   
   또는
   
   - Type: `CNAME`
   - Name: `www`
   - Value: `your-site-name.netlify.app`

4. SSL/TLS 인증서 자동 발급 대기 (수 분 소요)

### 5.5 배포 확인

1. "Deploys" 탭에서 배포 상태 확인
2. 배포 완료 후 사이트 접속 테스트
3. 모든 기능 정상 작동 확인

## 6단계: Supabase 인증 설정

### 6.1 Redirect URLs 설정

각 Supabase 프로젝트의 "Authentication" → "URL Configuration"에서:

**BIZ 프로젝트**:
- Site URL: `https://cnecbzi.com`
- Redirect URLs:
  - `https://cnecbzi.com/**`
  - `http://localhost:5173/**` (개발용)

**Japan/US/Taiwan 프로젝트**:
- 각 지역 사이트 URL 설정

### 6.2 이메일 템플릿 설정

"Authentication" → "Email Templates"에서 회원가입 확인 이메일 등 커스터마이징

## 7단계: 모니터링 및 유지보수

### 7.1 Netlify 모니터링

- "Analytics" 탭에서 트래픽 확인
- "Functions" 탭에서 서버리스 함수 로그 확인 (필요시)

### 7.2 Supabase 모니터링

- "Database" → "Logs"에서 쿼리 로그 확인
- "Auth" → "Users"에서 회원 현황 확인

### 7.3 정기 백업

Supabase 프로젝트 설정에서 자동 백업 활성화 권장

## 트러블슈팅

### 문제 1: 빌드 실패

**증상**: Netlify에서 빌드가 실패함

**해결**:
1. 환경 변수가 모두 설정되었는지 확인
2. Node 버전 확인 (22 이상 필요)
3. `pnpm-lock.yaml` 파일이 커밋되었는지 확인

### 문제 2: Supabase 연결 실패

**증상**: 로그인/회원가입이 작동하지 않음

**해결**:
1. 환경 변수의 URL과 Key가 정확한지 확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. RLS 정책이 올바르게 설정되었는지 확인

### 문제 3: PDF 다운로드 실패

**증상**: 견적서/계약서 다운로드가 작동하지 않음

**해결**:
1. 브라우저 콘솔에서 에러 메시지 확인
2. jsPDF 라이브러리가 정상 설치되었는지 확인
3. 한글 폰트 로딩 확인

## 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Supabase RLS 정책이 활성화되어 있는지 확인
- [ ] API Key가 공개 저장소에 노출되지 않았는지 확인
- [ ] HTTPS가 활성화되어 있는지 확인
- [ ] 비밀번호 정책이 강력한지 확인

## 성능 최적화

### 권장 사항

1. **이미지 최적화**: WebP 형식 사용
2. **코드 스플리팅**: React.lazy() 활용
3. **CDN 활용**: Netlify CDN 자동 적용
4. **캐싱 전략**: 정적 자산 캐싱 설정

## 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Netlify 공식 문서](https://docs.netlify.com)
- [React Router 문서](https://reactrouter.com)
- [shadcn/ui 문서](https://ui.shadcn.com)

## 지원

문제가 발생하면 다음을 확인하세요:

1. 이 가이드의 트러블슈팅 섹션
2. Netlify 배포 로그
3. Supabase 데이터베이스 로그
4. 브라우저 개발자 도구 콘솔

---

© 2025 CNEC BIZ. All rights reserved.

