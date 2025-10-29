import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Edit, Save, X } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { useEditMode } from '../../contexts/EditModeContext'

/**
 * 노코드 콘텐츠 편집 시스템
 * 관리자가 웹페이지의 텍스트를 클릭해서 직접 수정할 수 있는 CMS
 */

export default function ContentEditor({ children, contentKey, defaultValue = '', className = '', multiline = false }) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(defaultValue)
  const [originalContent, setOriginalContent] = useState(defaultValue)
  const [isAdmin, setIsAdmin] = useState(false)
  const { editMode } = useEditMode()

  useEffect(() => {
    checkAdminStatus()
    loadContent()
  }, [contentKey])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) return

      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      setIsAdmin(!!adminData)
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  const loadContent = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('page_contents')
        .select('content')
        .eq('content_key', contentKey)
        .maybeSingle()

      if (data) {
        setContent(data.content)
        setOriginalContent(data.content)
      } else {
        setContent(defaultValue)
        setOriginalContent(defaultValue)
      }
    } catch (error) {
      console.log('No content found, using default')
      setContent(defaultValue)
      setOriginalContent(defaultValue)
    }
  }

  const handleSave = async () => {
    try {
      const { error } = await supabaseBiz
        .from('page_contents')
        .upsert({
          content_key: contentKey,
          content: content,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'content_key'
        })

      if (error) throw error

      setOriginalContent(content)
      setIsEditing(false)
      alert('저장되었습니다!')
    } catch (error) {
      console.error('Error saving content:', error)
      alert('저장 실패: ' + error.message)
    }
  }

  const handleCancel = () => {
    setContent(originalContent)
    setIsEditing(false)
  }

  // 관리자가 아니거나 편집 모드가 아니면 일반 텍스트만 표시
  if (!isAdmin || !editMode) {
    return <div className={className}>{content || children || defaultValue}</div>
  }

  return (
    <div className={`relative group ${className}`}>
      {isEditing ? (
        <div className="relative">
          {multiline ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border-2 border-blue-500 rounded min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
            />
          )}
          <div className="flex gap-2 mt-2">
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-1" />
              저장
            </Button>
            <Button
              onClick={handleCancel}
              size="sm"
              variant="outline"
            >
              <X className="w-4 h-4 mr-1" />
              취소
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={`whitespace-pre-wrap ${editMode ? 'ring-2 ring-blue-300 ring-opacity-50 rounded p-2' : ''}`}>
            {content || children || defaultValue}
          </div>
          {editMode && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute -top-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-all"
              title="편집하기"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  )
}

/**
 * 편집 모드 토글 버튼 (관리자 전용)
 */
export function EditModeToggle() {
  const [isAdmin, setIsAdmin] = useState(false)
  const { editMode, setEditMode } = useEditMode()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) return

      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      setIsAdmin(!!adminData)
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={() => setEditMode(!editMode)}
        className={`${
          editMode 
            ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
            : 'bg-blue-600 hover:bg-blue-700'
        } shadow-xl text-lg px-6 py-6`}
      >
        <Edit className="w-5 h-5 mr-2" />
        {editMode ? '편집 모드 ON' : '편집 모드'}
      </Button>
    </div>
  )
}

