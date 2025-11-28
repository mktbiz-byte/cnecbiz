import React, { useState, useEffect } from 'react'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUs } from '../../lib/supabase'

const CampaignsManagement = () => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [activeTab, setActiveTab] = useState('pending_approval')

  const tabs = [
    { id: 'pending_approval', label: '승인 대기', status: 'pending', approval_status: 'pending_approval' },
    { id: 'active', label: '활성 캠페인', status: 'active', approval_status: 'approved' },
    { id: 'paused', label: '일시 중지', status: 'paused', approval_status: 'pending_approval' },
    { id: 'completed', label: '완료', status: 'completed', approval_status: 'approved' }
  ]

  const getCampaignsFromAllRegions = async () => {
    console.log('[getCampaignsFromAllRegions] Starting to fetch campaigns from all regions...')
    const allCampaigns = []
    const regions = [
      { name: 'biz', client: supabaseBiz },
      { name: 'korea', client: supabaseKorea },
      { name: 'japan', client: supabaseJapan },
      { name: 'us', client: supabaseUs }
    ]

    for (const region of regions) {
      try {
        console.log(`[getCampaignsFromAllRegions] Fetching from ${region.name}...`)
        if (!region.client) {
          console.log(`[getCampaignsFromAllRegions] No client for region: ${region.name}`)
          continue
        }
        console.log(`[getCampaignsFromAllRegions] Client for ${region.name}: exists`)
        
        const { data, error } = await region.client
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error(`[getCampaignsFromAllRegions] Error fetching from ${region.name}:`, error)
          continue
        }

        console.log(`[getCampaignsFromAllRegions] Fetched ${data?.length || 0} campaigns from ${region.name}`)
        if (data && data.length > 0) {
          console.log(`[getCampaignsFromAllRegions] Sample campaign from ${region.name}:`, Object.keys(data[0]))
          const campaignsWithRegion = data.map(campaign => ({
            ...campaign,
            region: region.name
          }))
          allCampaigns.push(...campaignsWithRegion)
        } else {
          console.log(`[getCampaignsFromAllRegions] Sample campaign from ${region.name}: no data`)
        }
      } catch (err) {
        console.error(`[getCampaignsFromAllRegions] Exception fetching from ${region.name}:`, err)
      }
    }

    console.log(`[getCampaignsFromAllRegions] Total campaigns: ${allCampaigns.length}`)
    return allCampaigns
  }

  const fetchCampaigns = async () => {
    console.log('[CampaignsManagement] Starting to fetch campaigns...')
    try {
      setLoading(true)
      const allCampaigns = await getCampaignsFromAllRegions()
      console.log('[CampaignsManagement] Fetched campaigns:', allCampaigns.length)
      setCampaigns(allCampaigns)
    } catch (error) {
      console.error('[CampaignsManagement] Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const getRegionClient = (region) => {
    const clients = {
      'biz': supabaseBiz,
      'korea': supabaseKorea,
      'japan': supabaseJapan,
      'us': supabaseUs
    }
    return clients[region]
  }

  const handleStatusChange = async (campaign, newStatus) => {
    console.log('[DEBUG] Campaign object:', campaign)
    console.log('[DEBUG] newStatus:', newStatus, 'campaign.company_id:', campaign.company_id)
    
    if (!confirm(`캠페인을 ${newStatus === 'active' ? '활성화' : '일시중지'}하시겠습니까?`)) {
      return
    }

    try {
      setConfirming(true)
      const client = getRegionClient(campaign.region)
      
      if (!client) {
        throw new Error(`Invalid region: ${campaign.region}`)
      }

      // 상태 업데이트
      const updates = {
        status: newStatus,
        approval_status: newStatus === 'active' ? 'approved' : 'pending_approval',
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'active') {
        updates.approved_at = new Date().toISOString()
      }

      const { error } = await client
        .from('campaigns')
        .update(updates)
        .eq('id', campaign.id)

      if (error) {
        throw error
      }

      alert(`캠페인이 ${newStatus === 'active' ? '활성화' : '일시중지'}되었습니다.`)
      
      // 활성화 시 알림 전송
      console.log('[DEBUG] Campaign keys:', Object.keys(campaign))
      if (newStatus === 'active' && campaign.company_email) {
        console.log('[DEBUG] 알림 전송 조건 충족 - company_email:', campaign.company_email)
        try {
          // company_email로 companies 테이블 조회 (company_id는 불일치할 수 있음)
          console.log('[DEBUG] company_email로 회사 정보 조회 시작:', campaign.company_email)
          const { data: companies, error: companyError } = await supabaseBiz
            .from('companies')
            .select('company_name, email, phone, notification_phone, notification_email')
            .eq('email', campaign.company_email)
          
          console.log('[DEBUG] 회사 조회 결과:', companies, '에러:', companyError)
          
          // companies 테이블에서 조회한 정보 사용, 없으면 캠페인 정보 사용
          const company = companies && companies.length > 0 ? companies[0] : {
            company_name: campaign.brand || campaign.brand_name || '회사',
            email: campaign.company_email,
            phone: null,
            notification_phone: null,
            notification_email: campaign.company_email
          }
          
          console.log('[DEBUG] 최종 회사 정보:', company)

          if (company.email) {
            const formatDate = (dateString) => {
              if (!dateString) return '미정'
              return new Date(dateString).toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            }

            const startDate = formatDate(campaign.recruitment_start_date || campaign.start_date)
            const endDate = formatDate(campaign.recruitment_deadline || campaign.end_date)
            const campaignTitle = campaign.campaign_name || campaign.title || '캠페인'

            // 카카오 알림톡 발송 (전화번호가 있을 경우만)
            if (company.notification_phone || company.phone) {
              try {
                console.log('[DEBUG] 알림톡 전송 시작:', company.notification_phone || company.phone)
                const kakaoRes = await fetch('/.netlify/functions/send-kakao-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    receiverNum: company.notification_phone || company.phone,
                    receiverName: company.company_name || '회사',
                    templateCode: '025100001005',
                    variables: {
                      '회사명': company.company_name || '회사',
                      '캠페인명': campaignTitle,
                      '시작일': startDate,
                      '마감일': endDate,
                      '모집인원': String(campaign.total_slots || campaign.target_creators || 0)
                    }
                  })
                })
                const kakaoResult = await kakaoRes.json()
                console.log('[DEBUG] 알림톡 응답:', kakaoResult)
              } catch (err) {
                console.error('[ERROR] 알림톡 전송 실패:', err)
              }
            } else {
              console.log('[DEBUG] 전화번호 없음 - 캠페인 테이블에 전화번호 필드 없음')
            }

            // 이메일 발송
            if (company.notification_email || company.email) {
              try {
                console.log('[DEBUG] 이메일 전송 시작:', company.notification_email || company.email)
                const emailRes = await fetch('/.netlify/functions/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: company.notification_email || company.email,
                    subject: '[CNEC] 캠페인 승인 완료',
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #333;">[CNEC] 캠페인 승인 완료</h2>
                        <p><strong>${company.company_name || '회사'}</strong>님, 신청하신 캠페인이 승인되어 크리에이터 모집이 시작되었습니다.</p>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                          <p style="margin: 10px 0;"><strong>캠페인:</strong> ${campaignTitle}</p>
                          <p style="margin: 10px 0;"><strong>모집 기간:</strong> ${startDate} ~ ${endDate}</p>
                          <p style="margin: 10px 0;"><strong>모집 인원:</strong> ${campaign.total_slots || campaign.target_creators || 0}명</p>
                        </div>
                        
                        <p style="color: #666;">관리자 페이지에서 진행 상황을 확인하실 수 있습니다.</p>
                        <p style="color: #666;">문의: <strong>1833-6025</strong></p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="font-size: 12px; color: #999; text-align: center;">
                          본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
                        </p>
                      </div>
                    `
                  })
                })
                const emailResult = await emailRes.json()
                console.log('[DEBUG] 이메일 응답:', emailResult)
              } catch (err) {
                console.error('[ERROR] 이메일 전송 실패:', err)
              }
            } else {
              console.log('[DEBUG] 이메일 주소 없음:', company)
            }

            console.log('[DEBUG] 활성화 알림 전송 완료')
          }
        } catch (notifError) {
          console.error('[ERROR] 알림 전송 오류:', notifError)
        }
      } else if (newStatus === 'active') {
        console.log('[DEBUG] 알림 전송 조건 미충족 - company_email:', campaign.company_email)
      }
      
      fetchCampaigns()
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경에 실패했습니다: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleDelete = async (campaign) => {
    if (!confirm(`⚠️ 정말로 이 캠페인을 삭제하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      const client = getRegionClient(campaign.region)
      
      if (!client) {
        throw new Error(`Invalid region: ${campaign.region}`)
      }

      const { error } = await client
        .from('campaigns')
        .delete()
        .eq('id', campaign.id)

      if (error) {
        throw error
      }

      alert('캠페인이 삭제되었습니다.')
      fetchCampaigns()
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('캠페인 삭제에 실패했습니다: ' + error.message)
    }
  }

  const getFilteredCampaigns = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab)
    if (!currentTab) return []

    return campaigns.filter(campaign => {
      const statusMatch = campaign.status === currentTab.status
      const approvalMatch = campaign.approval_status === currentTab.approval_status
      return statusMatch && approvalMatch
    })
  }

  const filteredCampaigns = getFilteredCampaigns()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">캠페인 관리</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label} ({campaigns.filter(c => c.status === tab.status && c.approval_status === tab.approval_status).length})
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            캠페인이 없습니다.
          </div>
        ) : (
          filteredCampaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">{campaign.campaign_name || campaign.title || '제목 없음'}</h3>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                      {campaign.region?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{campaign.brand || campaign.brand_name || '브랜드 없음'}</p>
                  <p className="text-sm text-gray-500 mb-4">{campaign.description || campaign.product_description || '설명 없음'}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">모집 인원:</span> {campaign.total_slots || campaign.target_creators || 0}명
                    </div>
                    <div>
                      <span className="font-medium">남은 인원:</span> {campaign.remaining_slots || campaign.total_slots || 0}명
                    </div>
                    <div>
                      <span className="font-medium">시작일:</span> {campaign.recruitment_start_date || campaign.start_date ? new Date(campaign.recruitment_start_date || campaign.start_date).toLocaleDateString('ko-KR') : '미정'}
                    </div>
                    <div>
                      <span className="font-medium">마감일:</span> {campaign.recruitment_deadline || campaign.end_date ? new Date(campaign.recruitment_deadline || campaign.end_date).toLocaleDateString('ko-KR') : '미정'}
                    </div>
                    <div>
                      <span className="font-medium">회사 이메일:</span> {campaign.company_email || '없음'}
                    </div>
                    <div>
                      <span className="font-medium">상태:</span> {campaign.status} / {campaign.approval_status}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {activeTab === 'pending_approval' && (
                    <button
                      onClick={() => handleStatusChange(campaign, 'active')}
                      disabled={confirming}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {confirming ? '처리 중...' : '활성화'}
                    </button>
                  )}
                  {activeTab === 'active' && (
                    <button
                      onClick={() => handleStatusChange(campaign, 'paused')}
                      disabled={confirming}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {confirming ? '처리 중...' : '일시중지'}
                    </button>
                  )}
                  {activeTab === 'paused' && (
                    <button
                      onClick={() => handleStatusChange(campaign, 'active')}
                      disabled={confirming}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {confirming ? '처리 중...' : '재활성화'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(campaign)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CampaignsManagement
