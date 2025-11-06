# 팝빌 카카오톡 알림톡 사용 가이드

## 개요

크넥(CNEC) 플랫폼에서 팝빌 API를 사용하여 카카오톡 알림톡을 전송하는 기능이 구현되었습니다.

## 템플릿 분류

### 기업용 (@크넥) - 11개 템플릿

1. **회원가입** (25100000912)
2. **캠페인 신청 및 입금 안내** (25100000918)
3. **포인트 충전 완료** (25100000943) - 통합됨
4. **캠페인 승인 및 모집 시작** (25100001005)
5. **모집 마감 크리에이터 선정 요청** (25100001006)
6. **크리에이터 가이드 제출 검수 요청** (25100001007)
7. **영상 촬영 완료 검수 요청** (25100001008)
8. **최종 영상 완료 보고서 확인 요청** (25100001009)
9. **캠페인 검수 신청** (25100001010)

### 크리에이터용 (@크넥_크리에이터) - 12개 템플릿

1. **크리에이터 회원가입** (25100001022)
2. **캠페인 선정 완료** (25100001011)
3. **촬영 가이드 전달 알림** (25100001012)
4. **영상 제출 기한 3일 전 안내** (25100001013)
5. **영상 제출 기한 2일 전 안내** (25100001014)
6. **영상 제출 기한 당일 안내** (25100001015)
7. **영상 수정 요청 알림** (25100001016)
8. **영상 승인 완료** (25100001017)
9. **캠페인 완료 포인트 지급 알림** (25100001018)
10. **출금 접수 완료** (25100001019)
11. **출금 완료 알림** (25100001020)
12. **캠페인 제출 기한 지연** (25100001021)

## 환경변수 설정

`.env` 파일에 다음 환경변수를 추가해야 합니다:

```env
# Popbill Configuration
VITE_POPBILL_LINK_ID=your_popbill_link_id
VITE_POPBILL_SECRET_KEY=your_popbill_secret_key
VITE_POPBILL_CORP_NUM=your_corp_num_without_dash
VITE_POPBILL_SENDER_NUM=your_sender_num
VITE_POPBILL_IS_TEST=true
```

### 환경변수 설명

- `VITE_POPBILL_LINK_ID`: 팝빌 링크 아이디 (연동신청 시 발급)
- `VITE_POPBILL_SECRET_KEY`: 팝빌 비밀키 (연동신청 시 발급)
- `VITE_POPBILL_CORP_NUM`: 사업자번호 (하이픈 없이 10자리)
- `VITE_POPBILL_SENDER_NUM`: 발신번호 (팝빌에 사전 등록된 번호)
- `VITE_POPBILL_IS_TEST`: 테스트 모드 여부 (true: 테스트, false: 운영)

## 사전 준비사항

### 1. 팝빌 연동신청

