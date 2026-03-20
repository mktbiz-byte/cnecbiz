# Supabase 설정 가이드

## 📋 개요

CNEC BIZ 플랫폼을 위한 Supabase 데이터베이스 설정 가이드입니다.

---

## 🚀 Step 1: Supabase 프로젝트 생성

### 1. Supabase 접속
https://supabase.com 접속 후 로그인 (또는 회원가입)

### 2. 새 프로젝트 생성
1. 대시보드에서 **"New Project"** 클릭
2. Organization 선택 (없으면 새로 생성)
3. 프로젝트 정보 입력:
   ```
   Name: cnec-biz
   Database Password: [안전한 비밀번호 생성 - 꼭 저장하세요!]
   Region: Northeast Asia (Seoul) 또는 가장 가까운 지역
   Pricing Plan: Free
   ```
4. **"Create new project"** 클릭
5. 약 2분 대기 (프로젝트 생성 중...)

---

## 🔑 Step 2: API 키 확인

프로젝트 생성 완료 후:

### 1. Settings 이동
왼쪽 사이드바에서 **Settings** (⚙️ 아이콘) 클릭

### 2. API 섹션
**API** 메뉴 클릭

### 3. 키 복사
다음 정보를 복사해서 안전한 곳에 저장:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxNjI4ODAwMCwiZXhwIjoyMDMxODY0MDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📊 Step 3: 데이터베이스 테이블 생성

### 1. SQL Editor 열기
왼쪽 사이드바에서 **SQL Editor** 클릭

### 2. New Query
**"New query"** 버튼 클릭

### 3. SQL 스크립트 실행
프로젝트 폴더의 `supabase_setup.sql` 파일 내용을 복사해서 붙여넣기

또는 아래 내용을 직접 붙여넣기:

```sql
-- (supabase_setup.sql 파일 내용 전체)
```

### 4. 실행
**"Run"** 버튼 클릭 (또는 Ctrl+Enter)

### 5. 확인
- 오류 없이 완료되면 성공!
- 왼쪽 사이드바에서 **Table Editor** 클릭하여 테이블 확인

생성된 테이블:
- ✅ companies
- ✅ teams
- ✅ team_members
- ✅ team_invitations
- ✅ campaigns
- ✅ payments
- ✅ featured_creators
- ✅ guides
- ✅ video_revisions
- ✅ documents

---

## 🔒 Step 4: Authentication 설정

### 1. Authentication 이동
왼쪽 사이드바에서 **Authentication** 클릭

### 2. Providers 설정
**Providers** 탭에서:
- **Email** 활성화 (기본적으로 활성화되어 있음)
- **Confirm email** 옵션 확인 (선택사항)

### 3. Email Templates (선택사항)
**Email Templates** 탭에서 회원가입 이메일 템플릿 커스터마이징 가능

---

## 🌐 Step 5: Netlify 환경 변수 설정

### 1. Netlify 대시보드 접속
https://app.netlify.com

### 2. 사이트 선택
cnectotal (또는 cnecbzi) 사이트 선택

### 3. Site settings → Environment variables
**Site settings** → **Environment variables** 클릭

### 4. 환경 변수 추가
**"Add a variable"** 클릭하여 다음 추가:

```
Key: VITE_SUPABASE_BIZ_URL
Value: https://xxxxxxxxxxxxx.supabase.co
(Step 2에서 복사한 Project URL)

Key: VITE_SUPABASE_BIZ_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
(Step 2에서 복사한 anon public key)
```

### 5. 저장
**"Save"** 클릭

---

## 🔄 Step 6: Netlify 재배포

### 1. Deploys 탭 이동
Netlify 사이트 대시보드에서 **Deploys** 탭 클릭

### 2. Trigger deploy
**"Trigger deploy"** → **"Clear cache and deploy site"** 클릭

### 3. 배포 완료 대기
약 1-2분 대기

---

## ✅ Step 7: 테스트

### 1. 사이트 접속
https://cnectotal.netlify.app (또는 your-site.netlify.app)

### 2. 회원가입 테스트
1. "회원가입" 버튼 클릭
2. 기업 정보 입력
3. 회원가입 완료

### 3. Supabase에서 확인
Supabase 대시보드 → **Table Editor** → **companies** 테이블
→ 방금 가입한 기업 정보가 보이면 성공!

---

## 🐛 문제 해결

### 오류: "Failed to fetch"
- Supabase URL이 정확한지 확인
- Netlify 환경 변수가 올바르게 설정되었는지 확인
- 재배포 후 충분히 대기했는지 확인

### 오류: "Invalid API key"
- anon key가 정확한지 확인
- 키 앞뒤에 공백이 없는지 확인

### 오류: "Row Level Security"
- SQL 스크립트가 완전히 실행되었는지 확인
- RLS 정책이 올바르게 생성되었는지 확인

### 테이블이 보이지 않음
- SQL Editor에서 스크립트 재실행
- 오류 메시지 확인

---

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎯 다음 단계

Supabase 설정 완료 후:

1. ✅ 회원가입/로그인 테스트
2. ✅ 캠페인 생성 테스트
3. ✅ 결제 시스템 테스트 (Stripe 설정 필요)
4. 🔄 지역별 Supabase 연동 (일본, 미국, 대만)

---

**작성일**: 2025-10-17
**버전**: 1.0.0

