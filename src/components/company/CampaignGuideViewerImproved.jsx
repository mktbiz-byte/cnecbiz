import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Edit, Save, X, Sparkles, CheckCircle } from 'lucide-react'

export default function CampaignGuideViewerImproved({ aiGuide, onUpdate, onGenerate, generating }) {
  const [activeTab, setActiveTab] = useState('product_intro')
  const [editingSection, setEditingSection] = useState(null)
  const [editValue, setEditValue] = useState('')

  const tabs = [
    { id: 'product_intro', label: '제품 소개', icon: '📝' },
    { id: 'video_concepts', label: '영상 컨셉', icon: '🎬' },
    { id: 'must_include', label: '필수 포함', icon: '✨' },
    { id: 'filming_tips', label: '촬영 팁', icon: '📸' },
    { id: 'cautions', label: '주의사항', icon: '⚠️' }
  ]

  const startEdit = (section, value) => {
    setEditingSection(section)
    setEditValue(Array.isArray(value) ? value.join('\n') : value)
  }

  const cancelEdit = () => {
    setEditingSection(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    const newValue = editingSection === 'product_intro' 
      ? editValue 
      : editValue.split('\n').filter(line => line.trim())
    
    const updatedGuide = {
      ...aiGuide,
      [editingSection]: newValue
    }
    
    await onUpdate(updatedGuide)
    setEditingSection(null)
    setEditValue('')
  }

  const generateSection = async (section) => {
    await onGenerate(section)
  }

  const renderContent = (section) => {
    const content = aiGuide?.[section]
    const isEditing = editingSection === section

    if (isEditing) {
      return (
        <div className="space-y-4">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder={section === 'product_intro' ? '제품 소개 내용을 입력하세요...' : '각 줄에 하나씩 입력하세요...'}
          />
          <div className="flex gap-2">
            <Button onClick={saveEdit} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              저장
            </Button>
            <Button onClick={cancelEdit} variant="outline">
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
          </div>
        </div>
      )
    }

    if (!content || (Array.isArray(content) && content.length === 0)) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">아직 생성되지 않은 섹션입니다</p>
          <Button 
            onClick={() => generateSection(section)}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI로 생성하기
              </>
            )}
          </Button>
        </div>
      )
    }

    if (section === 'product_intro') {
      return (
        <div className="prose max-w-none">
          <p className="text-base leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      )
    }

    return (
      <ul className="space-y-3">
        {content.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
              {idx + 1}
            </span>
            <span className="text-gray-700 flex-1">{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (!aiGuide) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Sparkles className="h-16 w-16 mx-auto text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              AI 가이드를 생성해주세요
            </h3>
            <p className="text-gray-600 mb-6">
              캠페인 정보를 바탕으로 크리에이터를 위한 가이드를 자동 생성합니다
            </p>
            <Button 
              onClick={() => onGenerate('all')}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              {generating ? (
                <>
                  <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  AI 가이드 생성하기
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">
            {tabs.find(t => t.id === activeTab)?.icon} {tabs.find(t => t.id === activeTab)?.label}
          </CardTitle>
          {editingSection !== activeTab && aiGuide[activeTab] && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEdit(activeTab, aiGuide[activeTab])}
            >
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {renderContent(activeTab)}
        </CardContent>
      </Card>

      {/* 전체 재생성 버튼 */}
      <div className="flex justify-center">
        <Button
          onClick={() => onGenerate('all')}
          disabled={generating}
          variant="outline"
          size="lg"
        >
          {generating ? (
            <>
              <Sparkles className="h-5 w-5 mr-2 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              전체 가이드 재생성
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
