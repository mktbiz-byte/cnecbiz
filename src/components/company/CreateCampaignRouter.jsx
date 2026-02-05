import { useState, useEffect } from 'react'
import { useSearchParams, useParams, Navigate, useNavigate } from 'react-router-dom'
import { supabaseBiz } from '../../lib/supabaseClients'
import CreateCampaignKorea from './CreateCampaignKorea'
import CreateCampaign from './CreateCampaign'
import CreateCampaignJapan from './CreateCampaignJapan'
import CreateCampaignUS from './CreateCampaignUS'
import { ShieldAlert, MessageSquare, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'

export default function CreateCampaignRouter() {
  const [searchParams] = useSearchParams()
  const params = useParams()
  const navigate = useNavigate()
  const region = params.region || searchParams.get('region')

  const [loading, setLoading] = useState(true)
  const [isApproved, setIsApproved] = useState(null)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    checkApprovalStatus()
  }, [])

  const checkApprovalStatus = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: company, error } = await supabaseBiz
        .from('companies')
        .select('is_approved, company_name')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Failed to check approval status:', error)
        setIsApproved(true) // 에러 시 기본 허용 (기존 사용자 호환)
      } else {
        // is_approved가 null 또는 undefined인 경우 true로 처리 (기존 사용자 호환)
        setIsApproved(company?.is_approved !== false)
        setCompanyName(company?.company_name || '')
      }
    } catch (err) {
      console.error('Approval check error:', err)
      setIsApproved(true) // 에러 시 기본 허용
    } finally {
      setLoading(false)
    }
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 미승인 상태
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 pt-16 lg:pt-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 lg:p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-6">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            계정 승인 대기 중
          </h1>

          <p className="text-gray-600 mb-6 leading-relaxed">
            {companyName && <span className="font-medium">{companyName}</span>}님의 계정이 아직 승인되지 않았습니다.
            <br />
            캠페인 생성은 <span className="font-medium text-indigo-600">승인 완료 후</span> 이용 가능합니다.
          </p>

          {/* Info Box */}
          <div className="bg-indigo-50 rounded-xl p-4 lg:p-5 mb-6 text-left">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900 mb-1">빠른 승인을 원하시나요?</h3>
                <p className="text-sm text-gray-600">
                  사전 상담을 완료하신 브랜드는 우선 승인됩니다.
                  아직 상담 전이시라면 아래 버튼을 통해 상담을 신청해 주세요.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                navigate('/')
                setTimeout(() => window.dispatchEvent(new Event('openConsultationModal')), 100)
              }}
              className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-indigo-500/25"
            >
              상담 신청하기
            </Button>
            <Button
              onClick={() => navigate('/company/dashboard')}
              variant="outline"
              className="w-full h-12 rounded-xl border-gray-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              대시보드로 돌아가기
            </Button>
          </div>

          {/* Contact */}
          <p className="text-sm text-gray-500 mt-6">
            문의: <span className="font-medium">1833-6025</span>
          </p>
        </div>
      </div>
    )
  }

  // 나라별로 다른 컴포넌트 렌더링
  switch (region) {
    case 'korea':
      return <CreateCampaignKorea />
    case 'japan':
      // 일본은 전용 컴포넌트 사용
      return <CreateCampaignJapan />
    case 'us':
      // 미국은 전용 컴포넌트 사용
      return <CreateCampaignUS />
    case 'taiwan':
      // 대만은 기존 CreateCampaign 사용
      return <CreateCampaign />
    default:
      // region이 없으면 캠페인 목록으로 리다이렉트
      return <Navigate to="/company/campaigns" replace />
  }
}
