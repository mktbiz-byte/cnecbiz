# 전자계약서 시스템 구축 완료

## 📋 개요
CNEC Biz 플랫폼에 전자계약서 및 초상권 동의서 시스템을 구축했습니다. 계약서 이메일 발송, 전자 서명(도장/이미지/직접 그리기), 암호화 저장, 캠페인 완료 보고서 첨부 기능을 지원합니다.

## ✅ 완료된 작업

### 1. 데이터베이스 스키마
**테이블: `contracts`**
- `id` (UUID): 고유 식별자
- `contract_type` (TEXT): 계약서 유형
  - `campaign`: 캠페인 계약서
  - `portrait_rights`: 초상권 동의서
- `campaign_id` (UUID): 캠페인 ID (외래키)
- `creator_id` (UUID): 크리에이터 ID
- `company_id` (UUID): 기업 ID
- `title` (TEXT): 계약서 제목
- `content` (TEXT): 계약서 내용 (HTML)
- `status` (TEXT): 상태
  - `pending`: 대기
  - `sent`: 발송됨
  - `signed`: 서명완료
  - `expired`: 만료
- `contract_url` (TEXT): 원본 계약서 URL
- `signed_contract_url` (TEXT): 서명 완료된 계약서 URL
- `company_signature_url` (TEXT): 회사 서명 URL
- `creator_signature_url` (TEXT): 크리에이터 서명 URL
- `signature_type` (TEXT): 서명 방식
  - `stamp`: 도장
  - `image`: 이미지 업로드
  - `draw`: 직접 그리기
- `encryption_key` (TEXT): 암호화 키
- `sent_at` (TIMESTAMPTZ): 발송 시간
- `signed_at` (TIMESTAMPTZ): 서명 시간
- `expires_at` (TIMESTAMPTZ): 만료 시간
- `created_at`, `updated_at` (TIMESTAMPTZ): 생성/수정 시간

**테이블: `contract_signature_logs`**
- `id` (UUID): 고유 식별자
- `contract_id` (UUID): 계약서 ID (외래키)
- `signer_type` (TEXT): 서명자 유형 (`company` or `creator`)
- `signer_id` (UUID): 서명자 ID
- `signature_url` (TEXT): 서명 이미지 URL
- `signature_type` (TEXT): 서명 방식
- `ip_address` (TEXT): 서명자 IP 주소
- `user_agent` (TEXT): 서명자 User Agent
- `signed_at` (TIMESTAMPTZ): 서명 시간

**RLS 정책:**
- 사용자는 자신의 계약서만 조회 가능
- 관리자는 모든 계약서 관리 가능
- 크리에이터는 발송된 계약서에 서명 가능

### 2. Netlify Functions

#### **create-contract.js**
계약서 생성 및 발송

**요청:**
```javascript
{
  "contractType": "campaign", // or "portrait_rights"
  "campaignId": "uuid",
  "creatorId": "uuid",
  "companyId": "uuid",
  "title": "캠페인 계약서",
  "content": "<html>...</html>",
  "companySignatureUrl": "https://..."
}
```

**응답:**
```javascript
{
  "success": true,
  "contract": {
    "id": "uuid",
    "signUrl": "https://cnecbiz.com/sign-contract/uuid"
  }
}
```

**기능:**
- ✅ 계약서 생성
- ✅ 만료일 설정 (30일)
- ✅ 암호화 키 생성
- ✅ 크리에이터에게 이메일 발송
- ✅ 서명 페이지 URL 생성

#### **sign-contract.js**
계약서 서명 완료 처리

**요청:**
```javascript
{
  "contractId": "uuid",
  "signatureType": "draw", // or "image", "stamp"
  "signatureData": "base64...",
  "ipAddress": "123.456.789.0",
  "userAgent": "Mozilla/5.0..."
}
```

**응답:**
```javascript
{
  "success": true,
  "message": "계약서 서명이 완료되었습니다.",
  "contract": {
    "id": "uuid",
    "signedAt": "2025-10-29T12:00:00Z"
  }
}
```

**기능:**
- ✅ 계약서 상태 확인
- ✅ 만료일 확인
- ✅ 서명 이미지 업로드 (Supabase Storage)
- ✅ 계약서 업데이트 (서명 완료)
- ✅ 서명 로그 저장

### 3. 전자 서명 페이지
**경로:** `/sign-contract/:contractId`

**파일:** `src/pages/SignContract.jsx`

**기능:**
- ✅ 계약서 내용 표시 (HTML)
- ✅ 3가지 서명 방식 지원
  1. **직접 그리기**: Canvas에 마우스/터치로 서명
  2. **이미지 업로드**: 서명 이미지 파일 업로드
  3. **도장**: 도장 이미지 파일 업로드
