import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  FileText,
  ExternalLink,
  Download,
  Eye,
  FileSpreadsheet,
  Presentation,
  FileType
} from 'lucide-react'

/**
 * 외부 가이드 뷰어 컴포넌트
 * 크리에이터 포털에서 PDF 또는 Google URL 가이드를 표시
 */
export default function ExternalGuideViewer({
  type,           // 'pdf' | 'google_slides' | 'google_sheets' | 'google_docs' | 'google_drive' | 'other'
  url,            // Google URL
  fileUrl,        // Supabase Storage PDF URL
  title,          // 가이드 제목
  fileName,       // 원본 파일명
  className = ''
}) {
  const [showPdfPreview, setShowPdfPreview] = useState(false)

  // 타입에 따른 아이콘 및 라벨
  const getTypeInfo = () => {
    switch (type) {
      case 'pdf':
        return {
          icon: FileText,
          label: 'PDF 문서',
          color: 'red',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        }
      case 'google_slides':
        return {
          icon: Presentation,
          label: 'Google 슬라이드',
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        }
      case 'google_sheets':
        return {
          icon: FileSpreadsheet,
          label: 'Google 시트',
          color: 'green',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        }
      case 'google_docs':
        return {
          icon: FileType,
          label: 'Google 독스',
          color: 'blue',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        }
      case 'google_drive':
        return {
          icon: FileText,
          label: 'Google 드라이브',
          color: 'blue',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        }
      default:
        return {
          icon: ExternalLink,
          label: '외부 링크',
          color: 'gray',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200'
        }
    }
  }

  const typeInfo = getTypeInfo()
  const Icon = typeInfo.icon
  const finalUrl = type === 'pdf' ? fileUrl : url

  if (!finalUrl) {
    return (
      <div className={`p-6 bg-gray-50 rounded-lg text-center ${className}`}>
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">가이드가 아직 등록되지 않았습니다.</p>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* 가이드 카드 */}
      <div className={`rounded-xl border-2 ${typeInfo.borderColor} ${typeInfo.bgColor} overflow-hidden`}>
        {/* 헤더 */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl bg-white shadow-sm`}>
              <Icon className={`w-8 h-8 ${typeInfo.textColor}`} />
            </div>
            <div className="flex-1">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor} border ${typeInfo.borderColor} mb-2`}>
                {typeInfo.label}
              </span>
              <h3 className="text-xl font-bold text-gray-900">
                {title || '촬영 가이드'}
              </h3>
              {fileName && type === 'pdf' && (
                <p className="text-sm text-gray-500 mt-1">{fileName}</p>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="px-6 pb-6">
          <div className="flex gap-3">
            {type === 'pdf' ? (
              <>
                <Button
                  onClick={() => setShowPdfPreview(!showPdfPreview)}
                  variant="outline"
                  className="flex-1 bg-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPdfPreview ? '미리보기 닫기' : '미리보기'}
                </Button>
                <Button
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  다운로드
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.open(url, '_blank')}
                className={`flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {typeInfo.label}에서 열기
              </Button>
            )}
          </div>
        </div>

        {/* PDF 미리보기 (iframe) */}
        {type === 'pdf' && showPdfPreview && (
          <div className="border-t border-gray-200">
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              className="w-full h-[600px]"
              title="PDF Preview"
            />
          </div>
        )}
      </div>

      {/* 안내 문구 */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          {type === 'pdf' ? (
            <>
              <strong>안내:</strong> PDF 파일을 다운로드하거나 미리보기로 확인하신 후, 가이드에 따라 콘텐츠를 제작해주세요.
            </>
          ) : (
            <>
              <strong>안내:</strong> 버튼을 클릭하면 새 탭에서 가이드 문서가 열립니다. 가이드 내용을 확인하신 후 콘텐츠를 제작해주세요.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
