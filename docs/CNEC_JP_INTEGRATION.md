# cnec.jp 통합 가이드

## 개요

이 문서는 cnecbiz와 cnec.jp 사이트 간의 캠페인 연동 시 필요한 수정사항을 설명합니다.

---

## 1. 캠페인 타입 지원

### 새로운 캠페인 타입

cnec.jp에서 아래 3가지 캠페인 타입을 지원해야 합니다:

| 캠페인 타입 | campaign_type 값 | 설명 |
|------------|-----------------|------|
| 기획형 (企画型) | `regular` | 일반 캠페인 (1회 영상 제출) |
| 메가와리 (メガ割) | `megawari` | 2단계 캠페인 (step1, step2) |
| 4주 챌린지 (4週チャレンジ) | `4week_challenge` | 4주간 진행 (week1~week4) |

### DB 필드 추가 필요

```sql
-- campaigns 테이블에 추가해야 할 컬럼 (Japan Supabase)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'regular';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS guide_type TEXT DEFAULT 'manual'; -- 'manual', 'ai', 'pdf'
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS guide_pdf_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_guide JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step_guides JSONB;

-- 메가와리용 마감일 필드
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_deadline TIMESTAMP WITH TIME ZONE;

-- 4주 챌린지용 마감일 필드
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_deadline TIMESTAMP WITH TIME ZONE;

-- 일반 캠페인용 마감일 필드
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_deadline TIMESTAMP WITH TIME ZONE;

-- 광고코드/클린본 요구 필드
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS requires_ad_code BOOLEAN DEFAULT true;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS requires_clean_video BOOLEAN DEFAULT true;
```

---

## 2. 마이페이지 통합

### 크리에이터 마이페이지에서 표시해야 할 정보

#### 2.1 진행 중인 캠페인 표시

```javascript
// 캠페인 타입별 상태 표시
const getCampaignStatus = (campaign, application) => {
  const type = campaign.campaign_type;

  if (type === '4week_challenge') {
    // 4주 챌린지: 현재 주차 및 제출 상태 표시
    return {
      currentWeek: getCurrentWeek(campaign),
      submissions: [
        { week: 1, submitted: application.week1_submitted, deadline: campaign.week1_deadline },
        { week: 2, submitted: application.week2_submitted, deadline: campaign.week2_deadline },
        { week: 3, submitted: application.week3_submitted, deadline: campaign.week3_deadline },
        { week: 4, submitted: application.week4_submitted, deadline: campaign.week4_deadline }
      ]
    };
  } else if (type === 'megawari') {
    // 메가와리: 스텝1/스텝2 상태 표시
    return {
      step1: { submitted: application.step1_submitted, deadline: campaign.step1_deadline },
      step2: { submitted: application.step2_submitted, deadline: campaign.step2_deadline }
    };
  } else {
    // 기획형: 단일 제출 상태
    return {
      submitted: application.video_submitted,
      deadline: campaign.video_deadline
    };
  }
};
```

#### 2.2 영상 업로드 UI

```jsx
// 캠페인 타입별 업로드 폼
const VideoUploadForm = ({ campaign, application }) => {
  const type = campaign.campaign_type;

  if (type === '4week_challenge') {
    return (
      <div>
        {[1, 2, 3, 4].map(week => (
          <WeeklyUploadSection
            key={week}
            weekNumber={week}
            deadline={campaign[`week${week}_deadline`]}
            submitted={application[`week${week}_submitted`]}
            videoUrl={application[`week${week}_video_url`]}
          />
        ))}
      </div>
    );
  } else if (type === 'megawari') {
    return (
      <div>
        <StepUploadSection step={1} deadline={campaign.step1_deadline} />
        <StepUploadSection step={2} deadline={campaign.step2_deadline} />
      </div>
    );
  }

  return <SingleUploadSection deadline={campaign.video_deadline} />;
};
```

#### 2.3 가이드 확인 섹션

```jsx
// 캠페인 가이드 표시
const CampaignGuideSection = ({ campaign }) => {
  const guideType = campaign.guide_type;

  if (guideType === 'pdf') {
    return <PDFViewer url={campaign.guide_pdf_url} />;
  } else if (guideType === 'ai') {
    const type = campaign.campaign_type;
    if (type === '4week_challenge' || type === 'megawari') {
      return <MultiStepGuideViewer stepGuides={campaign.step_guides} />;
    }
    return <AIGuideViewer guide={campaign.ai_guide} />;
  }

  // 수동 작성 가이드
  return <ManualGuideViewer campaign={campaign} />;
};
```

---

## 3. 캠페인 신청 페이지 수정

### 3.1 캠페인 타입별 안내 문구

```javascript
const getCampaignTypeDescription = (type) => {
  const descriptions = {
    regular: {
      title: '企画型キャンペーン',
      description: '1回の動画提出で完了するキャンペーンです。',
      steps: ['ガイド確認', '動画撮影', '動画提出', 'SNS投稿', 'ポイント獲得']
    },
    megawari: {
      title: 'メガ割キャンペーン',
      description: '2段階に分けて動画を提出するキャンペーンです。',
      steps: [
        'ステップ1: 認知拡大動画',
        'ステップ2: セール促進動画',
        'ポイント獲得'
      ]
    },
    '4week_challenge': {
      title: '4週チャレンジ',
      description: '4週間にわたって毎週動画を投稿するキャンペーンです。',
      steps: [
        '第1週: 製品との出会い',
        '第2週: 使用開始',
        '第3週: 変化の実感',
        '第4週: 総まとめ'
      ]
    }
  };
  return descriptions[type] || descriptions.regular;
};
```

