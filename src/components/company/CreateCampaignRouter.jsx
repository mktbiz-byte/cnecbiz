import { useSearchParams, Navigate } from 'react-router-dom'
import CreateCampaignKorea from './CreateCampaignKorea'
import CreateCampaign from './CreateCampaign'

export default function CreateCampaignRouter() {
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region')

  // 나라별로 다른 컴포넌트 렌더링
  switch (region) {
    case 'korea':
      return <CreateCampaignKorea />
    case 'japan':
    case 'us':
    case 'taiwan':
      // 일본, 미국, 대만은 기존 CreateCampaign 사용 (추후 개별 컴포넌트로 분리 가능)
      return <CreateCampaign />
    default:
      // region이 없으면 캠페인 목록으로 리다이렉트
      return <Navigate to="/company/campaigns" replace />
  }
}

