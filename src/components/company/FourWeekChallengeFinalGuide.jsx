import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseKorea, supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Send, Eye, RefreshCw, ArrowLeft } from 'lucide-react'

export default function FourWeekChallengeFinalGuide() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const campaignId = searchParams.get('id')
  const region = searchParams.get('region') || 'korea'

  const [campaign, setCampaign] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingId, setGeneratingId] = useState(null) // 개별 생성 중인 participant ID
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [weeklyGuides, setWeeklyGuides] = useState({}) // {participantId: {week1: guide, week2: guide, ...}}
  const [previewData, setPreviewData] = useState(null) // {participant, weekNumber, guide}
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })

  const isJapan = region === 'japan'
  const isUS = region === 'us'
  const isKorea = region === 'korea'

  // 리전별 Supabase 클라이언트
  const getClient = () => {
    if (isJapan) return getSupabaseClient('japan')
    if (isUS) return getSupabaseClient('us')
    return supabaseKorea || supabaseBiz
  }

  useEffect(() => {
    loadCampaignData()
  }, [campaignId, region])

  const loadCampaignData = async () => {
    try {
      setLoading(true)

      const client = getClient()
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

  const generateWeeklyGuide = async (participant, weekNumber) => {
    try {
      setGeneratingId(participant.id)

      // challenge_weekly_guides_ai is TEXT - parse if needed
      let challengeGuideDataEn = campaign.challenge_guide_data_en || {}
      let challengeGuideDataJa = campaign.challenge_guide_data_ja || {}

      const response = await fetch('/.netlify/functions/generate-4week-challenge-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: {
            brand: campaign.brand,
            product_name: campaign.product_name,
            product_description: campaign.product_description,
            product_features: campaign.product_features,
            challenge_weekly_guides: campaign.challenge_weekly_guides,
            challenge_guide_data_en: challengeGuideDataEn,
            challenge_guide_data_ja: challengeGuideDataJa,
          },
          weekNumber,
          individualMessage: participant.additional_message || '',
          creatorName: participant.creator_name || participant.applicant_name,
          region
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || errData.details || '가이드 생성 실패')
      }

      const { guide } = await response.json()

      // 생성된 가이드를 상태에 저장
      setWeeklyGuides(prev => ({
        ...prev,
        [participant.id]: {
          ...(prev[participant.id] || {}),
          [`week${weekNumber}`]: guide
        }
      }))

      // DB에도 저장 (personalized_guide에 JSON 형태로 저장)
      const existingGuides = participant.personalized_guide
        ? (typeof participant.personalized_guide === 'string'
            ? JSON.parse(participant.personalized_guide)
            : participant.personalized_guide)
        : {}

      const updatedGuides = {
        ...existingGuides,
        [`week${weekNumber}`]: guide
      }

      // US/Japan은 Netlify Function으로 저장 (RLS 우회)
      if (isUS || isJapan) {
        const saveResponse = await fetch('/.netlify/functions/save-personalized-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            region,
            applicationId: participant.id,
            guide: updatedGuides
          })
        })
        if (!saveResponse.ok) {
          // Fallback: 직접 저장 시도
          const client = getClient()
          await client
            .from('applications')
            .update({
              personalized_guide: JSON.stringify(updatedGuides),
              guide_generated_at: new Date().toISOString()
            })
            .eq('id', participant.id)
        }
      } else {
        const client = getClient()
        await client
          .from('applications')
          .update({
            personalized_guide: JSON.stringify(updatedGuides),
            guide_generated_at: new Date().toISOString()
          })
          .eq('id', participant.id)
      }

      return guide
    } catch (error) {
      console.error('Error generating weekly guide:', error)
      throw error
    } finally {
      setGeneratingId(null)
    }
  }

  const generateAllGuidesForWeek = async (weekNumber) => {
    if (selectedParticipants.length === 0) {
      alert(isJapan ? 'クリエイターを選択してください。' : isUS ? 'Please select creators.' : '크리에이터를 선택해주세요.')
      return
    }

    const confirmMsg = isJapan
      ? `選択した${selectedParticipants.length}名のクリエイターの第${weekNumber}週ガイドを生成しますか？`
      : isUS
        ? `Generate Week ${weekNumber} guide for ${selectedParticipants.length} selected creators?`
        : `선택한 ${selectedParticipants.length}명의 크리에이터에 대한 ${weekNumber}주차 가이드를 생성하시겠습니까?`

    if (!confirm(confirmMsg)) return

    setGenerating(true)
    setBulkProgress({ current: 0, total: selectedParticipants.length })
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < selectedParticipants.length; i++) {
      const participantId = selectedParticipants[i]
      setBulkProgress({ current: i + 1, total: selectedParticipants.length })
      try {
        const participant = participants.find(p => p.id === participantId)
        if (!participant) continue

        await generateWeeklyGuide(participant, weekNumber)
        successCount++
      } catch (error) {
        console.error(`Error generating guide for ${participantId}:`, error)
        errorCount++
      }
      // Rate limiting
      if (i < selectedParticipants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }

    setGenerating(false)
    setBulkProgress({ current: 0, total: 0 })

    const resultMsg = isJapan
      ? `第${weekNumber}週ガイド生成完了！\n成功: ${successCount}名\n失敗: ${errorCount}名`
      : isUS
        ? `Week ${weekNumber} guide generation complete!\nSuccess: ${successCount}\nFailed: ${errorCount}`
        : `${weekNumber}주차 가이드 생성 완료!\n성공: ${successCount}명\n실패: ${errorCount}명`
    alert(resultMsg)
    await loadCampaignData()
  }

  const sendWeeklyGuides = async (weekNumber) => {
    if (selectedParticipants.length === 0) {
      alert(isJapan ? 'クリエイターを選択してください。' : isUS ? 'Please select creators.' : '크리에이터를 선택해주세요.')
      return
    }

    // 선택된 크리에이터 중 해당 주차 가이드가 없는 사람 확인
    const participantsWithoutGuide = selectedParticipants.filter(id => {
      const participant = participants.find(p => p.id === id)
      const guides = weeklyGuides[id]
      const existingGuide = participant?.personalized_guide
        ? (typeof participant.personalized_guide === 'string'
            ? JSON.parse(participant.personalized_guide)
            : participant.personalized_guide)
        : {}

      return !guides?.[`week${weekNumber}`] && !existingGuide?.[`week${weekNumber}`]
    })

    if (participantsWithoutGuide.length > 0) {
      const msg = isJapan
        ? `第${weekNumber}週のガイドが生成されていないクリエイターがいます。先にガイドを生成してください。`
        : isUS
          ? `Some creators don't have Week ${weekNumber} guide yet. Please generate guides first.`
          : `${weekNumber}주차 가이드가 생성되지 않은 크리에이터가 있습니다. 먼저 가이드를 생성해주세요.`
      alert(msg)
      return
    }

    const confirmMsg = isJapan
      ? `選択した${selectedParticipants.length}名に第${weekNumber}週ガイドを送信しますか？`
      : isUS
        ? `Send Week ${weekNumber} guide to ${selectedParticipants.length} selected creators?`
        : `선택한 ${selectedParticipants.length}명의 크리에이터에게 ${weekNumber}주차 가이드를 발송하시겠습니까?`

    if (!confirm(confirmMsg)) return

    try {
      let successCount = 0
      let errorCount = 0
      const client = getClient()

      for (const participantId of selectedParticipants) {
        try {
          const { error } = await client
            .from('applications')
            .update({
              status: 'filming',
              updated_at: new Date().toISOString()
            })
            .eq('id', participantId)

          if (error) throw error
          successCount++
        } catch (error) {
          console.error(`Error sending guide to ${participantId}:`, error)
          errorCount++
        }
      }

      const resultMsg = isJapan
        ? `第${weekNumber}週ガイド送信完了！\n成功: ${successCount}名\n失敗: ${errorCount}名`
        : isUS
          ? `Week ${weekNumber} guide sent!\nSuccess: ${successCount}\nFailed: ${errorCount}`
          : `${weekNumber}주차 가이드 발송 완료!\n성공: ${successCount}명\n실패: ${errorCount}명`
      alert(resultMsg)
      await loadCampaignData()
      setSelectedParticipants([])
    } catch (error) {
      console.error('Error sending guides:', error)
      alert('가이드 발송 실패: ' + error.message)
    }
  }

  // 리전별 라벨
  const labels = {
    backButton: isJapan ? '← ガイド編集に戻る' : isUS ? '← Back to Guide Editor' : '← 가이드 수정으로 돌아가기',
    title: isJapan ? '4週間チャレンジ 最終ガイド生成・送信' : isUS ? '4-Week Challenge Final Guide Generation & Delivery' : '4주 챌린지 최종 가이드 생성 및 발송',
    weekTab: (w) => isJapan ? `第${w}週` : isUS ? `Week ${w}` : `${w}주차`,
    weekGuideManage: (w) => isJapan ? `第${w}週ガイド管理` : isUS ? `Week ${w} Guide Management` : `${w}주차 가이드 관리`,
    generateBtn: (w) => generating
      ? (isJapan ? `生成中... (${bulkProgress.current}/${bulkProgress.total})` : isUS ? `Generating... (${bulkProgress.current}/${bulkProgress.total})` : `생성 중... (${bulkProgress.current}/${bulkProgress.total})`)
      : (isJapan ? `選択したクリエイター 第${w}週ガイド生成` : isUS ? `Generate Week ${w} Guide for Selected` : `선택한 크리에이터 ${w}주차 가이드 생성`),
    sendBtn: (w) => isJapan ? `選択したクリエイターに第${w}週送信` : isUS ? `Send Week ${w} to Selected` : `선택한 크리에이터에게 ${w}주차 발송`,
    name: isJapan ? '名前' : isUS ? 'Name' : '이름',
    platform: isJapan ? 'プラットフォーム' : isUS ? 'Platform' : '플랫폼',
    message: isJapan ? '個別メッセージ' : isUS ? 'Message' : '개별 메시지',
    guideStatus: (w) => isJapan ? `第${w}週ガイド` : isUS ? `Week ${w} Guide` : `${w}주차 가이드`,
    sendStatus: (w) => isJapan ? `第${w}週送信` : isUS ? `Week ${w} Sent` : `${w}주차 발송`,
    actions: isJapan ? '操作' : isUS ? 'Actions' : '작업',
    generated: isJapan ? '生成済み' : isUS ? 'Generated' : '생성완료',
    notGenerated: isJapan ? '未生成' : isUS ? 'Not Generated' : '미생성',
    written: isJapan ? '✓ 作成済み' : isUS ? '✓ Written' : '✓ 작성됨',
    none: isJapan ? 'なし' : isUS ? 'None' : '없음',
    sent: isJapan ? '送信済み' : isUS ? 'Sent' : '발송완료',
    notSent: isJapan ? '未送信' : isUS ? 'Not Sent' : '미발송',
    previewTitle: (name, w) => isJapan ? `${name} - 第${w}週ガイド` : isUS ? `${name} - Week ${w} Guide` : `${name} - ${w}주차 가이드`,
    noGuide: isJapan ? 'ガイドが生成されていません。' : isUS ? 'Guide has not been generated.' : '가이드가 생성되지 않았습니다.',
    close: isJapan ? '閉じる' : isUS ? 'Close' : '닫기',
  }

  // 뒤로가기 경로
  const guideEditPath = isJapan
    ? `/company/campaigns/guide/4week/japan?id=${campaignId}`
    : isUS
      ? `/company/campaigns/guide/4week/us?id=${campaignId}`
      : `/company/campaigns/guide/4week?id=${campaignId}`

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
        <p className="text-gray-500">{isJapan ? 'キャンペーンが見つかりません。' : isUS ? 'Campaign not found.' : '캠페인을 찾을 수 없습니다.'}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-14 pb-20 lg:pt-8 lg:pb-8 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(guideEditPath)}
          className="mb-4"
        >
          {labels.backButton}
        </Button>

        <h1 className="text-xl lg:text-3xl font-bold mb-2">{labels.title}</h1>
        <p className="text-gray-600 text-sm lg:text-base">{campaign.title}</p>
        {(isUS || isJapan) && (
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
            {isJapan ? '🇯🇵 Japan' : '🇺🇸 US'}
          </span>
        )}
      </div>

      {/* 주차 선택 탭 */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {[1, 2, 3, 4].map(week => (
          <Button
            key={week}
            onClick={() => setSelectedWeek(week)}
            variant={selectedWeek === week ? 'default' : 'outline'}
            className={selectedWeek === week ? 'bg-purple-600' : ''}
          >
            {labels.weekTab(week)}
          </Button>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{labels.weekGuideManage(selectedWeek)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => generateAllGuidesForWeek(selectedWeek)}
              disabled={generating || selectedParticipants.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-sm lg:text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {labels.generateBtn(selectedWeek)}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {labels.generateBtn(selectedWeek)}
                </>
              )}
            </Button>

            <Button
              onClick={() => sendWeeklyGuides(selectedWeek)}
              disabled={selectedParticipants.length === 0 || generating}
              className="bg-green-600 hover:bg-green-700 text-sm lg:text-base"
            >
              <Send className="w-4 h-4 mr-2" />
              {labels.sendBtn(selectedWeek)}
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
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">{labels.name}</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">{labels.platform}</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">{labels.message}</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">{labels.guideStatus(selectedWeek)}</th>
                  <th className="px-3 lg:px-4 py-3 text-left text-sm font-medium text-gray-700">{labels.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {participants.map((participant) => {
                  const existingGuide = participant.personalized_guide
                    ? (typeof participant.personalized_guide === 'string'
                        ? JSON.parse(participant.personalized_guide)
                        : participant.personalized_guide)
                    : {}
                  const hasGuide = weeklyGuides[participant.id]?.[`week${selectedWeek}`] || existingGuide?.[`week${selectedWeek}`]
                  const isCurrentlyGenerating = generatingId === participant.id

                  return (
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
                      <td className="px-4 py-3 font-medium">{participant.creator_name || participant.applicant_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{participant.creator_platform || participant.main_channel || '-'}</td>
                      <td className="px-4 py-3">
                        {participant.additional_message ? (
                          <span className="text-green-600 text-sm">{labels.written}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">{labels.none}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasGuide ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">{labels.generated}</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">{labels.notGenerated}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const guide = weeklyGuides[participant.id]?.[`week${selectedWeek}`] || existingGuide?.[`week${selectedWeek}`]
                              setPreviewData({ participant, weekNumber: selectedWeek, guide })
                            }}
                            disabled={!hasGuide}
                            className="text-purple-600 border-purple-600 hover:bg-purple-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await generateWeeklyGuide(participant, selectedWeek)
                                const msg = isJapan ? `第${selectedWeek}週ガイドが生成されました。` : isUS ? `Week ${selectedWeek} guide generated.` : `${selectedWeek}주차 가이드가 생성되었습니다.`
                                alert(msg)
                              } catch (error) {
                                alert((isUS ? 'Guide generation failed: ' : '가이드 생성 실패: ') + error.message)
                              }
                            }}
                            disabled={generating || isCurrentlyGenerating}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {isCurrentlyGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {participants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {isJapan ? '参加クリエイターがいません。' : isUS ? 'No participating creators found.' : '참여 크리에이터가 없습니다.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 가이드 미리보기 모달 */}
      {previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-lg sm:rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 lg:p-6 border-b">
              <h3 className="text-lg lg:text-xl font-bold">
                {labels.previewTitle(previewData.participant.creator_name || previewData.participant.applicant_name, previewData.weekNumber)}
              </h3>
              <button
                onClick={() => setPreviewData(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm lg:text-base">
                {previewData.guide || labels.noGuide}
              </div>
            </div>

            <div className="flex gap-3 p-4 lg:p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setPreviewData(null)}
                className="flex-1"
              >
                {labels.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
