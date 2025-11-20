import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CampaignDetail from '../company/CampaignDetail'

export default function AdminCampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const region = searchParams.get('region') || 'korea'

  // 관리자도 회사 페이지와 동일한 CampaignDetail 컴포넌트 사용
  // 모든 기능(AI 가이드 생성, 가이드 확인, 송장번호 입력 등)이 포함됨
  return <CampaignDetail />
}
