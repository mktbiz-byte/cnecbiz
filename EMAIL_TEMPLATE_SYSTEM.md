# 이메일 템플릿 시스템 구현 완료

## 📋 개요
CNEC Biz 캠페인 관리 플랫폼에 이메일 알림 시스템을 구축했습니다. 관리자가 이메일 템플릿을 관리하고, 자동으로 이메일을 발송할 수 있는 시스템입니다.

## ✅ 완료된 작업

### 1. 데이터베이스 구조
**테이블: `email_templates`**
- `id` (UUID): 고유 식별자
- `template_type` (TEXT): 템플릿 유형 ('company' 또는 'creator')
- `template_key` (TEXT): 템플릿 식별자 (예: 'signup_welcome')
- `template_name` (TEXT): 템플릿 이름 (예: '회원가입 환영')
- `subject` (TEXT): 이메일 제목
- `body` (TEXT): 이메일 본문 (HTML)
- `variables` (JSONB): 사용 가능한 변수 목록
- `is_active` (BOOLEAN): 활성화 여부
- `display_order` (INTEGER): 표시 순서
- `created_at`, `updated_at` (TIMESTAMPTZ): 생성/수정 시간

**RLS 정책:**
- 모든 사용자: 읽기 가능
- 관리자만: 수정/삽입/삭제 가능

### 2. 초기 데이터 (10개 기업용 템플릿)
1. **signup_welcome** - 회원가입 환영
   - 변수: `company_name`, `dashboard_url`

2. **campaign_created** - 캠페인 작성 완료
   - 변수: `company_name`, `campaign_title`, `package_type`, `total_amount`, `campaign_url`

3. **invoice_submitted** - 입금 요청서 제출 완료
   - 변수: `company_name`, `amount`, `bank_account`, `depositor_name`, `tax_invoice_required`, `payment_url`

4. **payment_confirmed** - 입금 완료 확인
   - 변수: `company_name`, `amount`, `confirmed_at`, `campaign_title`, `campaign_url`

5. **tax_invoice_issued** - 세금계산서 발행 완료
   - 변수: `company_name`, `invoice_date`, `supply_amount`, `tax_amount`, `total_amount`, `invoice_url`

6. **creator_selection_reminder** - 크리에이터 선정 요청
   - 변수: `company_name`, `campaign_title`, `days_left`, `end_date`, `target_creators`, `applicants_count`, `campaign_url`

7. **guide_review_request** - 가이드 검토 요청
   - 변수: `company_name`, `campaign_title`, `creator_name`, `created_at`, `guide_url`

8. **video_review_request** - 영상 검토 요청
   - 변수: `company_name`, `campaign_title`, `creator_name`, `uploaded_at`, `revision_deadline`, `video_url`

9. **report_ready** - 캠페인 보고서 확인 요청
   - 변수: `company_name`, `campaign_title`, `total_views`, `total_likes`, `total_comments`, `creators_count`, `report_url`

10. **points_charged** - 포인트 충전 완료
    - 변수: `company_name`, `amount`, `points`, `balance`, `dashboard_url`

### 3. 관리자 UI (SiteManagement)
**위치:** 관리자 페이지 → 사이트 관리 → 이메일 템플릿 탭

**기능:**
- ✅ 기업용/크리에이터용 템플릿 전환 버튼
- ✅ 템플릿 목록 표시 (제목, 키, 활성화 상태)
- ✅ 템플릿 수정 기능
  - 제목 수정
  - HTML 본문 수정 (Textarea with monospace font)
  - 활성화/비활성화 토글
- ✅ 사용 가능한 변수 표시 ({{variable_name}} 형식)
- ✅ 크리에이터용 템플릿: "추후 추가 예정" 메시지

### 4. 이메일 발송 API
**Netlify Function:** `send-template-email.js`

**엔드포인트:** `/.netlify/functions/send-template-email`

**요청 형식:**
```javascript
{
  "templateKey": "signup_welcome",
  "to": "user@example.com",
  "variables": {
    "company_name": "회사명",
    "dashboard_url": "https://cnecbiz.com/dashboard"
  }
}
```

**응답 형식:**
```javascript
{
  "success": true,
  "message": "이메일이 성공적으로 발송되었습니다."
}
```

**기능:**
- ✅ 템플릿 키로 템플릿 조회
- ✅ 활성화된 템플릿만 사용
- ✅ 변수 치환 ({{variable}} → 실제 값)
- ✅ Gmail SMTP 설정 사용
- ✅ HTML 이메일 발송

## 📝 사용 예시

### 1. 회원가입 환영 이메일 발송
```javascript
// 회원가입 완료 후
const response = await fetch('/.netlify/functions/send-template-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateKey: 'signup_welcome',
    to: user.email,
    variables: {
      company_name: user.company_name,
      dashboard_url: 'https://cnecbiz.com/dashboard'
    }
  })
});
```

