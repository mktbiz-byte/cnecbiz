import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Edit, Save, X, Send, FileText, Sparkles, Copy, Check, Eye } from 'lucide-react'

const EXPOSURE_LABELS = {
  unboxing: '언박싱',
  usage_scene: '사용 장면',
  before_after: '비포애프터'
}

const SLIDE_LABELS = {
  '1': '1장 (15초)',
  '2_3': '2~3장 연속'
}

/**
 * 캠페인 정보를 기반으로 기본 가이드 생성
 */
function generateDefaultGuide(campaign) {
  const exposureLabel = EXPOSURE_LABELS[campaign.story_exposure_type] || campaign.story_exposure_type || ''
  const slideLabel = SLIDE_LABELS[campaign.story_slide_count] || campaign.story_slide_count || '1장'

  return {
    title: `${campaign.brand || ''} ${campaign.product_name || ''} 스토리 촬영 가이드`,
    sections: [
      {
        heading: '캠페인 개요',
        content: `브랜드: ${campaign.brand || '-'}\n제품: ${campaign.product_name || '-'}\n스토리 장수: ${slideLabel}`
      },
      {
        heading: '필수 키워드',
        content: `아래 키워드를 영상 내 텍스트로 삽입하거나, 직접 말해주세요.\n\n"${campaign.story_required_keyword || ''}"`
      },
      {
        heading: '제품 노출 방식',
        content: `"${exposureLabel}" 방식으로 제품을 노출해주세요.${
          campaign.story_exposure_type === 'unboxing'
            ? '\n- 택배 개봉 → 제품 확인 → 첫인상 리액션'
            : campaign.story_exposure_type === 'usage_scene'
              ? '\n- 일상 속 자연스러운 사용 장면을 촬영해주세요.'
              : campaign.story_exposure_type === 'before_after'
                ? '\n- 사용 전/후 변화를 명확하게 보여주세요.'
                : ''
        }`
      },
      {
        heading: '영상 톤/분위기',
        content: campaign.story_tone_guide || '자연스럽고 친근한 톤으로 촬영해주세요.'
      },
      {
        heading: '구매 링크',
        content: `아래 링크를 스토리 스와이프업에 반드시 첨부해주세요.\n${campaign.story_swipe_link || ''}`
      },
      {
        heading: '금지사항',
        content: campaign.story_restrictions || '특별한 금지사항 없음'
      },
      {
        heading: '제출물',
        content: '1. 클린본 영상 (워터마크/로고 없는 원본)\n2. 스토리 업로드 스크린샷'
      },
      {
        heading: '업로드 마감',
        content: campaign.end_date
          ? new Date(campaign.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
          : '추후 안내'
      }
    ]
  }
}

/**
 * 가이드를 텍스트로 변환 (복사/발송용)
 */
function guideToText(guide) {
  if (!guide) return ''
  let text = `📋 ${guide.title}\n${'─'.repeat(30)}\n\n`
  guide.sections.forEach(s => {
    text += `▸ ${s.heading}\n${s.content}\n\n`
  })
  return text.trim()
}

export default function StoryGuideEditor({ campaign, region, participants, onGuideUpdated }) {
  const [guide, setGuide] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editGuide, setEditGuide] = useState(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (campaign?.story_guide_content) {
      setGuide(campaign.story_guide_content)
    }
  }, [campaign?.story_guide_content])

  const handleGenerate = () => {
    const defaultGuide = generateDefaultGuide(campaign)
    setGuide(defaultGuide)
    setEditGuide(JSON.parse(JSON.stringify(defaultGuide)))
    setIsEditing(true)
  }

  const handleEdit = () => {
    setEditGuide(JSON.parse(JSON.stringify(guide)))
    setIsEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onGuideUpdated(editGuide)
      setGuide(editGuide)
      setIsEditing(false)
    } catch (err) {
      console.error('가이드 저장 실패:', err)
      alert('가이드 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditGuide(null)
    setIsEditing(false)
  }

  const handleSectionChange = (index, field, value) => {
    setEditGuide(prev => {
      const updated = { ...prev, sections: [...prev.sections] }
      updated.sections[index] = { ...updated.sections[index], [field]: value }
      return updated
    })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(guideToText(guide))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendGuide = async () => {
    const selected = participants?.filter(p =>
      ['selected', 'virtual_selected', 'approved'].includes(p.status)
    ) || []

    if (selected.length === 0) {
      alert('선정된 크리에이터가 없습니다. 먼저 크리에이터를 선정해주세요.')
      return
    }

    if (!guide) {
      alert('가이드를 먼저 생성해주세요.')
      return
    }

    if (!confirm(`선정된 ${selected.length}명의 크리에이터에게 스토리 가이드를 발송하시겠습니까?`)) return

    try {
      // 각 크리에이터의 applications에 personalized_guide 저장 + status를 guide_sent로 변경
      const { getSupabaseClient } = await import('../../lib/supabaseClients')
      const client = getSupabaseClient(region)
      if (!client) throw new Error('DB 클라이언트를 찾을 수 없습니다.')

      let successCount = 0
      for (const p of selected) {
        // 크리에이터별 UTM 링크 생성
        const creatorGuide = JSON.parse(JSON.stringify(guide))
        if (campaign.story_swipe_link) {
          const utmLink = `${campaign.story_swipe_link}${campaign.story_swipe_link.includes('?') ? '&' : '?'}utm_source=cnec&utm_medium=story&utm_campaign=${campaign.id}&utm_content=${p.user_id || p.id}`
          const linkSection = creatorGuide.sections.find(s => s.heading === '구매 링크')
          if (linkSection) {
            linkSection.content = `아래 링크를 스토리 스와이프업에 반드시 첨부해주세요.\n${utmLink}`
          }
        }

        const { error } = await client
          .from('applications')
          .update({
            personalized_guide: JSON.stringify(creatorGuide),
            status: 'guide_sent'
          })
          .eq('id', p.id)

        if (!error) successCount++
      }

      alert(`${successCount}명에게 가이드를 발송했습니다.`)

      // 알림톡 발송 (한국)
      if (region === 'korea') {
        for (const p of selected) {
          const phone = p.phone || p.phone_number || p.creator_phone
          const name = p.creator_name || p.applicant_name || '크리에이터'
          if (phone) {
            try {
              await fetch('/.netlify/functions/send-kakao-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: phone.replace(/-/g, ''),
                  receiverName: name,
                  templateCode: '025100001012',
                  variables: {
                    '크리에이터명': name,
                    '캠페인명': campaign?.title || '캠페인',
                    '제출기한': campaign.end_date
                      ? new Date(campaign.end_date).toLocaleDateString('ko-KR')
                      : '추후 안내'
                  }
                })
              })
            } catch (e) {
              console.error('알림톡 발송 실패:', e)
            }
          }
        }
      }

      // 참가자 목록 새로고침을 위해 페이지 리로드
      window.location.reload()
    } catch (err) {
      console.error('가이드 발송 실패:', err)
      alert('가이드 발송에 실패했습니다: ' + err.message)
    }
  }

  const selectedCount = participants?.filter(p =>
    ['selected', 'virtual_selected', 'approved'].includes(p.status)
  ).length || 0

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-teal-100/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Send className="w-4 h-4 text-white" />
            </div>
            크리에이터 가이드
          </CardTitle>
          <div className="flex items-center gap-2">
            {guide && !isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopy} className="text-gray-600">
                  {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? '복사됨' : '복사'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleEdit} className="text-gray-600 hover:text-teal-600">
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  수정
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendGuide}
                  disabled={selectedCount === 0}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  가이드 발송 ({selectedCount}명)
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-teal-500 hover:bg-teal-600 text-white">
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {saving ? '저장 중...' : '저장'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  취소
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!guide && !isEditing ? (
          // 가이드 미생성 상태
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-2">캠페인 정보를 기반으로 가이드를 생성하세요</p>
            <p className="text-sm text-gray-500 mb-6">생성된 가이드를 수정한 후 선정된 크리에이터에게 발송할 수 있습니다.</p>
            <Button onClick={handleGenerate} className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-6">
              <Sparkles className="w-4 h-4 mr-2" />
              기본 가이드 생성
            </Button>
          </div>
        ) : isEditing && editGuide ? (
          // 편집 모드
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">가이드 제목</label>
              <Input
                value={editGuide.title}
                onChange={e => setEditGuide(prev => ({ ...prev, title: e.target.value }))}
                className="font-semibold"
              />
            </div>
            {editGuide.sections.map((section, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-2">
                <Input
                  value={section.heading}
                  onChange={e => handleSectionChange(idx, 'heading', e.target.value)}
                  className="font-semibold text-sm bg-white"
                  placeholder="섹션 제목"
                />
                <Textarea
                  value={section.content}
                  onChange={e => handleSectionChange(idx, 'content', e.target.value)}
                  rows={Math.max(2, section.content.split('\n').length)}
                  className="text-sm bg-white resize-none"
                  placeholder="내용"
                />
              </div>
            ))}
          </div>
        ) : guide ? (
          // 읽기 모드
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{guide.title}</h3>
            {guide.sections.map((section, idx) => (
              <div key={idx} className="border-l-3 border-teal-300 pl-4">
                <h4 className="text-sm font-semibold text-teal-700 mb-1">{section.heading}</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}
            {campaign?.story_reference_image_url && (
              <div className="border-l-3 border-teal-300 pl-4">
                <h4 className="text-sm font-semibold text-teal-700 mb-2">레퍼런스 이미지</h4>
                <img src={campaign.story_reference_image_url} alt="레퍼런스" className="w-32 h-32 rounded-xl object-cover border" />
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
