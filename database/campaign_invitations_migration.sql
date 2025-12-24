-- Campaign Invitations 테이블 컬럼 추가 마이그레이션
-- 크넥 추천 크리에이터 초대장 기능 지원

-- 1. invited_creator_id 컬럼 추가 (featured_creators 테이블 참조)
ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS invited_creator_id UUID;

-- 2. invited_by 컬럼 추가 (초대를 보낸 기업 user_id)
ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS invited_by UUID;

-- 3. expires_at 컬럼 추가 (초대 만료일)
ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 4. accepted_at 컬럼 추가 (수락 시간)
ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- 5. source 컬럼 추가 (초대 출처)
ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- 6. created_at 컬럼 추가 (없는 경우)
ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 7. status 기본값 설정
ALTER TABLE campaign_invitations
ALTER COLUMN status SET DEFAULT 'pending';

-- 8. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_campaign_id
ON campaign_invitations(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_invitations_invited_creator_id
ON campaign_invitations(invited_creator_id);

CREATE INDEX IF NOT EXISTS idx_campaign_invitations_invited_by
ON campaign_invitations(invited_by);

CREATE INDEX IF NOT EXISTS idx_campaign_invitations_status
ON campaign_invitations(status);

CREATE INDEX IF NOT EXISTS idx_campaign_invitations_expires_at
ON campaign_invitations(expires_at);

-- 9. applications 테이블에 invitation 관련 컬럼 추가
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct';

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS invitation_id UUID;

-- applications invitation_id 인덱스
CREATE INDEX IF NOT EXISTS idx_applications_invitation_id
ON applications(invitation_id);

-- 완료 메시지
SELECT 'Campaign invitations migration completed successfully' as status;
