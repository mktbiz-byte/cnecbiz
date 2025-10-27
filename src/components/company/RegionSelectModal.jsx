import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'

export default function RegionSelectModal({ isOpen, open, onClose, onSelectRegion }) {
  const navigate = useNavigate()
  const modalOpen = isOpen !== false && open !== false
  if (!modalOpen) return null
  
  const handleSelectRegion = (regionId) => {
    if (onSelectRegion) {
      onSelectRegion(regionId)
    } else {
      // 기본 동작: 해당 지역의 캠페인 생성 페이지로 이동
      navigate(`/company/campaigns/create/${regionId}`)
    }
    if (onClose) onClose()
  }

  const regions = [
    {
      id: 'korea',
      name: '대한민국',
      flag: '🇰🇷',
      description: 'cnec-kr 캠페인 생성',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      id: 'japan',
      name: '일본',
      flag: '🇯🇵',
      description: 'cnec.jp 캠페인 생성',
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      id: 'us',
      name: '미국',
      flag: '🇺🇸',
      description: 'cnec-us.com 캠페인 생성',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      id: 'taiwan',
      name: '대만',
      flag: '🇹🇼',
      description: 'cnec-tw.com 캠페인 생성',
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">캠페인을 생성할 나라를 선택하세요</h2>
          <Button variant="ghost" size="sm" onClick={() => onClose && onClose()}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regions.map((region) => (
              <Card
                key={region.id}
                className={`cursor-pointer transition-all ${region.color} border-2`}
                onClick={() => handleSelectRegion(region.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{region.flag}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{region.name}</h3>
                      <p className="text-sm text-gray-600">{region.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            선택한 나라의 Supabase 데이터베이스에 캠페인이 생성됩니다
          </p>
        </div>
      </div>
    </div>
  )
}

