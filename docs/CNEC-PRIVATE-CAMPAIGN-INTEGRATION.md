# cnec.co.kr 비공개 캠페인 연동 가이드

## 개요

cnecbiz.com에서 패키지 캠페인을 생성하면 `is_private: true`로 설정됩니다.
cnec.co.kr(크리에이터 플랫폼)에서는 이 캠페인을 일반 목록에 노출하지 않고,
초대장을 통해서만 크리에이터가 접근할 수 있어야 합니다.

---

## 1. cnec.co.kr에서 구현해야 할 사항

### 1-1. 캠페인 목록에서 비공개 캠페인 제외

캠페인 목록 조회 시 `is_private = true`인 캠페인을 필터링합니다.

```javascript
// 캠페인 목록 조회 시
const { data: campaigns } = await supabaseKorea
  .from('campaigns')
  .select('*')
  .eq('status', 'active')
  .neq('is_private', true)  // 비공개 캠페인 제외
  .order('created_at', { ascending: false })
```

### 1-2. 초대장 랜딩 페이지 (이미 구현됨)

cnecbiz.com의 `/invitation/:id` 페이지가 이미 존재합니다.
크리에이터가 초대장 링크를 받으면 이 페이지에서 캠페인 정보를 확인하고 승인/거절할 수 있습니다.

**기존 플로우 (그대로 사용):**
1. 기업이 캠페인 상세 페이지에서 크리에이터를 선택하여 초대장 발송
2. `send-creator-invitation` 함수가 `campaign_invitations` 레코드 생성 + 카카오/이메일 발송
3. 크리에이터가 `/invitation/:invitationId` 페이지에서 수락/거절
4. `apply-from-invitation` 함수가 `applications` 테이블에 `source: 'invitation'`, `status: 'selected'`로 생성

### 1-3. 크리에이터 마이페이지에서 비공개 캠페인 표시

초대받은 비공개 캠페인은 크리에이터 마이페이지에서 볼 수 있어야 합니다.

```javascript
// 크리에이터 마이페이지 - 참여 중인 캠페인 조회
const { data: myApplications } = await supabaseKorea
  .from('applications')
  .select('*, campaigns(*)')
  .eq('user_id', userId)

// 비공개 캠페인도 내가 참여 중이면 표시됨 (campaigns 조인이므로 자동)
```

---

## 2. 캠페인 진행 플로우 (기획형과 동일)

패키지 캠페인은 `campaign_type: 'planned'`로 생성되므로, 기존 기획형 캠페인과 동일한 플로우를 탑니다:

### 전체 플로우
```
1. 기업이 캠페인 개설 (is_private: true, campaign_type: 'planned')
2. 가이드 작성 (AI 가이드 또는 PDF 업로드)
3. 캠페인 확인 및 결제 (계좌이체/세금계산서)
4. 관리자 승인 → 캠페인 활성화 (status: 'active')
5. 크리에이터 초대장 발송 (기업 or 관리자)
6. 크리에이터 승인/거절
7. 배송 정보 입력 (기업 → 크리에이터 주소로 제품 배송)
8. 크리에이터 영상 촬영
9. 영상 제출 (크리에이터)
10. 영상 검수 및 수정 요청 (기업)
11. 수정본 제출 (크리에이터)
12. 최종 승인 → SNS 업로드
13. 업로드 URL 전달 + 클린본 + 광고코드 전달
14. 캠페인 완료
```

### 각 단계별 데이터 흐름

#### 배송정보
- 크리에이터가 초대 수락 시 배송 주소 입력 (`applications.shipping_address`)
- 기업이 CampaignDetail에서 배송 정보 확인

#### 촬영 가이드
- AI 가이드: `campaign_guides` 테이블 (AI 자동 생성)
- PDF 가이드: 기업이 직접 업로드 → `campaigns.guide_file_url`

#### 영상 제출/수정
- `content_submissions` 또는 `applications` 테이블의 관련 필드
- 기업이 CampaignDetail에서 영상 확인/수정요청

#### SNS 업로드 URL + 클린본 + 광고코드
- `applications.sns_url` - SNS 업로드 URL
- `applications.clean_video_url` - 클린본 URL
- `campaigns.ad_code` 또는 `campaigns.partnership_code` - 광고코드

---

## 3. DB 스키마 변경 사항

### Korea DB - campaigns 테이블
```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
```

### BIZ DB - package_settings 테이블
```sql
ALTER TABLE package_settings ADD COLUMN IF NOT EXISTS display_remaining_slots INTEGER;
ALTER TABLE package_settings ADD COLUMN IF NOT EXISTS display_max_slots INTEGER;
```

### BIZ DB - package_applications 테이블
```sql
ALTER TABLE package_applications ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;
ALTER TABLE package_applications ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
```

---

## 4. cnec.co.kr 구현 프롬프트

아래 프롬프트를 cnec.co.kr 프로젝트에서 사용하세요:

---

### 프롬프트: cnec.co.kr 비공개 캠페인 필터링

```
cnec.co.kr 크리에이터 플랫폼에서 비공개 캠페인 처리를 구현해주세요.

## 배경
- cnecbiz.com에서 패키지 캠페인을 생성하면 Korea DB campaigns 테이블에
  `is_private: true`로 저장됩니다.
- 비공개 캠페인은 일반 캠페인 목록에 노출되면 안 됩니다.
- 크리에이터는 초대장을 통해서만 비공개 캠페인에 참여할 수 있습니다.

## 구현 사항

### 1. 캠페인 목록 페이지
- 캠페인 목록 조회 시 `is_private = true`인 캠페인을 제외하세요.
- 쿼리: `.neq('is_private', true)` 또는 `.or('is_private.is.null,is_private.eq.false')`

### 2. 캠페인 상세 페이지
- is_private 캠페인에 직접 URL로 접근하는 경우:
  - 해당 크리에이터가 이미 초대받은 경우 → 정상 표시
  - 초대받지 않은 경우 → "비공개 캠페인입니다" 메시지 표시, 지원 버튼 비활성화

### 3. 크리에이터 마이페이지/대시보드
- 초대받은 비공개 캠페인은 "내 캠페인"에서 정상 표시
- 비공개 배지 표시 (선택사항)

### 4. 초대장 처리
- 초대장 URL: https://cnecbiz.com/invitation/{invitationId}
  (cnecbiz.com에서 이미 처리됨, cnec.co.kr에서 별도 구현 불필요)
- 크리에이터가 초대를 수락하면 applications 테이블에
  source='invitation', status='selected'로 자동 생성됨

### 5. 캠페인 진행 (기존 기획형과 동일)
- 비공개 캠페인의 진행 플로우는 기존 기획형(planned) 캠페인과 완전히 동일합니다.
- 배송정보 → 가이드 → 영상제출 → 수정요청 → 승인 → SNS 업로드 플로우 그대로 사용

## 기술 참고
- DB: Korea Supabase의 campaigns 테이블
- 새 컬럼: is_private (BOOLEAN, DEFAULT false)
- 기존에 없는 캠페인은 is_private = null 또는 false (기존 캠페인 영향 없음)
```

---

## 5. 포인트 관리

패키지 캠페인의 크리에이터 포인트는 cnecbiz.com 관리자가 설정합니다.

- 캠페인 생성 시 `reward_points` 필드에 포인트 금액 설정
- 관리자가 `/admin/campaigns` 에서 캠페인 수정 가능
- 포인트 지급은 기존 시스템 그대로: 캠페인 완료 시 자동 지급 또는 관리자 수동 지급
