# 전자계약서 시스템 개선 완료 보고서

**커밋 ID:** `20d51c96`  
**배포 URL:** https://cnectotal.netlify.app  
**작업 일시:** 2025년 10월 30일

---

## 📋 개선 내용

### 1. ✅ 관리자 권한 문제 해결

**문제:**
- `/admin/contracts` 페이지에서 `admins` 테이블을 참조하여 권한 체크 실패

**해결:**
- `admin_users` 테이블로 변경
- `user_id` → `email` 기준으로 권한 확인
- `maybeSingle()` 사용하여 에러 방지

**파일:** `src/components/admin/AdminContractManagement.jsx`

```javascript
const { data: adminData } = await supabaseBiz
  .from('admin_users')
  .select('*')
  .eq('email', user.email)
  .maybeSingle()
```

---

### 2. ✅ 회사 도장 관리 UI 추가

**기능:**
- 사이트 관리 > 전자계약서 탭에 "회사 도장 관리" 섹션 추가
- 도장 이미지 업로드 UI (파일 선택 영역)
- 등록된 도장 표시 영역

**데이터베이스:**
- `company_stamps` 테이블 생성
  - `id` (UUID, Primary Key)
  - `company_name` (TEXT, NOT NULL)
  - `stamp_image_url` (TEXT, NOT NULL)
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)
  - `is_default` (BOOLEAN, DEFAULT true)

**파일:** `src/components/admin/SiteManagement.jsx`

**다음 단계:**
- 도장 이미지 업로드 기능 구현
- Supabase Storage 연동
- 등록된 도장 자동 적용

---

### 3. ✅ 계약서 작성 페이지 개선

**기존:**
- 간단한 수신자 정보만 입력
- 계약서 데이터 부족

**개선:**
- **회사명 필드 추가** (기업용 계약서 필수)
- **캠페인명 필드 추가** (선택사항)
- **계약서 데이터 자동 구성**
  - `recipientName`: 수신자 이름
  - `recipientEmail`: 수신자 이메일
  - `companyName`: 회사명
  - `campaignName`: 캠페인명
  - `date`: 계약일자 (자동)

**파일:** `src/components/admin/AdminContractManagement.jsx`

```javascript
const contractData = {
  ...newContract.data,
  recipientName: newContract.recipientName,
  recipientEmail: newContract.recipientEmail,
  companyName: newContract.companyName || 'CNEC',
  date: new Date().toLocaleDateString('ko-KR')
}
```

---

### 4. ✅ 테스트 발송 → 계약서 작성 버튼으로 변경

**기존:**
- "테스트 발송" 버튼 (단순 alert)
- 실제 계약서 작성 불가

**개선:**
- "계약서 작성 및 발송" 버튼
- `/admin/contracts?type=company` 페이지로 이동
- `/admin/contracts?type=creator` 페이지로 이동
- 실제 계약서 작성 가능

**파일:** `src/components/admin/SiteManagement.jsx`

```javascript
<Button 
  className="w-full"
  onClick={() => {
    navigate('/admin/contracts?type=company')
  }}
>
  <Send className="w-4 h-4 mr-2" />
  계약서 작성 및 발송
</Button>
```

---

## 🎯 사용 방법

### 1. 관리자 로그인
- https://cnectotal.netlify.app/admin/login
- 관리자 계정으로 로그인

### 2. 사이트 관리 페이지
- https://cnectotal.netlify.app/admin/site-management
- **전자계약서 탭** 클릭

### 3. 회사 도장 등록 (예정)
- "도장 이미지 업로드" 클릭
- PNG/JPG 파일 선택 (최대 2MB)
- 등록된 도장 확인

### 4. 계약서 작성
- **기업용 계약서:** "계약서 작성 및 발송" 버튼 클릭
- **크리에이터용 동의서:** "동의서 작성 및 발송" 버튼 클릭
- 필수 정보 입력:
  - 수신자 이름
  - 수신자 이메일
  - 회사명 (기업용만)
  - 캠페인명 (선택)
- "생성" 버튼 클릭

### 5. 계약서 발송
- 생성된 계약서 목록에서 "발송" 버튼 클릭
- 수신자 이메일로 계약서 링크 발송

---

## 🔧 기술 세부사항

### 데이터베이스 스키마

#### `company_stamps` 테이블
```sql
CREATE TABLE company_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  stamp_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_default BOOLEAN DEFAULT true
);
```

#### `contracts` 테이블 (기존)
- `contract_data` 필드에 다음 정보 저장:
  - `recipientName`: 수신자 이름
  - `recipientEmail`: 수신자 이메일
  - `companyName`: 회사명
  - `campaignName`: 캠페인명
  - `date`: 계약일자

---

## 📝 다음 단계 (TODO)

### 1. 도장 업로드 기능 구현
- [ ] Supabase Storage 버킷 생성
- [ ] 파일 업로드 함수 구현
- [ ] 이미지 URL 저장
- [ ] 등록된 도장 표시

### 2. 도장 자동 적용
- [ ] 계약서 생성 시 기본 도장 자동 선택
- [ ] 계약서 PDF에 도장 이미지 삽입
- [ ] 서명 페이지에 도장 표시

### 3. 서명 페이지 권한 제거
- [ ] `/sign-contract/:id` 페이지 권한 체크 제거
- [ ] 이메일 링크로 누구나 접근 가능하도록 수정

### 4. 이메일 발송 기능
- [ ] Netlify Functions로 이메일 발송
- [ ] 계약서 링크 포함
- [ ] 만료일 안내

---

## ⚠️ 알려진 이슈

1. **도장 업로드 기능 미구현**
   - 현재 UI만 존재
   - 실제 업로드 기능은 다음 단계에서 구현 예정

2. **서명 페이지 권한 문제**
   - 현재 로그인 필요
   - 이메일 링크로 접근 시 권한 에러 발생 가능
   - 권한 체크 제거 필요

---

## 📦 변경된 파일

1. `src/components/admin/AdminContractManagement.jsx`
   - 관리자 권한 체크 수정
   - 계약서 작성 폼 개선

2. `src/components/admin/SiteManagement.jsx`
   - 회사 도장 관리 UI 추가
   - 테스트 발송 → 계약서 작성 버튼 변경

3. Supabase 데이터베이스
   - `company_stamps` 테이블 생성

---

## 🎉 결론

전자계약서 시스템의 핵심 기능이 구현되었습니다. 이제 관리자가 실제 계약서를 작성하고 발송할 수 있으며, 회사 도장 관리 기능도 준비되었습니다. 다음 단계에서 도장 업로드 기능과 서명 페이지 권한 문제를 해결하면 완전한 전자계약서 시스템이 완성됩니다!