1. [팝빌 연동신청](https://www.popbill.com) 페이지에서 연동신청
2. API Key (LinkID, SecretKey) 발급 받기
3. 테스트 포인트 신청 (무료)

### 2. 비즈니스 채널 등록

카카오톡 알림톡 전송을 위해서는 비즈니스 채널이 필요합니다.

1. [카카오 비즈니스](https://business.kakao.com/) 사이트에서 비즈니스 채널 생성
2. 사업자 인증 완료
3. 팝빌 테스트 사이트에서 비즈니스 채널 등록
   - https://test.popbill.com > 카카오톡 > 관리 > 비즈니스 채널 관리

### 3. 발신번호 사전등록

1. 팝빌 테스트 사이트에서 발신번호 등록
   - https://test.popbill.com > 카카오톡 > 관리 > 발신번호 관리
2. 본인 인증 완료

### 4. 알림톡 템플릿 신청

각 템플릿 코드에 해당하는 알림톡 템플릿을 카카오에 신청하고 승인받아야 합니다.

1. 팝빌 사이트에서 알림톡 템플릿 신청
2. 카카오 검수 대기 (1~2일 소요)
3. 승인 완료 후 전송 가능

## 사용 방법

### 1. 기본 사용법

```javascript
import { sendCompanySignupNotification } from '@/services/notifications';

// 기업 회원가입 알림 전송
await sendCompanySignupNotification(
  '01012345678',  // 수신번호
  '홍길동',        // 수신자 이름
  '크넥코리아'     // 회사명
);
```

### 2. 기업용 알림 예시

#### 캠페인 승인 알림

```javascript
import { sendCampaignApprovedNotification } from '@/services/notifications';

await sendCampaignApprovedNotification(
  '01012345678',
  '홍길동',
  {
    companyName: '크넥코리아',
    campaignName: '신제품 런칭 캠페인',
    startDate: '2025-11-10',
    endDate: '2025-11-20',
    recruitCount: '10'
  }
);
```

#### 영상 제출 알림

```javascript
import { sendVideoSubmittedNotification } from '@/services/notifications';

await sendVideoSubmittedNotification(
  '01012345678',
  '홍길동',
  {
    companyName: '크넥코리아',
    campaignName: '신제품 런칭 캠페인',
    creatorName: '김크리에이터'
  }
);
```

### 3. 크리에이터용 알림 예시

#### 캠페인 선정 알림

```javascript
import { sendCampaignSelectedNotification } from '@/services/notifications';

await sendCampaignSelectedNotification(
  '01087654321',
  '김크리에이터',
  {
    creatorName: '김크리에이터',
    campaignName: '신제품 런칭 캠페인'
  }
);
```

#### 영상 제출 기한 리마인더

```javascript
import { sendVideoDeadline3DaysNotification } from '@/services/notifications';

await sendVideoDeadline3DaysNotification(
  '01087654321',
  '김크리에이터',
  {
    creatorName: '김크리에이터',
    campaignName: '신제품 런칭 캠페인',
    deadline: '2025-11-15 23:59'
  }
);
```

#### 출금 완료 알림

```javascript
import { sendWithdrawalCompletedNotification } from '@/services/notifications';

await sendWithdrawalCompletedNotification(
  '01087654321',
  '김크리에이터',
  {
    creatorName: '김크리에이터',
    depositDate: '2025-11-06'
  }
);
```

### 4. 직접 팝빌 API 사용

헬퍼 함수 없이 직접 팝빌 API를 사용할 수도 있습니다.

```javascript
import { sendAlimtalk } from '@/services/notifications';

await sendAlimtalk({
  templateCode: '25100001005',
  receiverNum: '01012345678',
  receiverName: '홍길동',
  templateParams: {
    '회사명': '크넥코리아',
    '캠페인명': '신제품 런칭 캠페인',
    '시작일': '2025-11-10',
    '마감일': '2025-11-20',
    '모집인원': '10'
  },
  senderNum: '070-1234-5678',  // 선택 (기본값: 환경변수)
  altContent: '대체문자 내용',   // 선택
  requestNum: 'REQ20251106001'  // 선택 (요청번호)
});
```

### 5. 대량 전송

여러 수신자에게 동시에 알림을 전송할 수 있습니다.

```javascript
import { sendBulkAlimtalk } from '@/services/notifications';

await sendBulkAlimtalk({
  templateCode: '25100001005',
  receivers: [
    {
      num: '01012345678',
      name: '홍길동',
      templateParams: {
        '회사명': '크넥코리아',
        '캠페인명': '신제품 런칭 캠페인',
        '시작일': '2025-11-10',
        '마감일': '2025-11-20',
        '모집인원': '10'
      }
    },
    {
      num: '01087654321',
      name: '김영희',
      templateParams: {
        '회사명': '테스트기업',
        '캠페인명': '브랜드 홍보 캠페인',
        '시작일': '2025-11-12',
        '마감일': '2025-11-22',
        '모집인원': '5'
      }
    }
  ]
});
```

## 통합 지점

### 1. 회원가입 시

```javascript
// src/pages/auth/SignUp.jsx 또는 회원가입 처리 함수

import { sendCompanySignupNotification, sendCreatorSignupNotification } from '@/services/notifications';

async function handleSignup(userData) {
  // ... 회원가입 로직 ...
  
  // 기업 회원인 경우
  if (userData.userType === 'company') {
    await sendCompanySignupNotification(
      userData.phone,
      userData.name,
      userData.companyName
    );
  }
  
  // 크리에이터 회원인 경우
  if (userData.userType === 'creator') {
    await sendCreatorSignupNotification(
      userData.phone,
      userData.name,
      userData.name
    );
  }
}
```

### 2. 캠페인 승인 시

```javascript
// src/pages/admin/CampaignReview.jsx 또는 캠페인 승인 처리 함수

import { sendCampaignApprovedNotification } from '@/services/notifications';

async function handleCampaignApproval(campaign) {
  // ... 캠페인 승인 로직 ...
  
  await sendCampaignApprovedNotification(
    campaign.company_phone,
    campaign.company_contact_name,
    {
      companyName: campaign.company_name,
      campaignName: campaign.title,
      startDate: campaign.recruitment_start_date,
      endDate: campaign.recruitment_end_date,
      recruitCount: campaign.recruit_count
    }
  );
}
```

### 3. 크리에이터 선정 시

```javascript
// src/pages/company/CreatorSelection.jsx 또는 선정 처리 함수

import { sendCampaignSelectedNotification } from '@/services/notifications';

async function handleCreatorSelection(selectedCreators, campaign) {
  // ... 크리에이터 선정 로직 ...
  
  for (const creator of selectedCreators) {
    await sendCampaignSelectedNotification(
      creator.phone,
      creator.name,
      {
        creatorName: creator.name,
        campaignName: campaign.title
      }
    );
  }
}
```

### 4. 영상 제출 시

```javascript
// src/pages/creator/VideoSubmission.jsx 또는 영상 제출 처리 함수

import { sendVideoSubmittedNotification } from '@/services/notifications';

async function handleVideoSubmission(submission, campaign) {
  // ... 영상 제출 로직 ...
  
  await sendVideoSubmittedNotification(
    campaign.company_phone,
    campaign.company_contact_name,
    {
      companyName: campaign.company_name,
      campaignName: campaign.title,
      creatorName: submission.creator_name
    }
  );
}
```

### 5. 영상 승인 시

```javascript
// src/pages/company/VideoReview.jsx 또는 영상 승인 처리 함수

import { sendVideoApprovedNotification } from '@/services/notifications';

async function handleVideoApproval(submission, campaign) {
  // ... 영상 승인 로직 ...
  
  await sendVideoApprovedNotification(
    submission.creator_phone,
    submission.creator_name,
    {
      creatorName: submission.creator_name,
      campaignName: campaign.title,
      uploadDeadline: campaign.upload_deadline
    }
  );
}
```

### 6. 출금 신청 시

```javascript
// src/pages/creator/Withdrawal.jsx 또는 출금 처리 함수

import { sendWithdrawalRequestedNotification, sendWithdrawalCompletedNotification } from '@/services/notifications';

async function handleWithdrawalRequest(withdrawal, creator) {
  // ... 출금 신청 로직 ...
  
  await sendWithdrawalRequestedNotification(
    creator.phone,
    creator.name,
    {
      creatorName: creator.name,
      amount: withdrawal.amount,
      requestDate: new Date().toLocaleDateString('ko-KR')
    }
  );
}

async function handleWithdrawalComplete(withdrawal, creator) {
  // ... 출금 완료 로직 ...
  
  await sendWithdrawalCompletedNotification(
    creator.phone,
    creator.name,
    {
      creatorName: creator.name,
      depositDate: new Date().toLocaleDateString('ko-KR')
    }
  );
}
```

## 스케줄링 (자동 리마인더)

영상 제출 기한 리마인더는 스케줄러를 통해 자동으로 전송할 수 있습니다.

### Supabase Edge Function 예시

```javascript
// supabase/functions/send-deadline-reminders/index.ts

import { sendVideoDeadline3DaysNotification } from '@/services/notifications';

Deno.serve(async (req) => {
  // 3일 후가 마감인 캠페인 조회
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, participants(*)')
    .eq('status', 'in_progress')
    .gte('video_deadline', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())
    .lte('video_deadline', new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString());
  
  for (const campaign of campaigns) {
    for (const participant of campaign.participants) {
      await sendVideoDeadline3DaysNotification(
        participant.phone,
        participant.name,
        {
          creatorName: participant.name,
          campaignName: campaign.title,
          deadline: campaign.video_deadline
        }
      );
    }
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## 에러 처리

```javascript
import { sendCampaignApprovedNotification } from '@/services/notifications';

try {
  await sendCampaignApprovedNotification(
    '01012345678',
    '홍길동',
    campaignData
  );
  console.log('알림톡 전송 성공');
} catch (error) {
  console.error('알림톡 전송 실패:', error);
  // 에러 처리 로직 (로그 저장, 관리자 알림 등)
}
```

## 운영 환경 전환

테스트가 완료되면 운영 환경으로 전환합니다.

1. 팝빌 운영 전환 신청
2. 환경변수 변경
   ```env
   VITE_POPBILL_IS_TEST=false
   ```
3. 운영 환경 비즈니스 채널 및 발신번호 등록
4. 운영 환경 포인트 충전

## 주의사항

1. **템플릿 승인**: 알림톡 템플릿은 카카오 승인이 필요하며, 승인 전에는 전송할 수 없습니다.
2. **발신번호 등록**: 팝빌에 사전 등록된 발신번호만 사용 가능합니다.
3. **비즈니스 채널**: 사업자 인증이 완료된 비즈니스 채널이 필요합니다.
4. **포인트**: 알림톡 전송 시 포인트가 차감되므로 충분한 포인트를 보유해야 합니다.
5. **개인정보**: 수신자 전화번호는 개인정보이므로 안전하게 관리해야 합니다.
6. **대체문자**: 알림톡 전송 실패 시 대체문자(SMS/LMS)로 전송되므로 대체문자 내용을 작성하는 것이 좋습니다.

## 문의

팝빌 API 관련 문의: 1600-8536  
팝빌 파트너센터: support@linkhubcorp.com
