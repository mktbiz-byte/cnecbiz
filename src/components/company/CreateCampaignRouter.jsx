import { useSearchParams, useParams, Navigate } from 'react-router-dom'
import CreateCampaignKorea from './CreateCampaignKorea'
import CreateCampaign from './CreateCampaign'
import CreateCampaignJapan from './CreateCampaignJapan'

export default function CreateCampaignRouter() {
  const [searchParams] = useSearchParams()
  const params = useParams()
  const region = params.region || searchParams.get('region')

  // 나라별로 다른 컴포넌트 렌더링
  switch (region) {
    case 'korea':
      return <CreateCampaignKorea />
    case 'japan':
      // 일본은 전용 컴포넌트 사용
      return <CreateCampaignJapan />
    case 'us':
    case 'taiwan':
      // 미국, 대만은 기존 CreateCampaign 사용
      return <CreateCampaign />
    default:
      // region이 없으면 캠페인 목록으로 리다이렉트
      return <Navigate to="/company/campaigns" replace />
  }
}

