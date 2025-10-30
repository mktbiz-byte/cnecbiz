import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Download, Printer } from 'lucide-react'

/**
 * 계약서 미리보기 모달
 * @param {boolean} open - 모달 열림 상태
 * @param {function} onOpenChange - 모달 상태 변경 함수
 * @param {string} title - 계약서 제목
 * @param {string} htmlContent - 계약서 HTML 내용
 */
export default function ContractPreviewModal({ open, onOpenChange, title, htmlContent }) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                인쇄
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                다운로드
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            계약서 템플릿 미리보기입니다. 실제 발송 시에는 고객 정보가 자동으로 채워집니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg bg-white p-6">
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