### 3.2 마감일 표시

```jsx
const DeadlineDisplay = ({ campaign }) => {
  const type = campaign.campaign_type;

  if (type === '4week_challenge') {
    return (
      <div className="space-y-2">
        <h4>提出期限</h4>
        {[1, 2, 3, 4].map(week => (
          <div key={week} className="flex justify-between">
            <span>第{week}週:</span>
            <span>{formatDate(campaign[`week${week}_deadline`])}</span>
          </div>
        ))}
      </div>
    );
  } else if (type === 'megawari') {
    return (
      <div className="space-y-2">
        <h4>提出期限</h4>
        <div className="flex justify-between">
          <span>ステップ1:</span>
          <span>{formatDate(campaign.step1_deadline)}</span>
        </div>
        <div className="flex justify-between">
          <span>ステップ2:</span>
          <span>{formatDate(campaign.step2_deadline)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between">
      <span>提出期限:</span>
      <span>{formatDate(campaign.video_deadline)}</span>
    </div>
  );
};
```

---

## 4. applications 테이블 수정

### 추가해야 할 필드

```sql
-- applications 테이블에 추가해야 할 컬럼
-- 4주 챌린지용
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week1_submitted BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week1_video_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week1_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week2_submitted BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week2_video_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week2_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week3_submitted BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week3_video_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week3_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week4_submitted BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week4_video_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week4_submitted_at TIMESTAMP WITH TIME ZONE;

-- 메가와리용
ALTER TABLE applications ADD COLUMN IF NOT EXISTS step1_submitted BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS step1_video_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS step1_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS step2_submitted BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS step2_video_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS step2_submitted_at TIMESTAMP WITH TIME ZONE;

-- 가이드 발송 상태
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guide_delivered BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guide_delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week1_guide_delivered BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week2_guide_delivered BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week3_guide_delivered BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week4_guide_delivered BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS step1_guide_delivered BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS step2_guide_delivered BOOLEAN DEFAULT false;

-- SNS URL 및 광고코드
ALTER TABLE applications ADD COLUMN IF NOT EXISTS sns_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ad_code TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS clean_video_url TEXT;
```

---

## 5. LINE 연동

### 5.1 LINE 메시지 수신을 위한 Webhook 설정

cnec.jp에서 LINE 메시지를 받으려면 LINE Bot Webhook을 설정해야 합니다:

1. LINE Developers Console에서 Webhook URL 설정
2. cnec.jp에서 Webhook 엔드포인트 생성
3. 메시지 수신 처리 로직 구현

### 5.2 cnecbiz에서 발송하는 LINE 메시지 유형

| 메시지 유형 | 설명 |
|------------|------|
| `selected` | 캠페인 선정 알림 |
| `guide_confirm_request` | 가이드 확인 요청 |
| `video_deadline_reminder` | 영상 제출 마감 알림 |
| `sns_upload_request` | SNS 업로드 요청 |
| `points_awarded` | 포인트 지급 완료 알림 |
| `weekly_challenge_reminder` | 주간 챌린지 알림 (4주 챌린지) |
| `megawari_step_reminder` | 메가와리 스텝 알림 |

---

## 6. API 연동 확인

### 6.1 cnecbiz에서 사용하는 Japan Supabase API

```javascript
// cnecbiz에서 Japan DB 접근
const supabaseJapan = createClient(
  process.env.VITE_SUPABASE_JAPAN_URL,
  process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY // Functions에서만
);

// 또는 Frontend에서
const supabaseJapan = createClient(
  import.meta.env.VITE_SUPABASE_JAPAN_URL,
  import.meta.env.VITE_SUPABASE_JAPAN_ANON_KEY
);
```

### 6.2 RLS (Row Level Security) 정책 확인

cnec.jp에서 크리에이터가 자신의 데이터만 접근할 수 있도록 RLS 정책을 설정해야 합니다:

```sql
-- 크리에이터는 자신의 applications만 조회 가능
CREATE POLICY "Creators can view own applications" ON applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 크리에이터는 자신의 applications만 업데이트 가능
CREATE POLICY "Creators can update own applications" ON applications
  FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 7. 테스트 체크리스트

### 캠페인 타입별 테스트

- [ ] 기획형 캠페인 생성 및 표시
- [ ] 메가와리 캠페인 생성 및 2단계 마감일 표시
- [ ] 4주 챌린지 캠페인 생성 및 4주 마감일 표시

### 마이페이지 테스트

- [ ] 진행 중인 캠페인 목록 표시
- [ ] 캠페인 타입별 제출 상태 표시
- [ ] 영상 업로드 기능 (각 타입별)
- [ ] 가이드 확인 (PDF/AI/수동)

### 알림 테스트

- [ ] LINE 선정 알림 수신
- [ ] LINE 가이드 발송 알림 수신
- [ ] LINE 마감일 알림 수신
- [ ] 이메일 알림 수신

---

## 8. 문의

개발 관련 문의사항은 cnecbiz 개발팀에 연락해주세요.
