import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Save, Send, FileText } from 'lucide-react'
import { getSupabaseClient } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function AdminCampaignGuides() {
  const { id } = useParams()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const region = searchParams.get('region') || 'korea'
  
  const [campaign, setCampaign] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingGuideId, setEditingGuideId] = useState(null)
  const [editedGuide, setEditedGuide] = useState('')

  useEffect(() => {
    fetchCampaignAndGuides()
  }, [id, region])

  const fetchCampaignAndGuides = async () => {
    try {
      const client = getSupabaseClient(region)
      if (!client) {
        console.error('No Supabase client for region:', region)
        return
      }

      // 캠페인 정보 가져오기
      const { data: campaignData, error: campaignError } = await client
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // 선정된 크리에이터의 지원서 가져오기 (가이드 포함)
      const { data: appsData, error: appsError } = await client
        .from('applications')
        .select('*')
        .eq('campaign_id', id)
        .in('status', ['approved', 'virtual_selected', 'selected'])
        .order('created_at', { ascending: false })

      if (appsError) throw appsError
      setApplications(appsData || [])
    } catch (error) {
      console.error('Error fetching campaign and guides:', error)
      alert('데이터 로딩에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditGuide = (app) => {
    setEditingGuideId(app.id)
    setEditedGuide(app.personalized_guide || '')
  }

  const handleSaveGuide = async (appId) => {
    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      const { error } = await client
        .from('applications')
        .update({ 
          personalized_guide: editedGuide,
          guide_updated_at: new Date().toISOString()
        })
        .eq('id', appId)

      if (error) throw error

      alert('가이드가 저장되었습니다.')
      setEditingGuideId(null)
      await fetchCampaignAndGuides()
    } catch (error) {
      console.error('Error saving guide:', error)
      alert('저장에 실패했습니다.')
    }
  }

  const handleShareToCompany = async (app) => {
    if (!confirm(`${app.applicant_name}님의 가이드를 기업에게 전달하시겠습니까?`)) {
      return
    }

    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      // guide_shared_to_company 플래그 설정
      const { error } = await client
        .from('applications')
        .update({ 
          guide_shared_to_company: true,
          guide_shared_at: new Date().toISOString()
        })
        .eq('id', app.id)

      if (error) throw error

      alert('가이드가 기업에게 전달되었습니다. 기업 페이지에서 확인할 수 있습니다.')
      await fetchCampaignAndGuides()
    } catch (error) {
      console.error('Error sharing guide:', error)
      alert('전달에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 헤더 */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(`/admin/campaigns/${id}?region=${region}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              캠페인 상세로 돌아가기
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">개별 맞춤 가이드 관리</h1>
            <p className="text-gray-600 mt-2">
              {campaign?.title || campaign?.campaign_name || '캠페인'}
            </p>
          </div>

          {/* 가이드 목록 */}
          <div className="space-y-6">
            {applications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">선정된 크리에이터가 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              applications.map((app) => (
                <Card key={app.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl text-purple-900">
                          {app.applicant_name || app.creator_name || '크리에이터'}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {app.email || '-'} · {app.main_channel || 'Instagram'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {app.guide_generated_at && (
                          <Badge className="bg-green-100 text-green-800">
                            가이드 생성됨
                          </Badge>
                        )}
                        {app.guide_shared_to_company && (
                          <Badge className="bg-blue-100 text-blue-800">
                            기업 전달 완료
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {!app.personalized_guide ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>아직 가이드가 생성되지 않았습니다.</p>
                        <p className="text-sm mt-2">캠페인 상세 페이지에서 "AI 가이드 생성"을 실행해주세요.</p>
                      </div>
                    ) : editingGuideId === app.id ? (
                      <div>
                        <textarea
                          value={editedGuide}
                          onChange={(e) => setEditedGuide(e.target.value)}
                          className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="가이드 내용을 입력하세요..."
                        />
                        <div className="flex gap-3 mt-4">
                          <Button
                            onClick={() => handleSaveGuide(app.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingGuideId(null)}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="prose max-w-none mb-6">
                          <div className="whitespace-pre-wrap bg-gray-50 p-6 rounded-lg border border-gray-200">
                            {app.personalized_guide}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleEditGuide(app)}
                            variant="outline"
                            className="border-purple-600 text-purple-600 hover:bg-purple-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            가이드 수정
                          </Button>
                          <Button
                            onClick={() => handleShareToCompany(app)}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={app.guide_shared_to_company}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {app.guide_shared_to_company ? '기업 전달 완료' : '가이드 기업에게 전달'}
                          </Button>
                        </div>
                        {app.guide_updated_at && (
                          <p className="text-sm text-gray-500 mt-4">
                            마지막 수정: {new Date(app.guide_updated_at).toLocaleString('ko-KR')}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