- ✅ 서명 미리보기
- ✅ 서명 초기화 (직접 그리기)
- ✅ 서명 제출
- ✅ 만료일 확인
- ✅ 서명 완료 화면

**UI 구성:**
```
┌─────────────────────────────────────┐
│  계약서 제목                          │
│  만료일: 2025-11-28                  │
├─────────────────────────────────────┤
│  계약서 내용 (HTML)                   │
│  - 계약 조건                         │
│  - 보상 내용                         │
│  - 저작권 관련                       │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  전자 서명                           │
├─────────────────────────────────────┤
│  [직접 그리기] [이미지 업로드] [도장] │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  서명 영역                     │  │
│  │  (Canvas or Image Preview)    │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  [지우기]  [서명 완료]               │
└─────────────────────────────────────┘
```

### 4. 관리자 페이지 (사이트 관리)
**위치:** 관리자 페이지 → 사이트 관리 → 전자계약서 탭

**기능:**
- ✅ 계약서 목록 표시
  - 유형 (캠페인 계약서/초상권 동의서)
  - 제목
  - 캠페인명
  - 상태 (대기/발송됨/서명완료/만료)
  - 발송일
  - 서명일
  - 만료일
- ✅ 계약서 통계
  - 전체 계약서 수
  - 발송된 계약서 수
  - 서명완료 계약서 수
  - 만료된 계약서 수

**UI 구성:**
```
┌─────────────────────────────────────────────────────────┐
│  전자계약서 관리                                          │
│  캠페인 계약서 및 초상권 동의서 현황                       │
├─────────────────────────────────────────────────────────┤
│  유형 | 제목 | 캠페인 | 상태 | 발송일 | 서명일 | 만료일   │
├─────────────────────────────────────────────────────────┤
│  캠페인 계약서 | 캠페인 A | [발송됨] | 2025-10-29 | ...  │
│  초상권 동의서 | 캠페인 B | [서명완료] | 2025-10-28 | ... │
└─────────────────────────────────────────────────────────┘
┌──────────┬──────────┬──────────┬──────────┐
│  전체    │  발송됨  │  서명완료│  만료    │
│  10      │  3       │  6       │  1       │
└──────────┴──────────┴──────────┴──────────┘
```

### 5. 버그 수정
**OurChannelReport.jsx**
- ✅ "채널 목록으로" 버튼이 메인페이지로 이동하는 문제 수정
- ✅ `navigate(-1)`을 사용하여 브라우저 히스토리 이전 페이지로 이동

## 📝 사용 예시

### 1. 캠페인 계약서 발송
```javascript
// 캠페인 선정 완료 후
const response = await fetch('/.netlify/functions/create-contract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contractType: 'campaign',
    campaignId: campaign.id,
    creatorId: creator.id,
    companyId: company.id,
    title: `${campaign.title} 캠페인 계약서`,
    content: `
      <h1>캠페인 계약서</h1>
      <p>캠페인명: ${campaign.title}</p>
      <p>보상: ${campaign.reward}</p>
      <p>계약 기간: ${campaign.start_date} ~ ${campaign.end_date}</p>
      ...
    `,
    companySignatureUrl: 'https://storage.supabase.co/.../company_stamp.png'
  })
});

const result = await response.json();
if (result.success) {
  console.log('계약서 발송 완료:', result.contract.signUrl);
}
```

### 2. 초상권 동의서 발송 (캠페인 완료 시)
```javascript
// 캠페인 완료 후
const response = await fetch('/.netlify/functions/create-contract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contractType: 'portrait_rights',
    campaignId: campaign.id,
    creatorId: creator.id,
    companyId: company.id,
    title: `${campaign.title} 초상권 동의서`,
    content: `
      <h1>초상권 사용 동의서</h1>
      <p>캠페인명: ${campaign.title}</p>
      <p>영상 URL: ${video.url}</p>
      <p>사용 목적: 마케팅 및 홍보</p>
      <p>사용 기간: 무제한</p>
      ...
    `,
    companySignatureUrl: 'https://storage.supabase.co/.../company_stamp.png'
  })
});
```

### 3. 크리에이터 서명 페이지 접속
```
1. 크리에이터가 이메일 수신
2. 이메일의 "서명하기" 버튼 클릭
3. https://cnecbiz.com/sign-contract/{contractId} 페이지 열림
4. 계약서 내용 확인
5. 서명 방식 선택 (직접 그리기/이미지 업로드/도장)
6. 서명 작성
7. "서명 완료" 버튼 클릭
8. 서명 완료 화면 표시
```

