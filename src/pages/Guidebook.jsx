import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz } from '@/lib/supabaseClients'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, Users, TrendingUp, FileText, 
  DollarSign, Target, Zap, Sparkles
} from 'lucide-react'
import { marked } from 'marked'

export default function Guidebook() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [sections, setSections] = useState([])
  const [content, setContent] = useState({})

  const sectionIcons = {
    overview: BookOpen,
    features: Sparkles,
    workflow: Target,
    creator: Users,
    campaign: TrendingUp,
    revenue: DollarSign,
    contract: FileText,
    tips: Zap
  }

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('guidebook_sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error

      setSections(data || [])
      
      // 콘텐츠 객체 생성 (Markdown을 HTML로 변환)
      const contentObj = {}
      data?.forEach(section => {
        // Markdown을 HTML로 변환
        const htmlContent = section.content ? marked.parse(section.content) : ''
        contentObj[section.section_id] = htmlContent
      })
      setContent(contentObj)

      // 첫 번째 섹션을 기본 활성화
      if (data && data.length > 0) {
        setActiveSection(data[0].section_id)
      }
    } catch (error) {
      console.error('섹션 조회 오류:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CNEC BIZ 가이드북
                </h1>
                <p className="text-sm text-gray-600">글로벌 인플루언서 마케팅 통합 관리 플랫폼</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => navigate('/login')}>
                로그인
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => navigate('/signup')}
              >
                무료로 시작하기
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <section className="py-8 px-4 bg-white border-b sticky top-[73px] z-40">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {sections.map((section) => {
              const Icon = sectionIcons[section.section_id] || BookOpen
              return (
                <button
                  key={section.section_id}
                  onClick={() => setActiveSection(section.section_id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    activeSection === section.section_id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{section.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: content[activeSection] || '<p class="text-gray-600">콘텐츠를 불러오는 중...</p>' }}
          />

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
            <h3 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h3>
            <p className="text-xl mb-8 opacity-90">
              14일 만에 완성하는 글로벌 인플루언서 마케팅
            </p>
            <Button 
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => navigate('/signup')}
            >
              무료로 시작하기
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2">CNEC BIZ</h3>
            <p className="text-gray-400">글로벌 인플루언서 마케팅 통합 관리 플랫폼</p>
          </div>
          <div className="text-gray-500 text-sm">
            © 2025 CNEC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

