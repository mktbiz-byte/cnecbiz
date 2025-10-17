import { supabaseBiz } from './supabaseClients'

// 팀 역할 정의
export const TEAM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
}

// 역할별 권한 정의
export const ROLE_PERMISSIONS = {
  owner: {
    canCreateCampaign: true,
    canEditCampaign: true,
    canDeleteCampaign: true,
    canViewCampaign: true,
    canManageTeam: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canChangeRoles: true,
    canManagePayment: true,
    canViewReports: true
  },
  admin: {
    canCreateCampaign: true,
    canEditCampaign: true,
    canDeleteCampaign: true,
    canViewCampaign: true,
    canManageTeam: false,
    canInviteMembers: true,
    canRemoveMembers: false,
    canChangeRoles: false,
    canManagePayment: true,
    canViewReports: true
  },
  member: {
    canCreateCampaign: false,
    canEditCampaign: true,
    canDeleteCampaign: false,
    canViewCampaign: true,
    canManageTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    canManagePayment: false,
    canViewReports: true
  },
  viewer: {
    canCreateCampaign: false,
    canEditCampaign: false,
    canDeleteCampaign: false,
    canViewCampaign: true,
    canManageTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    canManagePayment: false,
    canViewReports: true
  }
}

// 권한 확인
export const hasPermission = (role, permission) => {
  return ROLE_PERMISSIONS[role]?.[permission] || false
}

// 역할 이름
export const getRoleName = (role) => {
  const names = {
    owner: '소유자',
    admin: '관리자',
    member: '멤버',
    viewer: '뷰어'
  }
  return names[role] || role
}

export const getUserTeams = async (userId) => {
  const { data, error } = await supabaseBiz
    .from('team_members')
    .select('*, team:teams (*)')
    .eq('user_id', userId)

  if (error) throw error
  return data
}
