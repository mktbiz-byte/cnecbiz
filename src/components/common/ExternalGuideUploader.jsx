import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Link as LinkIcon,
  Upload,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'

/**
 * 외부 가이드 업로드 컴포넌트
 * PDF 파일 업로드 또는 Google URL 입력
 */
export default function ExternalGuideUploader({
  value = {},  // { type, url, fileUrl, fileName, title }
  onChange,
  campaignId,
  prefix = '',  // 주차별/STEP별 구분용 (예: 'week1_', 'step1_')
  className = ''
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState(value.type || 'url')
  const fileInputRef = useRef(null)

  const client = supabaseKorea || supabaseBiz

  // Google URL 패턴 검증
  const isValidGoogleUrl = (url) => {
    if (!url) return false
    const googlePatterns = [
      /^https:\/\/docs\.google\.com\/presentation/,  // Google Slides
      /^https:\/\/docs\.google\.com\/spreadsheets/,  // Google Sheets
      /^https:\/\/docs\.google\.com\/document/,      // Google Docs
      /^https:\/\/drive\.google\.com/                 // Google Drive
    ]
    return googlePatterns.some(pattern => pattern.test(url))
  }

  // URL 타입 자동 감지
  const detectUrlType = (url) => {
    if (!url) return 'other'
    if (url.includes('docs.google.com/presentation')) return 'google_slides'
    if (url.includes('docs.google.com/spreadsheets')) return 'google_sheets'
    if (url.includes('docs.google.com/document')) return 'google_docs'
    if (url.includes('drive.google.com')) return 'google_drive'
    return 'other'
  }

  // URL 입력 처리
  const handleUrlChange = (url) => {
    const detectedType = detectUrlType(url)
    onChange({
      ...value,
      type: detectedType,
      url: url,
      fileUrl: null,
      fileName: null
    })
  }

  // 제목 입력 처리
  const handleTitleChange = (title) => {
    onChange({
      ...value,
      title
    })
  }

  // PDF 파일 업로드 처리
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.')
      return
    }

    if (file.size > 50 * 1024 * 1024) {  // 50MB 제한
      alert('파일 크기는 50MB 이하만 가능합니다.')
      return
    }

    setUploading(true)

    try {
      const timestamp = Date.now()
      const fileName = `guides/${prefix}guide_${campaignId}_${timestamp}.pdf`

      // 기존 파일이 있으면 삭제
      if (value.fileUrl && value.fileName) {
        try {
          await client
            .storage
            .from('campaign-images')
            .remove([value.fileName])
        } catch (e) {
          console.warn('기존 파일 삭제 실패:', e)
        }
      }

      // 새 파일 업로드
      const { error: uploadError } = await client
        .storage
        .from('campaign-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Public URL 가져오기
      const { data: { publicUrl } } = client
        .storage
        .from('campaign-images')
        .getPublicUrl(fileName)

      onChange({
        type: 'pdf',
        url: null,
        fileUrl: publicUrl,
        fileName: fileName,
        originalFileName: file.name,
        title: value.title || file.name.replace('.pdf', '')
      })

      alert('파일이 업로드되었습니다.')
    } catch (error) {
      console.error('Upload error:', error)
      alert('업로드 실패: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 파일 삭제 처리
  const handleFileRemove = async () => {
    if (!value.fileName) return
    if (!confirm('업로드된 파일을 삭제하시겠습니까?')) return

    try {
      await client
        .storage
        .from('campaign-images')
        .remove([value.fileName])

      onChange({
        type: 'url',
        url: null,
        fileUrl: null,
        fileName: null,
        originalFileName: null,
        title: ''
      })
    } catch (error) {
      console.error('Delete error:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  const isGoogleUrl = isValidGoogleUrl(value.url)
  const hasFile = !!value.fileUrl
  const hasUrl = !!value.url

  return (
    <div className={`bg-white rounded-lg border p-6 space-y-4 ${className}`}>
      {/* 타입 선택 탭 */}
      <div className="flex gap-2 border-b pb-3">
        <button
          type="button"
          onClick={() => setUploadType('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            uploadType === 'url'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          Google URL
        </button>
        <button
          type="button"
          onClick={() => setUploadType('pdf')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            uploadType === 'pdf'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          PDF 업로드
        </button>
      </div>

      {/* Google URL 입력 */}
      {uploadType === 'url' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google 슬라이드 / 시트 / 독스 URL
            </label>
            <Input
              type="url"
              value={value.url || ''}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://docs.google.com/presentation/d/..."
              className="text-sm"
            />
          </div>

          {/* URL 검증 상태 */}
          {hasUrl && (
            <div className={`flex items-start gap-2 p-3 rounded-lg ${
              isGoogleUrl ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              {isGoogleUrl ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">
                      {value.type === 'google_slides' && 'Google 슬라이드'}
                      {value.type === 'google_sheets' && 'Google 시트'}
                      {value.type === 'google_docs' && 'Google 독스'}
                      {value.type === 'google_drive' && 'Google 드라이브'}
                      {' '}URL이 확인되었습니다.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Google 문서 URL이 아닙니다.</p>
                    <p>일반 URL도 사용 가능하지만, 접근이 제한될 수 있습니다.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Google 문서 공유 경고 */}
          {hasUrl && isGoogleUrl && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold">중요: 공유 설정을 확인해주세요!</p>
                <p className="mt-1">
                  Google 문서가 <strong>"링크가 있는 모든 사용자"</strong>로 공유되어 있어야
                  크리에이터가 가이드를 볼 수 있습니다.
                </p>
                <p className="mt-1 text-orange-700">
                  제한된 공유 설정일 경우, 크리에이터가 가이드에 접근하지 못할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF 업로드 */}
      {uploadType === 'pdf' && (
        <div className="space-y-3">
          {hasFile ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {value.originalFileName || value.fileName}
                  </p>
                  <a
                    href={value.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    미리보기 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFileRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-3">
                PDF 파일을 업로드해주세요 (최대 50MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id={`${prefix}pdf-upload`}
                disabled={uploading}
              />
              <label htmlFor={`${prefix}pdf-upload`}>
                <Button
                  type="button"
                  disabled={uploading}
                  className="cursor-pointer"
                  asChild
                >
                  <span>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        파일 선택
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          )}
        </div>
      )}

      {/* 가이드 제목 입력 */}
      {(hasFile || hasUrl) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            가이드 제목 (크리에이터에게 표시)
          </label>
          <Input
            type="text"
            value={value.title || ''}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="예: 2024 신제품 촬영 가이드"
            className="text-sm"
          />
        </div>
      )}
    </div>
  )
}
