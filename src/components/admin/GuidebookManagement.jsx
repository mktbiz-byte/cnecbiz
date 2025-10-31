import { useState, useEffect } from 'react'
import { supabaseBiz } from '@/lib/supabaseClients'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Eye, RefreshCw } from 'lucide-react'


export default function GuidebookManagement() {
  const [sections, setSections] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [content, setContent] = useState({})
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const sectionList = [
    { id: 'overview', title: '개요', order: 1 },
    { id: 'features', title: '주요 기능', order: 2 },
    { id: 'workflow', title: '업무 프로세스', order: 3 },
    { id: 'creator', title: '크리에이터 관리', order: 4 },
    { id: 'campaign', title: '캠페인 운영', order: 5 },
    { id: 'revenue', title: '매출 관리', order: 6 },
    { id: 'contract', title: '전자계약서', order: 7 },
    { id: 'tips', title: '활용 팁', order: 8 }
  ]

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('guidebook_sections')
        .select('*')
        .order('display_order')

      if (error) throw error

      setSections(data || [])
      
      // 콘텐츠 객체 생성
      const contentObj = {}
      data?.forEach(section => {
        contentObj[section.section_id] = section.content || ''
      })
      setContent(contentObj)

      // 데이터가 없으면 초기 데이터 생성
      if (!data || data.length === 0) {
        await initializeSections()
      }
    } catch (error) {
      console.error('섹션 조회 오류:', error)
    }
  }

  const initializeSections = async () => {
    try {
      const initialData = sectionList.map(section => ({
        section_id: section.id,
        title: section.title,
        content: getDefaultContent(section.id),
        display_order: section.order,
        is_active: true
      }))

      const { error } = await supabaseBiz
        .from('guidebook_sections')
        .insert(initialData)

      if (error) throw error

      await fetchSections()
      alert('초기 데이터가 생성되었습니다.')
    } catch (error) {
      console.error('초기화 오류:', error)
      alert('초기화에 실패했습니다.')
    }
  }

  const getDefaultContent = (sectionId) => {
    const defaults = {
      overview: `
        <div class="space-y-8">
          <div>
            <h3 class="text-3xl font-bold text-gray-900 mb-4">CNEC BIZ란?</h3>
            <p class="text-lg text-gray-700 leading-relaxed mb-6">
              CNEC BIZ는 K-뷰티 브랜드의 글로벌 진출을 위한 인플루언서 마케팅 통합 관리 플랫폼입니다. 
              일본, 미국, 대만 등 주요 시장의 검증된 크리에이터와 연결하여, 
              14일 만에 완성도 높은 숏폼 콘텐츠를 제작하고 배포합니다.
            </p>
          </div>
          
          <div class="grid md:grid-cols-3 gap-6">
            <div class="p-6 bg-white rounded-lg shadow-md border-2 border-blue-100">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 class="text-xl font-bold text-gray-900 mb-2">검증된 크리에이터</h4>
              <p class="text-gray-600">
                엄격한 심사를 통과한 500+ 크리에이터 네트워크
              </p>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-2 border-purple-100">
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 class="text-xl font-bold text-gray-900 mb-2">빠른 제작</h4>
              <p class="text-gray-600">
                14일 만에 완성하는 전문 숏폼 콘텐츠
              </p>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-2 border-green-100">
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 class="text-xl font-bold text-gray-900 mb-2">데이터 기반 분석</h4>
              <p class="text-gray-600">
                실시간 성과 추적 및 ROI 분석
              </p>
            </div>
          </div>
        </div>
      `,
      features: `
        <div class="space-y-8">
          <div>
            <h3 class="text-3xl font-bold text-gray-900 mb-4">주요 기능</h3>
            <p class="text-lg text-gray-700 leading-relaxed mb-8">
              CNEC BIZ는 인플루언서 마케팅의 모든 과정을 하나의 플랫폼에서 관리할 수 있습니다.
            </p>
          </div>

          <div class="grid md:grid-cols-2 gap-6">
            <div class="p-6 bg-white rounded-lg shadow-md border-2 border-blue-100 hover:border-blue-300 transition-all">
              <h4 class="text-xl font-bold text-gray-900 mb-4">크리에이터 관리</h4>
              <ul class="space-y-3 text-gray-600">
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>추천 크리에이터 매칭 시스템</span>
                </li>
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>소속/전체 크리에이터 통합 관리</span>
                </li>
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>출금 요청 및 정산 자동화</span>
                </li>
              </ul>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-2 border-purple-100 hover:border-purple-300 transition-all">
              <h4 class="text-xl font-bold text-gray-900 mb-4">캠페인 운영</h4>
              <ul class="space-y-3 text-gray-600">
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>캠페인 생성 및 진행 상태 관리</span>
                </li>
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>크리에이터 매칭 및 계약</span>
                </li>
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>콘텐츠 제작 일정 관리</span>
                </li>
              </ul>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-2 border-green-100 hover:border-green-300 transition-all">
              <h4 class="text-xl font-bold text-gray-900 mb-4">매출 관리</h4>
              <ul class="space-y-3 text-gray-600">
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>실시간 매출 현황 대시보드</span>
                </li>
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>비용 구성 및 순이익 분석</span>
                </li>
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>미수금 관리 및 포인트 충전</span>
                </li>
              </ul>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-2 border-orange-100 hover:border-orange-300 transition-all">
              <h4 class="text-xl font-bold text-gray-900 mb-4">전자계약서</h4>
              <ul class="space-y-3 text-gray-600">
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>기업용/크리에이터용 계약서 템플릿</span>
                </li>
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>전자 서명 및 도장 등록</span>
                </li>
                <li class="flex items-start">
                  <span class="text-green-500 mr-2">✓</span>
                  <span>계약 상태 추적 및 관리</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      `,
      workflow: `
        <div class="space-y-8">
          <div>
            <h3 class="text-3xl font-bold text-gray-900 mb-4">업무 프로세스</h3>
            <p class="text-lg text-gray-700 leading-relaxed mb-8">
              CNEC BIZ를 통한 인플루언서 마케팅 캠페인 진행 과정을 소개합니다.
            </p>
          </div>

          <div class="space-y-6">
            <div class="p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-500">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-xl font-bold text-blue-600">1</span>
                </div>
                <div>
                  <h4 class="text-xl font-bold text-gray-900 mb-2">캠페인 기획</h4>
                  <p class="text-gray-600">목표 시장, 예산, 일정을 설정하고 캠페인을 생성합니다.</p>
                </div>
              </div>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-l-4 border-purple-500">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-xl font-bold text-purple-600">2</span>
                </div>
                <div>
                  <h4 class="text-xl font-bold text-gray-900 mb-2">크리에이터 매칭</h4>
                  <p class="text-gray-600">AI 추천 시스템을 통해 최적의 크리에이터를 찾고 제안합니다.</p>
                </div>
              </div>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-l-4 border-green-500">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-xl font-bold text-green-600">3</span>
                </div>
                <div>
                  <h4 class="text-xl font-bold text-gray-900 mb-2">계약 체결</h4>
                  <p class="text-gray-600">전자계약서를 발송하고 서명을 받아 계약을 완료합니다.</p>
                </div>
              </div>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-l-4 border-orange-500">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-xl font-bold text-orange-600">4</span>
                </div>
                <div>
                  <h4 class="text-xl font-bold text-gray-900 mb-2">콘텐츠 제작</h4>
                  <p class="text-gray-600">크리에이터가 14일 이내에 숏폼 콘텐츠를 제작합니다.</p>
                </div>
              </div>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-l-4 border-red-500">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-xl font-bold text-red-600">5</span>
                </div>
                <div>
                  <h4 class="text-xl font-bold text-gray-900 mb-2">검수 및 배포</h4>
                  <p class="text-gray-600">제작된 콘텐츠를 검수하고 각 플랫폼에 배포합니다.</p>
                </div>
              </div>
            </div>

            <div class="p-6 bg-white rounded-lg shadow-md border-l-4 border-indigo-500">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-xl font-bold text-indigo-600">6</span>
                </div>
                <div>
                  <h4 class="text-xl font-bold text-gray-900 mb-2">성과 분석</h4>
                  <p class="text-gray-600">조회수, 참여율 등 성과 지표를 실시간으로 추적합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    }

    return defaults[sectionId] || `<div class="text-gray-600"><p>${sectionList.find(s => s.id === sectionId)?.title} 섹션의 내용을 입력하세요.</p></div>`
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const section = sections.find(s => s.section_id === activeTab)
      
      if (section) {
        // 업데이트
        const { error } = await supabaseBiz
          .from('guidebook_sections')
          .update({ 
            content: content[activeTab],
            updated_at: new Date().toISOString()
          })
          .eq('section_id', activeTab)

        if (error) throw error
      }

      alert('저장되었습니다.')
      await fetchSections()
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">가이드북 관리</h1>
            <p className="text-gray-600 mt-2">각 섹션의 HTML 콘텐츠를 수정할 수 있습니다.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchSections}>
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
            <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? '편집 모드' : '미리보기'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {sectionList.map(section => (
              <TabsTrigger key={section.id} value={section.id}>
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {sectionList.map(section => (
            <TabsContent key={section.id} value={section.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {previewMode ? (
                    <div 
                      className="prose max-w-none p-6 bg-gray-50 rounded-lg"
                      dangerouslySetInnerHTML={{ __html: content[section.id] || '' }}
                    />
                  ) : (
                    <textarea
                      className="w-full h-[600px] p-4 border rounded-lg font-mono text-sm"
                      value={content[section.id] || ''}
                      onChange={(e) => setContent({ ...content, [section.id]: e.target.value })}
                      placeholder="HTML 콘텐츠를 입력하세요..."
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