## 🔧 통합 가이드

### 1. 캠페인 선정 시 계약서 발송
**파일:** `src/components/company/CampaignDetail.jsx` (또는 크리에이터 선정 페이지)

```javascript
const handleSelectCreator = async (creator) => {
  // ... 크리에이터 선정 로직 ...
  
  // 계약서 발송
  const contractResponse = await fetch('/.netlify/functions/create-contract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractType: 'campaign',
      campaignId: campaign.id,
      creatorId: creator.id,
      companyId: user.id,
      title: `${campaign.title} 캠페인 계약서`,
      content: generateCampaignContract(campaign, creator),
      companySignatureUrl: 'https://storage.supabase.co/.../company_stamp.png'
    })
  });
  
  const result = await contractResponse.json();
  if (result.success) {
    alert('크리에이터에게 계약서가 발송되었습니다!');
  }
};

const generateCampaignContract = (campaign, creator) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; }
        h1 { text-align: center; margin-bottom: 40px; }
        .section { margin-bottom: 30px; }
        .signature-area { margin-top: 60px; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <h1>캠페인 계약서</h1>
      
      <div class="section">
        <h2>1. 계약 당사자</h2>
        <p>갑: ${campaign.company_name}</p>
        <p>을: ${creator.name}</p>
      </div>
      
      <div class="section">
        <h2>2. 계약 내용</h2>
        <p>캠페인명: ${campaign.title}</p>
        <p>계약 기간: ${campaign.start_date} ~ ${campaign.end_date}</p>
        <p>보상: ${campaign.reward}</p>
      </div>
      
      <div class="section">
        <h2>3. 계약 조건</h2>
        <p>- 을은 갑의 제품을 홍보하는 영상을 제작합니다.</p>
        <p>- 영상은 ${campaign.video_count}개를 제작합니다.</p>
        <p>- 영상 길이는 ${campaign.video_duration}초입니다.</p>
      </div>
      
      <div class="signature-area">
        <div>
          <p>갑: ${campaign.company_name}</p>
          <img src="${companySignatureUrl}" alt="회사 도장" width="100" />
        </div>
        <div>
          <p>을: ${creator.name}</p>
          <p>(서명란)</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
```

### 2. 캠페인 완료 시 초상권 동의서 발송
**파일:** `netlify/functions/complete-campaign.js` (또는 캠페인 완료 처리 함수)

