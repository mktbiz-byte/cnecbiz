import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2, Users, Mail, Shield } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function TeamManagement() {
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [newMember, setNewMember] = useState({ email: '', role: 'member' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
      fetchTeamMembers(companyData.id)
    }
  }

  const fetchTeamMembers = async (companyId) => {
    try {
      const { data, error } = await supabaseBiz
        .from('team_members')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTeamMembers(data)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleInvite = async () => {
    if (!newMember.email) {
      alert('이메일을 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabaseBiz
        .from('team_members')
        .insert({
          company_id: company.id,
          email: newMember.email,
          role: newMember.role,
          status: 'pending'
        })

      if (error) throw error

      alert('팀원 초대가 완료되었습니다')
      setNewMember({ email: '', role: 'member' })
      fetchTeamMembers(company.id)
    } catch (error) {
      console.error('Error inviting member:', error)
      alert('초대 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('team_members')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchTeamMembers(company.id)
    } catch (error) {
      console.error('Error removing member:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      member: 'bg-gray-100 text-gray-700'
    }
    const labels = {
      owner: '소유자',
      admin: '관리자',
      member: '멤버'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[role] || 'bg-gray-100 text-gray-700'}`}>
        {labels[role] || role}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-gray-100 text-gray-700'
    }
    const labels = {
      active: '활성',
      pending: '초대 대기',
      inactive: '비활성'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">팀 관리</h1>
        </div>

        {/* Invite Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>팀원 초대</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="이메일 주소"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                />
              </div>
              <select
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="member">멤버</option>
                <option value="admin">관리자</option>
              </select>
              <Button onClick={handleInvite} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                초대
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              초대된 팀원은 이메일로 초대 링크를 받게 됩니다
            </p>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card>
          <CardHeader>
            <CardTitle>팀원 목록 ({teamMembers.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                아직 팀원이 없습니다. 위에서 팀원을 초대해보세요!
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{member.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleBadge(member.role)}
                          {getStatusBadge(member.status)}
                        </div>
                      </div>
                    </div>
                    {member.role !== 'owner' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h3 className="font-medium mb-2">권한 안내</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>소유자:</strong> 모든 권한 (삭제 불가)</li>
                  <li>• <strong>관리자:</strong> 캠페인 생성/수정, 팀원 관리</li>
                  <li>• <strong>멤버:</strong> 캠페인 조회, 댓글 작성</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