### 2. 캠페인 작성 완료 이메일
```javascript
// 캠페인 작성 완료 후
const response = await fetch('/.netlify/functions/send-template-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateKey: 'campaign_created',
    to: company.email,
    variables: {
      company_name: company.name,
      campaign_title: campaign.title,
      package_type: campaign.package_type,
      total_amount: campaign.total_amount.toLocaleString(),
      campaign_url: `https://cnecbiz.com/campaigns/${campaign.id}`
    }
  })
});
```

### 3. 입금 완료 확인 이메일
```javascript
// 관리자가 입금 확인 후
const response = await fetch('/.netlify/functions/send-template-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateKey: 'payment_confirmed',
    to: company.email,
    variables: {
      company_name: company.name,
      amount: payment.amount.toLocaleString(),
      confirmed_at: new Date().toLocaleDateString('ko-KR'),
      campaign_title: campaign.title,
      campaign_url: `https://cnecbiz.com/campaigns/${campaign.id}`
    }
  })
});
```

## 🔧 통합 가이드

### 1. 회원가입 시 이메일 발송
**파일:** `netlify/functions/complete-signup.js`

```javascript
// 회원가입 완료 후 추가
await fetch('/.netlify/functions/send-template-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateKey: 'signup_welcome',
    to: email,
    variables: {
      company_name: companyName,
      dashboard_url: `${process.env.URL}/dashboard`
    }
  })
});
```

### 2. 캠페인 생성 시 이메일 발송
**파일:** `src/pages/company/CampaignCreation.jsx`

```javascript
// 캠페인 생성 성공 후
const handleSubmit = async () => {
  // ... 캠페인 생성 로직 ...
  
  if (success) {
    // 이메일 발송
    await fetch('/.netlify/functions/send-template-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey: 'campaign_created',
        to: user.email,
        variables: {
          company_name: user.company_name,
          campaign_title: campaignData.title,
          package_type: campaignData.package_type,
          total_amount: campaignData.total_amount.toLocaleString(),
          campaign_url: `${window.location.origin}/campaigns/${newCampaign.id}`
        }
      })
    });
  }
};
```

### 3. 입금 확인 시 이메일 발송
**파일:** `netlify/functions/confirm-payment.js`

```javascript
// 입금 확인 후 추가
await fetch('/.netlify/functions/send-template-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateKey: 'payment_confirmed',
    to: company.email,
    variables: {
      company_name: company.name,
      amount: payment.amount.toLocaleString(),
      confirmed_at: new Date().toLocaleDateString('ko-KR'),
      campaign_title: campaign.title,
      campaign_url: `${process.env.URL}/campaigns/${campaign.id}`
    }
  })
});
```

## 🚀 다음 단계 권장사항

### 1. 이메일 발송 로그 테이블 생성
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. 크리에이터용 이메일 템플릿 추가
- 캠페인 선정 알림
- 가이드 수신 알림
- 영상 업로드 요청
- 수정 요청 알림
- 보상 지급 완료

### 3. 이메일 미리보기 기능
- 관리자 페이지에서 템플릿 미리보기
- 변수 입력 후 실제 렌더링 확인

### 4. 이메일 발송 스케줄링
- 크리에이터 선정 마감 3일 전 자동 알림
- 영상 업로드 마감 1일 전 자동 알림

### 5. 이메일 발송 통계
- 발송 성공/실패율
- 템플릿별 발송 횟수
- 수신자별 발송 이력

## 📂 파일 구조
```
cnecbiz/
├── netlify/functions/
│   ├── send-template-email.js  (NEW)
│   └── send-test-email.js
├── src/
│   └── components/admin/
│       └── SiteManagement.jsx  (MODIFIED)
└── EMAIL_TEMPLATE_SYSTEM.md  (NEW)
```

## 🔐 환경 변수 (Netlify)
- `VITE_SUPABASE_BIZ_URL`: Supabase URL
- `VITE_SUPABASE_BIZ_ANON_KEY`: Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (RLS 우회용)

## 📊 데이터베이스 마이그레이션
```sql
-- email_templates 테이블 생성
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL CHECK (template_type IN ('company', 'creator')),
  template_key TEXT NOT NULL,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_type, template_key)
);

-- RLS 활성화
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "Anyone can read email templates" ON email_templates FOR SELECT USING (true);
CREATE POLICY "Admins can update email templates" ON email_templates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email())
);
CREATE POLICY "Admins can insert email templates" ON email_templates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email())
);
CREATE POLICY "Admins can delete email templates" ON email_templates FOR DELETE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = auth.email())
);
```

## 🎉 완료!
이메일 템플릿 시스템이 성공적으로 구축되었습니다. 이제 관리자가 템플릿을 관리하고, 자동으로 이메일을 발송할 수 있습니다.

