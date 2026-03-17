import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Building2, Search, Eye, Ban, CheckCircle, CreditCard, Plus, Minus, ShieldCheck, ShieldAlert, ShieldX, X, Mail, Key, Copy, Check, RefreshCw, Send, Calendar, Phone, MapPin, FileText, User, Loader2, Package, DollarSign, MoreHorizontal, Download, ShieldOff, Wallet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabaseBiz, getCampaignsFromAllRegions } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function CompaniesManagement() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [companyCampaigns, setCompanyCampaigns] = useState({}) // {company_email: {count, total_amount}}
  const [voucherStats, setVoucherStats] = useState({}) // {company_user_id: {totalCharged, totalUsed}}
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // all, active, suspended, pending
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [pointsAction, setPointsAction] = useState('add') // 'add' or 'deduct'
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsReason, setPointsReason] = useState('')

  // 기업 상세 정보 모달
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailCompany, setDetailCompany] = useState(null)

  // 비밀번호 재설정 관련
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchCompanies()
    fetchCompanyCampaigns()
    fetchVoucherStats()
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

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchCompanies = async () => {
    if (!supabaseBiz) return
    setLoading(true)

    try {
      const { data, error } = await supabaseBiz
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCompanies(data)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  // 기업별 캠페인 현황 조회
  const fetchCompanyCampaigns = async () => {
    try {
      const campaigns = await getCampaignsFromAllRegions()
      if (campaigns) {
        const campaignsByCompany = {}
        campaigns.forEach(c => {
          const email = c.company_email
          if (email) {
            if (!campaignsByCompany[email]) {
              campaignsByCompany[email] = { count: 0, inProgress: 0, totalAmount: 0 }
            }
            campaignsByCompany[email].count++
            if (c.status === 'in_progress' || (c.approval_status === 'approved' && c.status !== 'completed')) {
              campaignsByCompany[email].inProgress++
            }
            if (c.approval_status === 'approved' || c.status === 'completed') {
              campaignsByCompany[email].totalAmount += (c.estimated_cost || 0)
            }
          }
        })
        setCompanyCampaigns(campaignsByCompany)
      }
    } catch (error) {
      console.error('Error fetching company campaigns:', error)
    }
  }

  // 바우처 거래 내역 조회 (총 충전액, 사용액 계산)
  const fetchVoucherStats = async () => {
    try {
      const { data: transactions, error } = await supabaseBiz
        .from('points_transactions')
        .select('company_id, amount, type')

      if (error) {
        console.error('Error fetching voucher stats:', error)
        return
      }

      // company_id별로 충전액/사용액 집계
      const stats = {}
      ;(transactions || []).forEach(tx => {
        if (!tx.company_id) return
        if (!stats[tx.company_id]) {
          stats[tx.company_id] = { totalCharged: 0, totalUsed: 0 }
        }
        if (tx.type === 'charge' && tx.amount > 0) {
          stats[tx.company_id].totalCharged += tx.amount
        } else if (tx.type === 'spend' && tx.amount < 0) {
          stats[tx.company_id].totalUsed += Math.abs(tx.amount)
        }
      })
      setVoucherStats(stats)
    } catch (error) {
      console.error('Error fetching voucher stats:', error)
    }
  }

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'

    try {
      const { error } = await supabaseBiz
        .from('companies')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      fetchCompanies()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('상태 변경 실패: ' + error.message)
    }
  }

  // 기업 계정 승인 (is_approved = true)
  const handleApproveCompany = async (company) => {
    if (company.is_approved === true) {
      alert('이미 승인된 기업입니다.')
      return
    }

    if (!confirm(`${company.company_name} 기업을 승인하시겠습니까?\n승인 후 캠페인 생성이 가능해집니다.`)) return

    try {
      const { error } = await supabaseBiz
        .from('companies')
        .update({ is_approved: true })
        .eq('id', company.id)

      if (error) throw error

      // 승인 알림 발송 (카카오톡 + 이메일)
      const approvalDate = new Date().toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })

      // 담당자 전화번호 (하이픈 제거)
      const phoneNumber = (company.contact_phone || company.manager_phone || company.phone || '').replace(/-/g, '')
      const contactEmail = company.contact_email || company.email

      // 카카오톡 알림톡 발송
      if (phoneNumber) {
        try {
          await fetch('/.netlify/functions/send-kakao-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: phoneNumber,
              receiverName: company.contact_name || company.company_name,
              templateCode: '025100000912',
              variables: {
                '회원명': company.company_name || '기업'
              }
            })
          })
          console.log('✓ 기업 가입완료 알림톡 발송 완료')
        } catch (kakaoError) {
          console.error('알림톡 발송 실패:', kakaoError)
        }
      }

      // 이메일 발송
      if (contactEmail) {
        try {
          await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: contactEmail,
              subject: `[CNEC] ${company.company_name}님, 기업회원 가입이 승인되었습니다`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">CNEC BIZ</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">글로벌 인플루언서 마케팅 플랫폼</p>
                  </div>

                  <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937; margin-top: 0;">🎉 기업회원 가입 승인 완료</h2>

                    <p style="color: #4b5563; line-height: 1.6;">
                      안녕하세요, <strong>${company.company_name}</strong> 담당자님!<br><br>
                      CNEC 기업회원 가입이 승인되었습니다.
                    </p>

                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                      <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">📋 승인 정보</h3>
                      <ul style="color: #4b5563; line-height: 1.8; margin: 0; padding-left: 20px; list-style: none;">
                        <li><strong>회사명:</strong> ${company.company_name}</li>
                        <li><strong>승인일시:</strong> ${approvalDate}</li>
                      </ul>
                    </div>

                    <p style="color: #4b5563; line-height: 1.6;">
                      지금 바로 어드민에 로그인하여<br>
                      캠페인을 등록해보세요.
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://cnecbiz.com/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">로그인 바로가기</a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                      ※ 본 메시지는 회원가입 신청에 따라 발송되었습니다.<br>
                      ※ 문의: cnec@cnecbiz.com
                    </p>
                  </div>

                  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                    <p>© 2025 CNEC BIZ. All rights reserved.</p>
                  </div>
                </div>
              `
            })
          })
          console.log('✓ 기업 승인 이메일 발송 완료')
        } catch (emailError) {
          console.error('이메일 발송 실패:', emailError)
        }
      }

      alert('기업 승인이 완료되었습니다!')
      fetchCompanies()
    } catch (error) {
      console.error('Error approving company:', error)
      alert('승인 실패: ' + error.message)
    }
  }

  const handleAdjustPoints = (company) => {
    setSelectedCompany(company)
    setShowPointsModal(true)
    setPointsAction('add')
    setPointsAmount('')
    setPointsReason('')
  }

  const handleSubmitPoints = async () => {
    if (!selectedCompany || !pointsAmount || !pointsReason) {
      alert('모든 필드를 입력해주세요')
      return
    }

    const amount = parseInt(pointsAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('유효한 포인트 금액을 입력해주세요')
      return
    }

    const currentPoints = selectedCompany.points_balance || 0
    const finalAmount = pointsAction === 'add' ? amount : -amount
    const newBalance = currentPoints + finalAmount

    if (newBalance < 0) {
      alert('수출바우처 잔액이 부족합니다')
      return
    }

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      // 1. 포인트 잔액 업데이트
      const { error: updateError } = await supabaseBiz
        .from('companies')
        .update({ points_balance: newBalance })
        .eq('id', selectedCompany.id)

      if (updateError) throw updateError

      // 2. 수출바우처 거래 기록 (company_id는 user_id를 사용)
      const { error: transactionError } = await supabaseBiz
        .from('points_transactions')
        .insert([{
          company_id: selectedCompany.user_id,
          amount: finalAmount,
          balance_after: newBalance,
          type: pointsAction === 'add' ? 'charge' : 'spend',
          description: `[수출바우처 ${pointsAction === 'add' ? '충전' : '차감'}] ${pointsReason} (관리자: ${user?.email || 'unknown'})`
        }])

      if (transactionError) throw transactionError

      alert(`수출바우처 ${pointsAction === 'add' ? '충전' : '차감'}이 완료되었습니다.\n${pointsAction === 'add' ? '충전' : '차감'} 금액: ${parseInt(pointsAmount).toLocaleString()}원 (VAT 별도)`)
      setShowPointsModal(false)
      fetchCompanies()
      fetchVoucherStats()
    } catch (error) {
      console.error('Error adjusting voucher:', error)
      alert('수출바우처 처리에 실패했습니다: ' + error.message)
    }
  }

  // 기업 차단/차단해제 함수
  const handleToggleBlock = async (company) => {
    const isBlocked = company.is_blocked
    const action = isBlocked ? '차단해제' : '차단'
    const warningMessage = isBlocked
      ? `${company.company_name} 기업의 차단을 해제하시겠습니까?\n\n차단 해제 후 캠페인 생성 등 모든 기능이 다시 활성화됩니다.`
      : `${company.company_name} 기업을 차단하시겠습니까?\n\n⚠️ 차단 시:\n• 캠페인 생성 불가\n• 기존 캠페인 관리 불가\n• 모든 기능 제한`

    if (!confirm(warningMessage)) return

    try {
      const { error } = await supabaseBiz
        .from('companies')
        .update({ is_blocked: !isBlocked })
        .eq('id', company.id)

      if (error) throw error

      alert(`${company.company_name} 기업이 ${action}되었습니다.`)
      fetchCompanies()
      setShowDetailModal(false)
    } catch (error) {
      console.error('Error toggling block:', error)
      alert(`${action} 실패: ` + error.message)
    }
  }

  // 기업 상세 정보 모달 열기
  const handleShowDetail = (company) => {
    setDetailCompany(company)
    setShowDetailModal(true)
  }

  // 비밀번호 재설정 모달 열기
  const handleOpenPasswordReset = (company) => {
    setDetailCompany(company)
    setTempPassword('')
    setPasswordCopied(false)
    setEmailSent(false)
    setShowPasswordResetModal(true)
  }

  // 임시 비밀번호 생성
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setTempPassword(password)
    setPasswordCopied(false)
    setEmailSent(false)
  }

  // 비밀번호 복사
  const copyPassword = async () => {
    if (!tempPassword) return
    try {
      await navigator.clipboard.writeText(tempPassword)
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  // 비밀번호 재설정 및 이메일 발송
  const sendPasswordResetEmail = async () => {
    if (!detailCompany || !tempPassword) {
      alert('임시 비밀번호를 먼저 생성해주세요')
      return
    }

    const contactEmail = detailCompany.contact_email || detailCompany.email
    if (!contactEmail) {
      alert('이메일 주소가 없습니다')
      return
    }

    setSendingEmail(true)

    try {
      // 1. 먼저 실제 비밀번호 변경 (Supabase Auth)
      const resetResponse = await fetch('/.netlify/functions/admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contactEmail,
          newPassword: tempPassword
        })
      })

      const resetResult = await resetResponse.json()

      if (!resetResult.success) {
        throw new Error(resetResult.error || '비밀번호 변경에 실패했습니다')
      }

      // 2. 비밀번호 변경 성공 후 이메일 발송
      await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contactEmail,
          subject: `[CNEC] ${detailCompany.company_name}님의 임시 비밀번호 안내`,
          html: `
            <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">CNEC BIZ</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">임시 비밀번호 안내</p>
              </div>

              <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
                <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">🔐 비밀번호가 재설정되었습니다</h2>

                <p style="color: #4b5563; line-height: 1.8; font-size: 15px;">
                  안녕하세요, <strong>${detailCompany.company_name}</strong> 담당자님!<br><br>
                  관리자에 의해 계정 비밀번호가 재설정되었습니다.<br>
                  아래 임시 비밀번호로 로그인 후, 반드시 새 비밀번호로 변경해주세요.
                </p>

                <div style="background: linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 100%); padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center; border: 2px dashed #667eea;">
                  <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 13px;">임시 비밀번호</p>
                  <div style="background: white; padding: 15px 25px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <code style="color: #667eea; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</code>
                  </div>
                </div>

                <div style="background: #fef3c7; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <p style="color: #92400e; margin: 0; font-size: 14px;">
                    ⚠️ <strong>보안 안내</strong><br>
                    로그인 후 즉시 비밀번호를 변경해주세요.<br>
                    본 메일을 삭제하시고, 임시 비밀번호를 타인과 공유하지 마세요.
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://cnecbiz.com/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">로그인 바로가기</a>
                </div>

                <p style="color: #9ca3af; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  ※ 본 메일은 CNEC 관리자에 의해 발송되었습니다.<br>
                  ※ 문의: cnec@cnecbiz.com
                </p>
              </div>

              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>© 2025 CNEC BIZ. All rights reserved.</p>
              </div>
            </div>
          `
        })
      })

      setEmailSent(true)
      alert(`비밀번호가 변경되었습니다.\n${contactEmail}로 임시 비밀번호 안내 메일이 발송되었습니다.`)
    } catch (error) {
      console.error('비밀번호 재설정 실패:', error)
      alert('비밀번호 재설정에 실패했습니다: ' + error.message)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleExcelDownload = () => {
    const excelData = filteredCompanies.map((company, index) => {
      const campaignData = companyCampaigns[company.email] || { count: 0, inProgress: 0, totalAmount: 0 }
      const stats = voucherStats[company.user_id] || { totalCharged: 0, totalUsed: 0 }

      const statusLabel = company.is_blocked ? '차단됨'
        : company.is_approved === false ? '승인대기'
        : company.status === 'suspended' ? '휴면'
        : '정상'

      return {
        'NO': index + 1,
        '기업명': company.company_name || '',
        '담당자명': company.contact_person || company.contact_name || '',
        '전화번호': company.phone || company.contact_phone || '',
        '이메일': company.email || '',
        '가입일': company.created_at ? new Date(company.created_at).toLocaleDateString('ko-KR') : '',
        '상태': statusLabel,
        '진행중 캠페인': campaignData.inProgress,
        '누적 캠페인': campaignData.count,
        '총 결제금액(VAT별도)': Math.round(campaignData.totalAmount / 1.1),
        '바우처 충전액': stats.totalCharged,
        '바우처 사용액': stats.totalUsed,
        '바우처 잔액': company.points_balance || 0,
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { wch: 5 },   // NO
      { wch: 20 },  // 기업명
      { wch: 12 },  // 담당자명
      { wch: 15 },  // 전화번호
      { wch: 28 },  // 이메일
      { wch: 12 },  // 가입일
      { wch: 8 },   // 상태
      { wch: 10 },  // 진행중
      { wch: 10 },  // 누적
      { wch: 15 },  // 총 결제금액
      { wch: 12 },  // 바우처 충전
      { wch: 12 },  // 바우처 사용
      { wch: 12 },  // 바우처 잔액
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '기업목록')

    const today = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `기업목록_${today}.xlsx`)
  }

  const filteredCompanies = companies.filter(company =>
    company.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.business_registration_number?.includes(searchTerm)
  )

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-700'
    }
    const labels = {
      active: '활성',
      inactive: '비활성',
      suspended: '정지'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">기업 관리</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="기업명, 이메일, 사업자번호 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">전체 기업</div>
              <div className="text-3xl font-bold">{companies.length}</div>
            </CardContent>
          </Card>
          <Card className={companies.filter(c => c.is_approved === false).length > 0 ? 'ring-2 ring-amber-400' : ''}>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                승인 대기
              </div>
              <div className="text-3xl font-bold text-amber-600">
                {companies.filter(c => c.is_approved === false).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">활성 기업</div>
              <div className="text-3xl font-bold text-green-600">
                {companies.filter(c => c.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">정지된 기업</div>
              <div className="text-3xl font-bold text-red-600">
                {companies.filter(c => c.status === 'suspended').length}
              </div>
            </CardContent>
          </Card>
          <Card className={companies.filter(c => c.is_blocked).length > 0 ? 'ring-2 ring-red-500' : ''}>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                <ShieldX className="w-4 h-4 text-red-600" />
                차단된 기업
              </div>
              <div className="text-3xl font-bold text-red-700">
                {companies.filter(c => c.is_blocked).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'all', label: '전체', count: companies.length },
            { value: 'pending', label: '승인대기', count: companies.filter(c => c.is_approved === false && !c.is_blocked).length, color: 'amber' },
            { value: 'active', label: '활성', count: companies.filter(c => c.status === 'active' && c.is_approved !== false && !c.is_blocked).length, color: 'green' },
            { value: 'suspended', label: '정지', count: companies.filter(c => c.status === 'suspended' && !c.is_blocked).length, color: 'gray' },
            { value: 'blocked', label: '🚫 차단', count: companies.filter(c => c.is_blocked).length, color: 'rose' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === tab.value
                  ? tab.color === 'amber' ? 'bg-amber-600 text-white' :
                    tab.color === 'green' ? 'bg-green-600 text-white' :
                    tab.color === 'red' ? 'bg-red-600 text-white' :
                    tab.color === 'rose' ? 'bg-rose-600 text-white' :
                    tab.color === 'gray' ? 'bg-gray-600 text-white' :
                    'bg-blue-600 text-white'
                  : tab.color === 'rose' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' :
                    'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Companies Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              기업 회원 관리
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExcelDownload}>
                <Download className="w-4 h-4 mr-2" />
                엑셀 다운로드
              </Button>
              <Button size="sm" className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                기업 수동 등록
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">NO</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">기업 정보</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">구분</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">담당자</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">진행중 / 누적</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">총 결제 금액</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">수출바우처</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">상태</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCompanies
                      .filter(c => {
                        if (statusFilter === 'all') return true
                        if (statusFilter === 'blocked') return c.is_blocked
                        if (statusFilter === 'pending') return c.is_approved === false && !c.is_blocked
                        if (statusFilter === 'active') return c.status === 'active' && c.is_approved !== false && !c.is_blocked
                        if (statusFilter === 'suspended') return c.status === 'suspended'
                        return true
                      })
                      .map((company, index) => {
                        const campaignData = companyCampaigns[company.email] || { count: 0, inProgress: 0, totalAmount: 0 }
                        return (
                          <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-sm text-gray-500">{index + 1}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                    {(company.company_name || '?').charAt(0)}
                                  </div>
                                  {company.created_at && (
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                      {new Date(company.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{company.company_name}</div>
                                  <div className="text-xs text-gray-500">{company.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {company.is_approved === false ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  승인대기
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  일반
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-gray-900">{company.contact_person || company.contact_name || '-'}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {company.phone || company.contact_phone || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => navigate(`/admin/campaigns?company_email=${encodeURIComponent(company.email)}&company_name=${encodeURIComponent(company.company_name || '')}`)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="text-purple-700 font-bold">{campaignData.inProgress}건</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-600">{campaignData.count}</span>
                              </button>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div>
                                <span className="font-bold text-gray-900">
                                  {Math.round(campaignData.totalAmount / 1.1).toLocaleString()}원
                                </span>
                                <p className="text-xs text-gray-400">VAT 별도</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {(() => {
                                const stats = voucherStats[company.user_id] || { totalCharged: 0, totalUsed: 0 }
                                const remaining = company.points_balance || 0
                                const hasVoucher = stats.totalCharged > 0 || remaining > 0

                                return (
                                  <div className="flex items-center justify-end gap-2">
                                    {hasVoucher ? (
                                      <div className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                          <span className="text-xs text-gray-500">충전</span>
                                          <span className="font-medium text-gray-700">{stats.totalCharged.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end">
                                          <span className="text-xs text-gray-500">사용</span>
                                          <span className="font-medium text-red-500">-{stats.totalUsed.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end border-t border-gray-200 pt-0.5 mt-0.5">
                                          <span className="text-xs text-purple-500 font-medium">잔액</span>
                                          <span className="font-bold text-purple-600">{remaining.toLocaleString()}원</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAdjustPoints(company)}
                                      className="h-7 px-2 text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {company.is_blocked ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 flex items-center gap-1 justify-center">
                                  <ShieldX className="w-3 h-3" />
                                  차단됨
                                </span>
                              ) : company.status === 'suspended' ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  휴면
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  정상
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {company.is_approved === false && !company.is_blocked && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveCompany(company)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                                  >
                                    승인
                                  </Button>
                                )}
                                {company.is_blocked ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleBlock(company)}
                                    className="text-emerald-600 border-emerald-500 hover:bg-emerald-50 h-8 text-xs"
                                  >
                                    <ShieldOff className="w-3 h-3 mr-1" />
                                    차단해제
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleBlock(company)}
                                    className="text-rose-600 hover:bg-rose-50 h-8 text-xs"
                                    title="기업 차단"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShowDetail(company)}
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>

                {filteredCompanies.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다' : '등록된 기업이 없습니다'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* 수출바우처 충전 Modal */}
      {showPointsModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                수출바우처 충전
              </h2>
              <p className="text-purple-100 text-sm mt-1">VAT 별도 금액 기준</p>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                <div className="text-sm text-gray-600">회사명</div>
                <div className="text-lg font-bold text-gray-900">{selectedCompany.company_name}</div>
                <div className="text-sm text-gray-600 mt-3">현재 수출바우처 잔액</div>
                <div className="text-2xl font-bold text-purple-600">
                  {(selectedCompany.points_balance || 0).toLocaleString()}원
                </div>
                <p className="text-xs text-gray-500 mt-1">VAT 별도</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">작업 종류</label>
                  <div className="flex gap-2">
                    <Button
                      variant={pointsAction === 'add' ? 'default' : 'outline'}
                      className={`flex-1 ${pointsAction === 'add' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => setPointsAction('add')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      바우처 충전
                    </Button>
                    <Button
                      variant={pointsAction === 'deduct' ? 'default' : 'outline'}
                      className={`flex-1 ${pointsAction === 'deduct' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                      onClick={() => setPointsAction('deduct')}
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      바우처 차감
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    금액 <span className="text-gray-400 font-normal">(VAT 별도)</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(e.target.value)}
                  />
                  {pointsAmount && (
                    <p className="text-xs text-gray-500 mt-1">
                      VAT 포함 시: {Math.round(parseInt(pointsAmount) * 1.1).toLocaleString()}원
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">사유</label>
                  <Input
                    type="text"
                    placeholder="예: 수출바우처 지급 (KOTRA 승인)"
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                  />
                </div>

                {/* 예상 결과 */}
                {pointsAmount && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">충전 후 예상 잔액</div>
                    <div className={`text-xl font-bold ${
                      pointsAction === 'add' ? 'text-purple-600' : 'text-red-600'
                    }`}>
                      {(
                        (selectedCompany.points_balance || 0) +
                        (pointsAction === 'add' ? parseInt(pointsAmount || 0) : -parseInt(pointsAmount || 0))
                      ).toLocaleString()}원
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    className={`flex-1 ${pointsAction === 'add' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={handleSubmitPoints}
                  >
                    {pointsAction === 'add' ? '충전하기' : '차감하기'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowPointsModal(false)
                      setSelectedCompany(null)
                      setPointsAmount('')
                      setPointsReason('')
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 기업 상세 정보 모달 */}
      {showDetailModal && detailCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white relative">
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{detailCompany.company_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {detailCompany.is_approved ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-400/30 text-white flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        승인됨
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400/30 text-white flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        승인대기
                      </span>
                    )}
                    {getStatusBadge(detailCompany.status || 'active')}
                  </div>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* 기본 정보 */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                      <Mail className="w-4 h-4" />
                      이메일
                    </div>
                    <div className="font-medium text-slate-800">{detailCompany.email || '-'}</div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-green-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                      <Phone className="w-4 h-4" />
                      연락처
                    </div>
                    <div className="font-medium text-slate-800">{detailCompany.phone || detailCompany.contact_phone || '-'}</div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-purple-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                      <User className="w-4 h-4" />
                      담당자
                    </div>
                    <div className="font-medium text-slate-800">{detailCompany.contact_person || detailCompany.contact_name || '-'}</div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-amber-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                      <FileText className="w-4 h-4" />
                      사업자등록번호
                    </div>
                    <div className="font-medium text-slate-800">{detailCompany.business_registration_number || '-'}</div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-rose-50/50 p-4 rounded-xl border border-slate-100 md:col-span-2">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                      <MapPin className="w-4 h-4" />
                      주소
                    </div>
                    <div className="font-medium text-slate-800">{detailCompany.company_address || detailCompany.address || '-'}</div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-cyan-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      가입일
                    </div>
                    <div className="font-medium text-slate-800">
                      {new Date(detailCompany.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100 md:col-span-2">
                    <div className="flex items-center gap-2 text-purple-600 text-sm mb-2">
                      <Wallet className="w-4 h-4" />
                      수출바우처 현황
                    </div>
                    {(() => {
                      const stats = voucherStats[detailCompany.user_id] || { totalCharged: 0, totalUsed: 0 }
                      const remaining = detailCompany.points_balance || 0
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">총 충전액</p>
                            <p className="text-lg font-bold text-gray-700">
                              {stats.totalCharged.toLocaleString()}원
                            </p>
                          </div>
                          <div className="text-center border-x border-purple-200">
                            <p className="text-xs text-gray-500 mb-1">사용 금액</p>
                            <p className="text-lg font-bold text-red-500">
                              -{stats.totalUsed.toLocaleString()}원
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-purple-500 font-medium mb-1">남은 잔액</p>
                            <p className="text-xl font-bold text-purple-600">
                              {remaining.toLocaleString()}원
                            </p>
                          </div>
                        </div>
                      )
                    })()}
                    <p className="text-xs text-gray-400 mt-2 text-center">VAT 별도</p>
                  </div>
                </div>

                {/* 비밀번호 재설정 섹션 */}
                <div className="bg-gradient-to-r from-rose-50 to-orange-50 p-5 rounded-xl border border-rose-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Key className="w-5 h-5 text-rose-500" />
                        비밀번호 재설정
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        기업 담당자가 비밀번호를 분실한 경우 임시 비밀번호를 생성하여 이메일로 발송할 수 있습니다.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleOpenPasswordReset(detailCompany)}
                      className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-md"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      비밀번호 재설정
                    </Button>
                  </div>
                </div>

                {/* 기업 차단 섹션 */}
                <div className={`p-5 rounded-xl border ${
                  detailCompany.is_blocked
                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200'
                    : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        {detailCompany.is_blocked ? (
                          <>
                            <ShieldX className="w-5 h-5 text-red-500" />
                            차단된 기업
                          </>
                        ) : (
                          <>
                            <Ban className="w-5 h-5 text-red-500" />
                            기업 차단
                          </>
                        )}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {detailCompany.is_blocked
                          ? '현재 이 기업은 차단되어 모든 기능이 제한되어 있습니다.'
                          : '스팸 또는 의심스러운 기업을 차단하면 캠페인 생성 등 모든 기능이 제한됩니다.'
                        }
                      </p>
                    </div>
                    <Button
                      onClick={() => handleToggleBlock(detailCompany)}
                      className={detailCompany.is_blocked
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-md'
                        : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-md'
                      }
                    >
                      {detailCompany.is_blocked ? (
                        <>
                          <ShieldOff className="w-4 h-4 mr-2" />
                          차단 해제
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4 mr-2" />
                          기업 차단
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  const companyName = encodeURIComponent(detailCompany.company_name || detailCompany.name || '')
                  navigate(`/admin/campaigns?company_id=${detailCompany.id}&company_name=${companyName}`)
                  setShowDetailModal(false)
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                캠페인 관리 보기
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDetailModal(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 재설정 모달 */}
      {showPasswordResetModal && detailCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-5 text-white relative">
              <button
                onClick={() => setShowPasswordResetModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">비밀번호 재설정</h2>
                  <p className="text-sm opacity-90">{detailCompany.company_name}</p>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 space-y-5">
              {/* 발송 대상 이메일 */}
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="text-sm text-slate-500 mb-1">발송 대상 이메일</div>
                <div className="font-medium text-slate-800 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  {detailCompany.contact_email || detailCompany.email || '이메일 없음'}
                </div>
              </div>

              {/* 임시 비밀번호 생성 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  임시 비밀번호
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      value={tempPassword}
                      placeholder="비밀번호를 생성해주세요"
                      readOnly
                      className="pr-10 font-mono text-lg tracking-wide"
                    />
                    {tempPassword && (
                      <button
                        onClick={copyPassword}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        {passwordCopied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={generateTempPassword}
                    className="shrink-0"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    생성
                  </Button>
                </div>
                {passwordCopied && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    클립보드에 복사되었습니다
                  </p>
                )}
              </div>

              {/* 안내 메시지 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ 참고사항</strong><br />
                  • 임시 비밀번호 생성 후 이메일 발송 버튼을 클릭하세요<br />
                  • 발송 시 실제 비밀번호가 즉시 변경됩니다<br />
                  • 담당자에게 로그인 후 비밀번호 변경을 안내해주세요
                </p>
              </div>

              {/* 발송 성공 메시지 */}
              {emailSent && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-800">비밀번호 변경 완료!</div>
                    <div className="text-sm text-green-600">비밀번호가 변경되었고, 담당자에게 안내 메일이 발송되었습니다.</div>
                  </div>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 bg-slate-50 border-t flex gap-2">
              <Button
                onClick={sendPasswordResetEmail}
                disabled={!tempPassword || sendingEmail}
                className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    이메일로 발송
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPasswordResetModal(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

