import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Send, Eye, RefreshCw } from 'lucide-react'

export default function OliveYoungFinalGuide() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const campaignId = searchParams.get('id')
  
  const [campaign, setCampaign] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [finalGuides, setFinalGuides] = useState({}) // {participantId: guideText}
  const [previewParticipant, setPreviewParticipant] = useState(null)

  useEffect(() => {
    loadCampaignData()
  }, [campaignId])

  const loadCampaignData = async () => {
    try {
      setLoading(true)
      
      // 캠페인 정보 로드
      const client = supabaseKorea || supabaseBiz
      const { data: campaignData, error: campaignError } = await client
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // 참여 크리에이터 로드
      const { data: participantsData, error: participantsError } = await client
        .from('applications')
        .select('*')
        .eq('campaign_id', campaignId)
        .in('status', ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed', 'guide_confirmation'])
      
      if (participantsError) throw participantsError
      setParticipants(participantsData || [])
      
    } catch (error) {
      console.error('Error loading campaign data:', error)
      alert('캠페인 데이터 로딩 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateFinalGuide = async (participant) => {
    try {
      setGenerating(true)
      
      // Gemini AI로 최종 가이드 생성
      const response = await fetch('/.netlify/functions/generate-oliveyoung-final-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: {
            brand: campaign.brand,
            product_name: campaign.product_name,
            product_description: campaign.product_description,
            product_features: campaign.product_features,
            product_key_points: campaign.product_key_points,
            oliveyoung_step1_guide: campaign.oliveyoung_step1_guide,
            oliveyoung_step2_guide: campaign.oliveyoung_step2_guide,
            oliveyoung_step3_guide: campaign.oliveyoung_step3_guide,
            required_dialogues: campaign.required_dialogues,
            required_scenes: campaign.required_scenes,
            additional_details: campaign.additional_details,
          },
          individualMessage: participant.personalized_guide || '',
          creatorName: participant.creator_name || participant.applicant_name
        })
      })
      
      if (!response.ok) {
        throw new Error('가이드 생성 실패')
      }
      
      const { guide } = await response.json()
      
      // 생성된 가이드를 상태에 저장
      setFinalGuides(prev => ({
        ...prev,
        [participant.id]: guide
      }))
      
      // DB에도 저장
      const client = supabaseKorea || supabaseBiz
      await client
        .from('applications')
        .update({
          personalized_guide: guide,
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', participant.id)
      
      return guide
    } catch (error) {
      console.error('Error generating final guide:', error)
      throw error
    } finally {
      setGenerating(false)
    }
  }

  const generateAllGuides = async () => {
    if (selectedParticipants.length === 0) {
      alert('크리에이터를 선택해주세요.')
      return
    }
    
    if (!confirm(`선택한 ${selectedParticipants.length}명의 크리에이터에 대한 최종 가이드를 생성하시겠습니까?`)) {
      return
    }
    
    setGenerating(true)
    let successCount = 0
    let errorCount = 0
    
    for (const participantId of selectedParticipants) {
      try {
        const participant = participants.find(p => p.id === participantId)
        if (!participant) continue
        
        await generateFinalGuide(participant)
        successCount++
      } catch (error) {
        console.error(`Error generating guide for ${participantId}:`, error)
        errorCount++
      }
    }
    
    setGenerating(false)
    alert(`가이드 생성 완료!\n성공: ${successCount}명\n실패: ${errorCount}명`)
    await loadCampaignData()
  }

  const sendGuidesToCreators = async () => {
    if (selectedParticipants.length === 0) {
      alert('크리에이터를 선택해주세요.')
      return
    }
    
    // 선택된 크리에이터 중 가이드가 없는 사람 확인
    const participantsWithoutGuide = selectedParticipants.filter(id => {
      const participant = participants.find(p => p.id === id)
      return !finalGuides[id] && !participant?.personalized_guide
    })
    
    if (participantsWithoutGuide.length > 0) {
      alert('가이드가 생성되지 않은 크리에이터가 있습니다. 먼저 가이드를 생성해주세요.')
      return
    }
    
    if (!confirm(`선택한 ${selectedParticipants.length}명의 크리에이터에게 가이드를 발송하시겠습니까?`)) {
      return
    }
    
    try {
      let successCount = 0
      let errorCount = 0
      
      for (const participantId of selectedParticipants) {
        try {
          const client = supabaseKorea || supabaseBiz
          const { error } = await client
            .from('applications')
            .update({
              guide_confirmed: true,
              guide_sent: true,
              guide_sent_at: new Date().toISOString(),
              status: 'filming'
            })
            .eq('id', participantId)
          
          if (error) throw error
          successCount++
        } catch (error) {
          console.error(`Error sending guide to ${participantId}:`, error)
          errorCount++
        }
      }
      
      alert(`가이드 발송 완료!\n성공: ${successCount}명\n실패: ${errorCount}명`)
      await loadCampaignData()
      setSelectedParticipants([])
    } catch (error) {
      console.error('Error sending guides:', error)
      alert('가이드 발송 실패: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">캠페인을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-14 pb-20 lg:pt-8 lg:pb-8 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${campaignId}`)}
          className="mb-4"
        >
          ← 가이드 수정으로 돌아가기
        </Button>

        <h1 className="text-xl lg:text-3xl font-bold mb-2">올리브영 최종 가이드 생성 및 발송</h1>
        <p className="text-gray-600">{campaign.title}</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>참여 크리에이터 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={generateAllGuides}
              disabled={generating || selectedParticipants.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-sm lg:text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  선택한 크리에이터 가이드 생성
                </>
              )}
            </Button>

            <Button
              onClick={sendGuidesToCreators}
              disabled={selectedParticipants.length === 0}
              className="bg-green-600 hover:bg-green-700 text-sm lg:text-base"
            >
              <Send className="w-4 h-4 mr-2" />
              선택한 크리에이터에게 발송
            </Button>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 lg:px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.length === participants.length && participants.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParticipants(participants.map(p => p.id))
                        } else {
                          setSelectedParticipants([])
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">이름</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">플랫폼</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">개별 메시지</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">가이드 상태</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">발송 상태</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {participants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants([...selectedParticipants, participant.id])
                          } else {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id))
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3">{participant.creator_name || participant.applicant_name}</td>
                    <td className="px-4 py-3">{participant.creator_platform || participant.main_channel || '-'}</td>
                    <td className="px-4 py-3">
                      {participant.personalized_guide ? (
                        <span className="text-green-600 text-sm">✓ 작성됨</span>
                      ) : (
                        <span className="text-gray-400 text-sm">없음</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {finalGuides[participant.id] || participant.personalized_guide ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">생성완료</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">미생성</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {participant.guide_sent ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">발송완료</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">미발송</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewParticipant(participant)}
                          disabled={!finalGuides[participant.id] && !participant.personalized_guide}
                          className="text-purple-600 border-purple-600 hover:bg-purple-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await generateFinalGuide(participant)
                              alert('가이드가 생성되었습니다.')
                            } catch (error) {
                              alert('가이드 생성 실패: ' + error.message)
                            }
                          }}
                          disabled={generating}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 가이드 미리보기 모달 */}
      {previewParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-lg sm:rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 lg:p-6 border-b">
              <h3 className="text-lg lg:text-xl font-bold">
                {previewParticipant.creator_name || previewParticipant.applicant_name} - 최종 가이드
              </h3>
              <button
                onClick={() => setPreviewParticipant(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm lg:text-base">
                {finalGuides[previewParticipant.id] || previewParticipant.personalized_guide || '가이드가 생성되지 않았습니다.'}
              </div>
            </div>

            <div className="flex gap-3 p-4 lg:p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setPreviewParticipant(null)}
                className="flex-1"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