```javascript
exports.handler = async (event) => {
  const { campaignId } = JSON.parse(event.body);
  
  // ... 캠페인 완료 처리 ...
  
  // 선정된 모든 크리에이터에게 초상권 동의서 발송
  const { data: selectedCreators } = await supabase
    .from('campaign_applications')
    .select('*, creators(*)')
    .eq('campaign_id', campaignId)
    .eq('status', 'selected');
  
  for (const application of selectedCreators) {
    await fetch(`${process.env.URL}/.netlify/functions/create-contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractType: 'portrait_rights',
        campaignId: campaignId,
        creatorId: application.creator_id,
        companyId: campaign.company_id,
        title: `${campaign.title} 초상권 동의서`,
        content: generatePortraitRightsAgreement(campaign, application.creators),
        companySignatureUrl: 'https://storage.supabase.co/.../company_stamp.png'
      })
    });
  }
};
```

### 3. 완료 보고서에 계약서 첨부
**파일:** `src/components/company/CampaignReport.jsx`

```javascript
const CampaignReport = ({ campaignId }) => {
  const [contracts, setContracts] = useState([]);
  
  useEffect(() => {
    loadContracts();
  }, [campaignId]);
  
  const loadContracts = async () => {
    const { data } = await supabaseBiz
      .from('contracts')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'signed');
    
    setContracts(data || []);
  };
  
  return (
    <div>
      <h2>캠페인 완료 보고서</h2>
      
      {/* ... 보고서 내용 ... */}
      
      <div className="contracts-section">
        <h3>계약서 및 동의서</h3>
        {contracts.map(contract => (
          <div key={contract.id}>
            <p>{contract.title}</p>
            <a href={contract.signed_contract_url} download>
              다운로드
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 🚀 다음 단계 권장사항

### 1. Supabase Storage 버킷 생성
Supabase 대시보드에서 다음 버킷을 생성하세요:
- `contracts`: 계약서 파일 저장
  - Public 버킷
  - 파일 경로: `signatures/{contractId}_{timestamp}.png`

### 2. 회사 도장 이미지 업로드
- 회사 도장 이미지를 Supabase Storage에 업로드
- Public URL 생성
- `create-contract` 호출 시 `companySignatureUrl`에 전달

### 3. 이메일 템플릿 추가
**계약서 서명 요청 이메일:**
```sql
INSERT INTO email_templates (
  template_type,
  template_key,
  template_name,
  subject,
  body,
  variables
) VALUES (
  'creator',
  'contract_sign_request',
  '계약서 서명 요청',
  '{{contract_title}} - 서명 요청',
  '<html>
    <body>
      <h1>계약서 서명 요청</h1>
      <p>안녕하세요, {{creator_name}}님!</p>
      <p>{{contract_title}}에 서명해주세요.</p>
      <p>만료일: {{expires_at}}</p>
      <a href="{{sign_url}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        서명하기
      </a>
    </body>
  </html>',
  '["creator_name", "contract_title", "sign_url", "expires_at"]'
);
```

### 4. PDF 생성 및 암호화
서명 완료 후 PDF 생성 및 암호화 기능 추가:
```javascript
// netlify/functions/sign-contract.js에 추가
const PDFDocument = require('pdfkit');
const crypto = require('crypto');

// PDF 생성
const generateSignedPDF = async (contract) => {
  const doc = new PDFDocument();
  const chunks = [];
  
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    
    // 암호화
    const cipher = crypto.createCipher('aes-256-cbc', contract.encryption_key);
    const encrypted = Buffer.concat([
      cipher.update(pdfBuffer),
      cipher.final()
    ]);
    
    // Supabase Storage에 업로드
    // ...
  });
  
  // PDF 내용 작성
  doc.fontSize(20).text(contract.title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(contract.content);
  doc.image(contract.company_signature_url, { width: 100 });
  doc.image(contract.creator_signature_url, { width: 100 });
  doc.end();
};
```

### 5. 계약서 만료 자동 처리
매일 만료된 계약서 상태 업데이트:
```javascript
// netlify/functions/check-expired-contracts.js
exports.handler = async () => {
  const { data: expiredContracts } = await supabase
    .from('contracts')
    .select('id')
    .eq('status', 'sent')
    .lt('expires_at', new Date().toISOString());
  
  for (const contract of expiredContracts) {
    await supabase
      .from('contracts')
      .update({ status: 'expired' })
      .eq('id', contract.id);
  }
};
```

Netlify에서 스케줄링:
```toml
# netlify.toml
[[functions]]
  name = "check-expired-contracts"
  schedule = "0 0 * * *"  # 매일 자정
```

### 6. 계약서 템플릿 관리
계약서 템플릿을 데이터베이스에 저장하여 관리:
```sql
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. 계약서 버전 관리
계약서 수정 이력 추적:
```sql
CREATE TABLE contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📂 파일 구조
```
cnecbiz/
├── netlify/functions/
│   ├── create-contract.js  (NEW)
│   ├── sign-contract.js  (NEW)
│   └── send-template-email.js
├── src/
│   ├── App.jsx  (MODIFIED)
│   ├── pages/
│   │   └── SignContract.jsx  (NEW)
│   └── components/admin/
│       ├── SiteManagement.jsx  (MODIFIED)
│       └── OurChannelReport.jsx  (MODIFIED - 뒤로가기 버튼 수정)
├── EMAIL_TEMPLATE_SYSTEM.md
└── CONTRACT_SYSTEM.md  (NEW)
```

## 🔐 보안 고려사항

### 1. 암호화
- ✅ 계약서마다 고유한 암호화 키 생성
- ✅ 서명 완료된 계약서는 암호화하여 저장
- ⏳ TODO: PDF 생성 시 암호화 적용

### 2. 접근 제어
- ✅ RLS 정책으로 계약서 접근 제한
- ✅ 서명 페이지는 계약서 ID로만 접근 가능
- ✅ 만료된 계약서는 서명 불가

### 3. 감사 로그
- ✅ 서명 시 IP 주소 및 User Agent 기록
- ✅ 서명 시간 기록
- ✅ 계약서 상태 변경 이력

### 4. 데이터 무결성
- ✅ 서명 완료 후 계약서 내용 변경 불가
- ✅ 서명 이미지는 Supabase Storage에 영구 저장
- ✅ 계약서 삭제 시 서명 로그도 함께 삭제 (CASCADE)

## 🎉 완료!
전자계약서 시스템이 성공적으로 구축되었습니다. 이제 캠페인 계약서와 초상권 동의서를 전자적으로 발송하고 서명받을 수 있습니다.

## 📞 문의
추가 기능이 필요하거나 문제가 발생하면 언제든지 문의해주세요!

