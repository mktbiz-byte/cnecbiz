import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Shield, UserPlus, Trash2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function AdminManagement() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState([])
  const [newAdmin, setNewAdmin] = useState({ email: '', role: 'admin' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchAdmins()
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

    // Check if super admin
    const { data: adminData } = await supabaseBiz
      .from('admins')
      .select('*')
      .eq('email', user.email)
      .eq('role', 'super_admin')
      .single()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchAdmins = async () => {
    if (!supabaseBiz) return

    try {
      const { data, error } = await supabaseBiz
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAdmins(data)
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.email) {
      alert('이메일을 입력해주세요')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabaseBiz
        .from('admins')
        .insert({
          email: newAdmin.email,
          role: newAdmin.role,
          permissions: newAdmin.role === 'super_admin' 
            ? {
                manage_companies: true,
                manage_campaigns: true,
                manage_payments: true,
                manage_creators: true,
                manage_admins: true
              }
            : {
                manage_companies: true,
                manage_campaigns: true,
                manage_payments: true,
                manage_creators: true,
                manage_admins: false
              }
        })

      if (error) throw error

      alert('관리자가 추가되었습니다')
      setNewAdmin({ email: '', role: 'admin' })
      fetchAdmins()
    } catch (error) {
      console.error('Error adding admin:', error)
      alert('관리자 추가 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAdmin = async (id, email) => {
    if (email === 'mkt_biz@cnec.co.kr') {
      alert('메인 슈퍼 관리자는 삭제할 수 없습니다')
      return
    }

    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('admins')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('관리자가 삭제되었습니다')
      fetchAdmins()
    } catch (error) {
      console.error('Error deleting admin:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabaseBiz
        .from('admins')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      fetchAdmins()
    } catch (error) {
      console.error('Error toggling active status:', error)
      alert('상태 변경 실패: ' + error.message)
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      support: 'bg-green-100 text-green-700'
    }
    const labels = {
      super_admin: '슈퍼 관리자',
      admin: '관리자',
      support: '서포트'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[role]}`}>
        {labels[role]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">관리자 권한 관리</h1>
        </div>

        {/* Add New Admin */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              새 관리자 추가
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="email"
                placeholder="이메일 주소"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                className="flex-1"
              />
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="admin">관리자</option>
                <option value="super_admin">슈퍼 관리자</option>
                <option value="support">서포트</option>
              </select>
              <Button onClick={handleAddAdmin} disabled={loading}>
                {loading ? '추가 중...' : '추가'}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              * 관리자가 구글 로그인하면 자동으로 권한이 부여됩니다
            </p>
          </CardContent>
        </Card>

        {/* Admin List */}
        <Card>
          <CardHeader>
            <CardTitle>관리자 목록 ({admins.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">{admin.email}</span>
                      {getRoleBadge(admin.role)}
                      {admin.is_active ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          활성
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <XCircle className="w-4 h-4" />
                          비활성
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      가입일: {new Date(admin.created_at).toLocaleDateString('ko-KR')}
                      {admin.user_id && ' • 로그인 완료'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(admin.id, admin.is_active)}
                    >
                      {admin.is_active ? '비활성화' : '활성화'}
                    </Button>
                    {admin.email !== 'mkt_biz@cnec.co.kr' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {admins.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  등록된 관리자가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

