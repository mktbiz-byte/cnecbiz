import React, { useState } from 'react'
import { FileText, Target, Video, MessageSquare, Package, Search, Film, ExternalLink } from 'lucide-react'

export default function WeeklyGuideViewer({ guide, referenceUrl }) {
  const [activeTab, setActiveTab] = useState('overview')
  
  // 가이드 텍스트를 섹션별로 파싱
  const parseGuide = (text) => {
    const sections = {
      overview: '',
      goal: '',
      opening: '',
      filming: '',
      message: '',
      unboxing: '',
      verification: '',
      closing: ''
    }
    
    // 섹션 구분자를 찾아서 분리
    const lines = text.split('\n')
    let currentSection = 'overview'
    
    for (const line of lines) {
      if (line.includes('콘텐츠 개요') || line.includes('개요')) {
        currentSection = 'overview'
      } else if (line.includes('목표')) {
        currentSection = 'goal'
      } else if (line.includes('오프닝')) {
        currentSection = 'opening'
      } else if (line.includes('촬영 가이드') || line.includes('구체적 장면 구성')) {
        currentSection = 'filming'
      } else if (line.includes('메시지')) {
        currentSection = 'message'
      } else if (line.includes('제품 언박싱') || line.includes('소개')) {
        currentSection = 'unboxing'
      } else if (line.includes('피부 상태 검증') || line.includes('상태 검증')) {
        currentSection = 'verification'
      } else if (line.includes('클로징')) {
        currentSection = 'closing'
      } else {
        sections[currentSection] += line + '\n'
      }
    }
    
    return sections
  }
  
  const sections = parseGuide(guide)
  
  const tabs = [
    { id: 'overview', label: '개요', icon: FileText },
    { id: 'goal', label: '목표', icon: Target },
    { id: 'opening', label: '오프닝', icon: Film },
    { id: 'filming', label: '촬영', icon: Video },
    { id: 'message', label: '메시지', icon: MessageSquare },
    { id: 'unboxing', label: '언박싱', icon: Package },
    { id: 'verification', label: '검증', icon: Search },
    { id: 'closing', label: '클로징', icon: Film }
  ]
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div className="bg-green-100 p-3 border-b border-green-200 flex items-center justify-between">
        <p className="text-sm font-semibold text-green-800">✓ 생성된 가이드</p>
        {referenceUrl && (
          <a
            href={referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            레퍼런스 보기
          </a>
        )}
      </div>
      
      {/* 탭 버튼 */}
      <div className="flex overflow-x-auto bg-white border-b border-green-200 scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-green-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>
      
      {/* 탭 컨텐츠 */}
      <div className="p-4 bg-white max-h-96 overflow-y-auto">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
          {sections[activeTab] || '내용이 없습니다.'}
        </pre>
      </div>
    </div>
  )
}
