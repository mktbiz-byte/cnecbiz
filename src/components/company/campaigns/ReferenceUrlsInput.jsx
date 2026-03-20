import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'

export default function ReferenceUrlsInput({ urls = [], onChange }) {
  const [newUrl, setNewUrl] = useState('')

  const addUrl = () => {
    const trimmed = newUrl.trim()
    if (!trimmed) return
    onChange([...urls, trimmed])
    setNewUrl('')
  }

  const removeUrl = (index) => {
    onChange(urls.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addUrl()
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-700">참고 콘텐츠 (레퍼런스)</label>
      <p className="text-xs text-gray-500">참고할 콘텐츠 URL을 추가해주세요.</p>

      {urls.map((url, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={url}
            readOnly
            className="flex-1 bg-gray-50 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeUrl(index)}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://..."
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addUrl}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          추가
        </Button>
      </div>
    </div>
  )
}
