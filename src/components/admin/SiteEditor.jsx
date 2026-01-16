import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Loader2, Edit, Globe, FileText } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function SiteEditor() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contents, setContents] = useState({
    // Hero Section
    hero_title: 'CNEC BIZ와 함께 글로벌 마케팅, CNEC BIZ와 함께 캠페인 가동합니다',
    hero_subtitle: '14일 만에 완성되는 글로벌 마케팅. CNEC BIZ와 함께 캠페인 가동합니다',
    hero_cta: '무료로 시작하기',
    
    // Features Section
    features_title: '왜 CNEC BIZ를 선택해야 하나요?',
    features_subtitle: '글로벌 크리에이터 마케팅을 쉽고 빠르게',
    feature1_title: '🌏 글로벌 크리에이터 네트워크',
    feature1_desc: '한국, 일본, 미국, 대만 등 전 세계 크리에이터와 연결',
    feature2_title: '⚡ 빠른 캠페인 실행',
    feature2_desc: '14일 만에 캠페인 기획부터 실행까지 완료',
    feature3_title: '📊 데이터 기반 매칭',
    feature3_desc: 'AI 기반 크리에이터 매칭으로 최적의 결과 보장',
    feature4_title: '💰 합리적인 비용',
    feature4_desc: '중개 수수료 없이 직접 크리에이터와 협업',
    
    // How It Works Section
    how_title: '어떻게 작동하나요?',
    how_subtitle: '간단한 4단계로 글로벌 마케팅 시작',
    step1_title: '1. 캠페인 등록',
    step1_desc: '제품과 목표를 입력하고 캠페인을 생성하세요',
    step2_title: '2. 크리에이터 매칭',
    step2_desc: 'AI가 최적의 크리에이터를 추천합니다',
    step3_title: '3. 협업 시작',
    step3_desc: '선택한 크리에이터와 직접 소통하며 콘텐츠 제작',
    step4_title: '4. 성과 분석',
    step4_desc: '실시간 데이터로 캠페인 성과를 확인하세요',
    
    // CTA Section
    cta_title: '지금 바로 시작하세요',
    cta_subtitle: '14일 만에 완성되는 글로벌 마케팅',
    cta_button: '무료로 시작하기',
    
    // Footer
    footer_company_name: '주식회사 하우파파',
    footer_business_number: '575-81-02253',
    footer_sales_number: '2022-서울마포-3903호',
    footer_address: '서울 중구 퇴계로36길 2 동국대학교 충무로 영상센터 1009호',
    footer_email: 'howpapa@howpapa.co.kr',
    footer_phone: '1833-6025',
    footer_ceo: '박현용',
    footer_privacy_officer: '이지훈'
  })

  useEffect(() => {
    loadContents()
  }, [])

  const loadContents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('page_contents')
        .select('*')
        .eq('page_name', 'landing')

      if (error) {
        console.error('콘텐츠 로드 오류:', error)
        return
      }

      if (data && data.length > 0) {
        const loadedContents = {}
        data.forEach(item => {
          loadedContents[item.section_key] = item.content
        })
        setContents(prev => ({ ...prev, ...loadedContents }))
      }
    } catch (error) {
      console.error('콘텐츠 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 모든 콘텐츠를 page_contents 테이블에 저장
      const promises = Object.entries(contents).map(async ([key, value]) => {
        const { error } = await supabaseBiz
          .from('page_contents')
          .upsert({
            page_name: 'landing',
            section_key: key,
            content: value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'page_name,section_key'
          })

        if (error) throw error
      })

      await Promise.all(promises)
      alert('저장되었습니다! 랜딩페이지를 새로고침하면 변경사항이 반영됩니다.')
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key, value) => {
    setContents(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                변경사항 저장
              </>
            )}
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-600" />
            사이트 편집
          </h1>
          <p className="text-gray-600">랜딩페이지의 텍스트를 수정하고 저장하세요</p>
        </div>

        <div className="space-y-6">
          {/* Hero Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                메인 히어로 섹션
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">메인 제목</label>
                <Input
                  value={contents.hero_title}
                  onChange={(e) => handleChange('hero_title', e.target.value)}
                  placeholder="메인 제목"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">부제목</label>
                <Input
                  value={contents.hero_subtitle}
                  onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                  placeholder="부제목"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CTA 버튼 텍스트</label>
                <Input
                  value={contents.hero_cta}
                  onChange={(e) => handleChange('hero_cta', e.target.value)}
                  placeholder="CTA 버튼"
                />
              </div>
            </CardContent>
          </Card>

          {/* Features Section */}
          <Card>
            <CardHeader>
              <CardTitle>주요 기능 섹션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">섹션 제목</label>
                <Input
                  value={contents.features_title}
                  onChange={(e) => handleChange('features_title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">섹션 부제목</label>
                <Input
                  value={contents.features_subtitle}
                  onChange={(e) => handleChange('features_subtitle', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">기능 1 제목</label>
                  <Input
                    value={contents.feature1_title}
                    onChange={(e) => handleChange('feature1_title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">기능 1 설명</label>
                  <Input
                    value={contents.feature1_desc}
                    onChange={(e) => handleChange('feature1_desc', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">기능 2 제목</label>
                  <Input
                    value={contents.feature2_title}
                    onChange={(e) => handleChange('feature2_title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">기능 2 설명</label>
                  <Input
                    value={contents.feature2_desc}
                    onChange={(e) => handleChange('feature2_desc', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">기능 3 제목</label>
                  <Input
                    value={contents.feature3_title}
                    onChange={(e) => handleChange('feature3_title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">기능 3 설명</label>
                  <Input
                    value={contents.feature3_desc}
                    onChange={(e) => handleChange('feature3_desc', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">기능 4 제목</label>
                  <Input
                    value={contents.feature4_title}
                    onChange={(e) => handleChange('feature4_title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">기능 4 설명</label>
                  <Input
                    value={contents.feature4_desc}
                    onChange={(e) => handleChange('feature4_desc', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works Section */}
          <Card>
            <CardHeader>
              <CardTitle>작동 방식 섹션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">섹션 제목</label>
                <Input
                  value={contents.how_title}
                  onChange={(e) => handleChange('how_title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">섹션 부제목</label>
                <Input
                  value={contents.how_subtitle}
                  onChange={(e) => handleChange('how_subtitle', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                {[1, 2, 3, 4].map(num => (
                  <>
                    <div key={`step${num}_title`}>
                      <label className="block text-sm font-medium mb-2">단계 {num} 제목</label>
                      <Input
                        value={contents[`step${num}_title`]}
                        onChange={(e) => handleChange(`step${num}_title`, e.target.value)}
                      />
                    </div>
                    <div key={`step${num}_desc`}>
                      <label className="block text-sm font-medium mb-2">단계 {num} 설명</label>
                      <Input
                        value={contents[`step${num}_desc`]}
                        onChange={(e) => handleChange(`step${num}_desc`, e.target.value)}
                      />
                    </div>
                  </>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Card>
            <CardHeader>
              <CardTitle>CTA 섹션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">CTA 제목</label>
                <Input
                  value={contents.cta_title}
                  onChange={(e) => handleChange('cta_title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CTA 부제목</label>
                <Input
                  value={contents.cta_subtitle}
                  onChange={(e) => handleChange('cta_subtitle', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CTA 버튼 텍스트</label>
                <Input
                  value={contents.cta_button}
                  onChange={(e) => handleChange('cta_button', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Footer Section */}
          <Card>
            <CardHeader>
              <CardTitle>푸터 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">회사명</label>
                  <Input
                    value={contents.footer_company_name}
                    onChange={(e) => handleChange('footer_company_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">대표자명</label>
                  <Input
                    value={contents.footer_ceo}
                    onChange={(e) => handleChange('footer_ceo', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">사업자등록번호</label>
                  <Input
                    value={contents.footer_business_number}
                    onChange={(e) => handleChange('footer_business_number', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">통신판매업 신고번호</label>
                  <Input
                    value={contents.footer_sales_number}
                    onChange={(e) => handleChange('footer_sales_number', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">주소</label>
                  <Input
                    value={contents.footer_address}
                    onChange={(e) => handleChange('footer_address', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">이메일</label>
                  <Input
                    value={contents.footer_email}
                    onChange={(e) => handleChange('footer_email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">전화번호</label>
                  <Input
                    value={contents.footer_phone}
                    onChange={(e) => handleChange('footer_phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">개인정보보호책임자</label>
                  <Input
                    value={contents.footer_privacy_officer}
                    onChange={(e) => handleChange('footer_privacy_officer', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 하단 저장 버튼 */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                변경사항 저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

