import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Link } from 'lucide-react'

export default function CnecShopLinkGenerator({ productUrl, discountCode, campaignId, onChange }) {
  const [utmLink, setUtmLink] = useState('')

  useEffect(() => {
    if (!productUrl?.trim()) {
      setUtmLink('')
      return
    }
    try {
      const url = new URL(productUrl.trim())
      url.searchParams.set('utm_source', 'instagram')
      url.searchParams.set('utm_medium', 'story')
      if (campaignId) url.searchParams.set('utm_campaign', campaignId)
      const generated = url.toString()
      setUtmLink(generated)
      onChange?.({ cnec_shop_utm_link: generated })
    } catch {
      setUtmLink('')
    }
  }, [productUrl, campaignId])

  return (
    <div className="space-y-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-teal-600" />
        <label className="text-sm font-semibold text-teal-800">크넥샵 연결</label>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">크넥샵 제품 링크</label>
          <Input
            value={productUrl || ''}
            onChange={(e) => onChange?.({ cnec_shop_product_url: e.target.value })}
            placeholder="https://cnec-shop.com/product/..."
            className="text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">할인 코드 (선택)</label>
          <Input
            value={discountCode || ''}
            onChange={(e) => onChange?.({ discount_code: e.target.value })}
            placeholder="BEAUTY15"
            className="text-sm"
          />
        </div>

        {utmLink && (
          <div>
            <label className="text-xs text-gray-600 mb-1 block">UTM 링크 (자동 생성)</label>
            <Input
              value={utmLink}
              readOnly
              className="text-xs bg-gray-50 text-gray-600"
            />
          </div>
        )}
      </div>
    </div>
  )
}
