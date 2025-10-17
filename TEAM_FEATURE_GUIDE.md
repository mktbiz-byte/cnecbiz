# 팀 연계 기능 가이드

## 📋 개요

CNEC BIZ 플랫폼에 팀 협업 기능이 추가되었습니다. 여러 팀원이 함께 캠페인을 관리하고, 역할에 따라 권한을 제어할 수 있습니다.

## 🎯 주요 기능

### 1. 팀 생성 및 관리
- 기업 계정당 여러 팀 생성 가능
- 팀 이름, 설명 설정
- 팀 전환 기능

### 2. 팀원 초대
- 이메일로 팀원 초대
- 초대 링크 7일간 유효
- 초대 수락/거절

### 3. 역할 기반 권한 관리
4가지 역할:
- **Owner (소유자)**: 모든 권한
- **Admin (관리자)**: 캠페인 관리 및 결제
- **Member (멤버)**: 캠페인 조회 및 수정
- **Viewer (뷰어)**: 읽기 전용

### 4. 팀별 캠페인 관리
- 팀별로 캠페인 분리
- 팀원 모두 접근 가능
- 권한에 따라 작업 제한

## 🗂️ 데이터베이스 스키마

### teams 테이블
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### team_members 테이블
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

### team_invitations 테이블
```sql
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE
);
```

### campaigns 테이블 수정
```sql
ALTER TABLE campaigns ADD COLUMN team_id UUID REFERENCES teams(id);
```

## 👥 역할별 권한

| 기능 | Owner | Admin | Member | Viewer |
|------|-------|-------|--------|--------|
| 캠페인 생성 | ✅ | ✅ | ❌ | ❌ |
| 캠페인 수정 | ✅ | ✅ | ✅ | ❌ |
| 캠페인 삭제 | ✅ | ✅ | ❌ | ❌ |
| 캠페인 조회 | ✅ | ✅ | ✅ | ✅ |
| 결제 관리 | ✅ | ✅ | ❌ | ❌ |
| 보고서 조회 | ✅ | ✅ | ✅ | ✅ |
| 가이드 편집 | ✅ | ✅ | ✅ | ❌ |
| 영상 승인 | ✅ | ✅ | ❌ | ❌ |
| 팀원 초대 | ✅ | ✅ | ❌ | ❌ |
| 팀원 제거 | ✅ | ❌ | ❌ | ❌ |
| 역할 변경 | ✅ | ❌ | ❌ | ❌ |
| 팀 설정 | ✅ | ❌ | ❌ | ❌ |
| 팀 삭제 | ✅ | ❌ | ❌ | ❌ |

## 🔧 구현 상세

### 팀 생성 플로우
1. 사용자가 "팀 생성" 클릭
2. 팀 이름, 설명 입력
3. 팀 생성 시 자동으로 Owner 역할 부여
4. 팀 대시보드로 이동

### 팀원 초대 플로우
1. Owner/Admin이 "팀원 초대" 클릭
2. 이메일 주소 및 역할 선택
3. 초대 이메일 발송 (또는 초대 링크 생성)
4. 초대받은 사람이 링크 클릭
5. 로그인 후 초대 수락/거절
6. 수락 시 팀원으로 추가

### 팀 전환 플로우
1. 헤더에 현재 팀 표시
2. 팀 전환 드롭다운 클릭
3. 다른 팀 선택
4. 페이지 새로고침 (해당 팀의 데이터 로드)

### 권한 확인 플로우
```javascript
import { hasPermission, getUserRoleInTeam } from './lib/teamService'

// 컴포넌트에서 권한 확인
const userRole = await getUserRoleInTeam(teamId, userId)
const canCreate = hasPermission(userRole, 'canCreateCampaign')

if (!canCreate) {
  alert('캠페인을 생성할 권한이 없습니다.')
  return
}
```

## 🎨 UI 컴포넌트

### 1. TeamSwitcher (헤더)
```jsx
<TeamSwitcher 
  currentTeam={activeTeam}
  teams={userTeams}
  onSwitch={handleTeamSwitch}
/>
```

### 2. TeamManagementPage
- 팀 정보 표시
- 팀원 목록
- 팀원 초대 버튼
- 역할 변경 드롭다운
- 팀원 제거 버튼

### 3. TeamInvitePage
- 이메일 입력
- 역할 선택
- 초대 발송 버튼
- 대기 중인 초대 목록

### 4. TeamCreateModal
- 팀 이름 입력
- 팀 설명 입력
- 생성 버튼

## 🔐 보안 고려사항

### Row Level Security (RLS)
```sql
-- teams 테이블: 팀원만 조회 가능
CREATE POLICY "Team members can view their teams"
ON teams FOR SELECT
USING (
  id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- campaigns 테이블: 팀원만 조회 가능
CREATE POLICY "Team members can view team campaigns"
ON campaigns FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- campaigns 테이블: Owner/Admin만 생성 가능
CREATE POLICY "Owners and admins can create campaigns"
ON campaigns FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

## 📱 사용 시나리오

### 시나리오 1: 마케팅 팀
```
회사: ABC 코스메틱
팀: 마케팅팀

팀원:
- 김팀장 (Owner) - 전체 관리
- 이대리 (Admin) - 캠페인 생성 및 관리
- 박사원 (Member) - 가이드 작성 및 수정
- 최인턴 (Viewer) - 보고서 조회만
```

### 시나리오 2: 다중 브랜드 관리
```
회사: XYZ 그룹

팀 1: 브랜드 A 팀
- 캠페인 A-1, A-2, A-3

팀 2: 브랜드 B 팀
- 캠페인 B-1, B-2

팀 3: 글로벌 팀
- 캠페인 G-1 (일본/미국/대만 동시)
```

## 🚀 배포 전 체크리스트

- [ ] Supabase에서 teams, team_members, team_invitations 테이블 생성
- [ ] RLS 정책 설정
- [ ] campaigns 테이블에 team_id 컬럼 추가
- [ ] 이메일 발송 시스템 설정 (선택)
- [ ] 팀 전환 기능 테스트
- [ ] 권한 제어 테스트

## 💡 향후 개선 사항

- [ ] 팀 활동 로그 (누가 언제 무엇을 했는지)
- [ ] 팀별 통계 대시보드
- [ ] 팀 템플릿 (자주 사용하는 설정 저장)
- [ ] 팀 간 캠페인 복사
- [ ] 슬랙/디스코드 알림 연동
- [ ] 팀 아바타/로고 설정

---

**작성일**: 2025-10-17
**버전**: 1.0.0

