import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Edit, Save, X } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

/**
 * 노코드 콘텐츠 편집 시스템
 * 관리자가 웹페이지의 텍스트를 클릭해서 직접 수정할 수 있는 CMS
 */

export default function ContentEditor({ children, contentKey, defaultValue = '', className = '' }) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(defaultValue)
  const [originalContent, setOriginalContent] = useState(defaultValue)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    checkAdminStatus()
    loadContent()
  }, [contentKey])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) return

      const { data: adminData } = await supabaseBiz
        .from('admins')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single()

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
        .single()

      if (data) {
        setContent(data.content)
        setOriginalContent(data.content)
      }
    } catch (error) {
      // 콘텐츠가 없으면 기본값 사용
      console.log('No content found, using default')
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

  if (!isAdmin) {
    return <div className={className}>{content || children}</div>
  }

  return (
    <div className={`relative group ${className}`}>
      {isEditing ? (
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border-2 border-blue-500 rounded min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
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
          <div className="whitespace-pre-wrap">{content || children}</div>
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white p-1 rounded"
            title="편집하기"
          >
            <Edit className="w-4 h-4" />
          </button>
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
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) return

      const { data: adminData } = await supabaseBiz
        .from('admins')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single()

      setIsAdmin(!!adminData)
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setEditMode(!editMode)}
        className={`${
          editMode 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        } shadow-lg`}
      >
        <Edit className="w-4 h-4 mr-2" />
        {editMode ? '편집 모드 ON' : '편집 모드 OFF'}
      </Button>
    </div>
  )
}

