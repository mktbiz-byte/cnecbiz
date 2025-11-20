import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, Download, Trash2 } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function GuidePDFManager() {
  const [guides, setGuides] = useState({
    regular: null,
    oliveyoung: null,
    fourweek: null
  })
  const [uploading, setUploading] = useState({
    regular: false,
    oliveyoung: false,
    fourweek: false
  })

  const guideTypes = [
    { key: 'regular', label: '기획형 캠페인', color: 'blue' },
    { key: 'oliveyoung', label: '올영세일 캠페인', color: 'green' },
    { key: 'fourweek', label: '4주 챌린지', color: 'purple' }
  ]

  useEffect(() => {
    loadGuides()
  }, [])

  const loadGuides = async () => {
    try {
      // Supabase Storage에서 가이드 PDF 목록 조회
      const { data: files, error } = await supabaseBiz
        .storage
        .from('campaign-guides')
        .list()

      if (error) throw error

      const guideFiles = {
        regular: files?.find(f => f.name.includes('regular') || f.name.includes('기획형')),
        oliveyoung: files?.find(f => f.name.includes('oliveyoung') || f.name.includes('올영')),
        fourweek: files?.find(f => f.name.includes('4week') || f.name.includes('4주'))
      }

      setGuides(guideFiles)
    } catch (error) {
      console.error('Error loading guides:', error)
    }
  }

  const handleFileUpload = async (type, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.')
      return
    }

    setUploading(prev => ({ ...prev, [type]: true }))

    try {
      const fileName = `${type}_guide_${Date.now()}.pdf`
      
      // 기존 파일 삭제
      if (guides[type]) {
        await supabaseBiz
          .storage
          .from('campaign-guides')
          .remove([guides[type].name])
      }

      // 새 파일 업로드
      const { error: uploadError } = await supabaseBiz
        .storage
        .from('campaign-guides')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      alert('가이드 PDF가 업로드되었습니다!')
      await loadGuides()
    } catch (error) {
      console.error('Upload error:', error)
      alert('업로드 실패: ' + error.message)
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleDownload = async (type) => {
    if (!guides[type]) return

    try {
      const { data, error } = await supabaseBiz
        .storage
        .from('campaign-guides')
        .download(guides[type].name)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = guides[type].name
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('다운로드 실패: ' + error.message)
    }
  }

  const handleDelete = async (type) => {
    if (!guides[type]) return
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .storage
        .from('campaign-guides')
        .remove([guides[type].name])

      if (error) throw error

      alert('가이드 PDF가 삭제되었습니다.')
      await loadGuides()
    } catch (error) {
      console.error('Delete error:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">캠페인 가이드 PDF 관리</h1>
        <p className="text-gray-600">각 캠페인 타입별 가이드 PDF를 업로드하고 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {guideTypes.map(({ key, label, color }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className={`w-5 h-5 text-${color}-600`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {guides[key] ? (
                <div className="space-y-3">
                  <Badge className={`bg-${color}-100 text-${color}-800`}>
                    업로드됨
                  </Badge>
                  <p className="text-sm text-gray-600 break-all">
                    {guides[key].name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(guides[key].created_at).toLocaleDateString('ko-KR')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(key)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      다운로드
                    </Button>
                    <Button
                      onClick={() => handleDelete(key)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">
                    업로드된 가이드가 없습니다
                  </p>
                </div>
              )}

              <div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(key, e)}
                  className="hidden"
                  id={`upload-${key}`}
                  disabled={uploading[key]}
                />
                <label htmlFor={`upload-${key}`}>
                  <Button
                    as="span"
                    className="w-full cursor-pointer"
                    disabled={uploading[key]}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading[key] ? '업로드 중...' : guides[key] ? '교체하기' : '업로드'}
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
