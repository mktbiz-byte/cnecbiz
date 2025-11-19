import React, { useState } from 'react'
import { FileText, Video, MessageSquare, ExternalLink, Calendar, Instagram } from 'lucide-react'

export default function WeeklyGuideViewer({ guide, referenceUrl, deadline, weekNumber }) {
  const [activeTab, setActiveTab] = useState('features')
  
  // 가이드 텍스트를 섹션별로 파싱
  const parseGuide = (text) => {
    const sections = {
      features: '', // 제품 특징 및 소구포인트
      dialogue: '', // 필수 대사
      scenes: '',   // 필수 촬영 장면
      partnership: '' // 파트너십 광고코드
    }
    
    // 섹션 구분자를 찾아서 분리
    const lines = text.split('\n')
    let currentSection = 'features'
    
    for (const line of lines) {
      if (line.includes('제품 특징') || line.includes('소구포인트') || line.includes('개요')) {
        currentSection = 'features'
      } else if (line.includes('필수 대사') || line.includes('대사')) {
        currentSection = 'dialogue'
      } else if (line.includes('필수 촬영') || line.includes('촬영 장면') || line.includes('장면')) {
        currentSection = 'scenes'
      } else if (line.includes('파트너십') || line.includes('광고코드')) {
        currentSection = 'partnership'
      } else if (!line.includes('목표') && !line.includes('오프닝') && !line.includes('클로징')) {
        // 목표, 오프닝, 클로징 섹션은 무시
        sections[currentSection] += line + '\n'
      }
    }
    
    return sections
  }
  
  const sections = parseGuide(guide)
  
  const tabs = [
    { id: 'features', label: '제품 특징 및 소구포인트', icon: FileText, color: 'blue' },
    { id: 'dialogue', label: '필수 대사', icon: MessageSquare, color: 'purple' },
    { id: 'scenes', label: '필수 촬영 장면', icon: Video, color: 'green' },
    { id: 'partnership', label: '파트너십 광고코드', icon: Instagram, color: 'pink' }
  ]
  
  const getColorClasses = (color, isActive) => {
    const colors = {
      blue: isActive 
        ? 'bg-blue-500 text-white border-blue-600' 
        : 'text-blue-700 hover:bg-blue-50 border-blue-200',
      purple: isActive 
        ? 'bg-purple-500 text-white border-purple-600' 
        : 'text-purple-700 hover:bg-purple-50 border-purple-200',
      green: isActive 
        ? 'bg-green-500 text-white border-green-600' 
        : 'text-green-700 hover:bg-green-50 border-green-200',
      pink: isActive 
        ? 'bg-pink-500 text-white border-pink-600' 
        : 'text-pink-700 hover:bg-pink-50 border-pink-200'
    }
    return colors[color]
  }
  
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-blue-200 rounded-xl overflow-hidden shadow-lg">
      {/* PPT 스타일 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Week {weekNumber} 가이드</h3>
            <p className="text-blue-100 text-sm">크리에이터 전달용 상세 가이드</p>
          </div>
          {deadline && (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <div className="text-right">
                <p className="text-xs text-blue-100">마감일</p>
                <p className="font-bold">{deadline}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 레퍼런스 링크 */}
      {referenceUrl && (
        <div className="bg-yellow-50 border-b-2 border-yellow-200 p-3">
          <a
            href={referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-yellow-800 hover:text-yellow-900 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            📎 참고 레퍼런스 보기 (클릭)
          </a>
        </div>
      )}
      
      {/* PPT 스타일 탭 네비게이션 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-white border-b-2 border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all border-2 flex items-center justify-center gap-2 ${
                getColorClasses(tab.color, isActive)
              } ${isActive ? 'shadow-lg scale-105' : 'shadow'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>
      
      {/* PPT 스타일 컨텐츠 영역 */}
      <div className="p-6 bg-white">
        <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 min-h-[300px]">
          {/* 섹션 타이틀 */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-200">
            {tabs.find(t => t.id === activeTab) && (
              <>
                {React.createElement(tabs.find(t => t.id === activeTab).icon, { 
                  className: `w-6 h-6 text-${tabs.find(t => t.id === activeTab).color}-600` 
                })}
                <h4 className="text-xl font-bold text-gray-800">
                  {tabs.find(t => t.id === activeTab).label}
                </h4>
              </>
            )}
          </div>
          
          {/* 컨텐츠 */}
          <div className="prose prose-sm max-w-none">
            {activeTab === 'partnership' && (
              <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-pink-800 font-semibold mb-2">
                  <Instagram className="w-5 h-5" />
                  <span>⚠️ 인스타그램 전용 기능</span>
                </div>
                <p className="text-sm text-pink-700">
                  파트너십 광고코드는 인스타그램에서만 사용 가능합니다.
                </p>
              </div>
            )}
            
            <pre className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed font-sans bg-white p-4 rounded-lg border border-gray-200">
              {sections[activeTab] || '내용이 없습니다.'}
            </pre>
          </div>
        </div>
      </div>
      
      {/* PPT 스타일 푸터 */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 border-t-2 border-gray-300">
        <p className="text-center text-sm text-gray-600">
          💡 각 탭을 클릭하여 상세 가이드를 확인하세요
        </p>
      </div>
    </div>
  )
}
