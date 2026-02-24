/**
 * SNS 업로드 완료 영상 통합 관리 페이지
 * 한국/미국/일본 국가별로 SNS 업로드 완료된 영상을 관리
 * - 멀티비디오 캠페인 그룹화 (4주 챌린지: 4개, 올리브영: 2개)
 * - 영상 미리보기 확장 기능
 * - 캠페인별 필터링
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Download, ExternalLink, Search, RefreshCw,
  Video, Globe, User, Eye, ChevronDown, ChevronUp, Play, X, Film, Image, Loader2
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function SnsUploadManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('all')
  const [completedVideos, setCompletedVideos] = useState([])
  const [filteredVideos, setFilteredVideos] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [downloading, setDownloading] = useState(null)
  const [expandedRows, setExpandedRows] = useState({})
  const [previewVideo, setPreviewVideo] = useState(null)
  // GIF 변환 상태
  const [gifTargetVideo, setGifTargetVideo] = useState(null)
  const [gifStartTime, setGifStartTime] = useState('0')
  const [gifEndTime, setGifEndTime] = useState('3')
  const [gifWidth, setGifWidth] = useState('320')
  const [gifFps, setGifFps] = useState('10')
  const [generatingGif, setGeneratingGif] = useState(false)
  const [gifProgress, setGifProgress] = useState('')
  const [gifResult, setGifResult] = useState(null)

  useEffect(() => {
    checkAuth()
    fetchCompletedVideos()
  }, [])

  useEffect(() => {
    filterVideos()
  }, [completedVideos, selectedCountry, searchTerm, selectedCampaign])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchCompletedVideos = async () => {
    setLoading(true)
    try {
      const allVideos = []
      const campaignSet = new Map()

      // 프로필 맵 & 캠페인 맵 (외부 스코프 - cross-region lookup용)
      let koreaProfileMap = new Map()
      let japanProfileMap = new Map()
      let usProfileMap = new Map()
      let koreaCampaignMap = new Map()
      let japanCampaignMap = new Map()
      let usCampaignMap = new Map()

      // 이메일에서 이름 추출 함수
      const extractNameFromEmail = (email) => {
        if (!email || !email.includes('@')) return null
        const localPart = email.split('@')[0]
        // 숫자만 있는 경우 제외
        if (/^\d+$/.test(localPart)) return null
        // 언더스코어나 점으로 구분된 경우 처리
        const nameParts = localPart.split(/[._]/)
        if (nameParts.length > 1) {
          return nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
        }
        return localPart.charAt(0).toUpperCase() + localPart.slice(1)
      }

      // 1. BIZ DB에서 applications 조회 (JOIN 없이 단순 조회)
      const { data: bizApplications, error: bizAppError } = await supabaseBiz
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (bizAppError) {
        console.error('[SnsUploadManagement] BIZ applications error:', bizAppError)
      }

      // 캠페인 정보 별도 조회 (BIZ DB에는 campaigns 테이블이 없을 수 있음)
      let campaignMap = new Map()
      try {
        const { data: bizCampaigns, error: bizCampError } = await supabaseBiz
          .from('campaigns')
          .select('*')

        if (!bizCampError && bizCampaigns) {
          bizCampaigns.forEach(c => campaignMap.set(c.id, c))
        }
      } catch (e) {
        console.log('[SnsUploadManagement] BIZ campaigns query failed, skipping')
      }

      // 크리에이터 이름 결정 함수 (user_profiles 없이 application 데이터에서 직접 추출)
      const resolveCreatorName = (app) => {
        // null/undefined 체크
        if (!app) return '-'

        // applicant_name이나 creator_name이 이메일이 아닌 경우 사용
        if (app.applicant_name && !app.applicant_name.includes('@')) {
          return app.applicant_name
        }
        if (app.creator_name && !app.creator_name.includes('@')) {
          return app.creator_name
        }
        if (app.name && !app.name.includes('@')) {
          return app.name
        }
        // full_name 필드 체크 (user_profiles와 호환)
        if (app.full_name && !app.full_name.includes('@')) {
          return app.full_name
        }
        // 이메일에서 이름 추출
        const emailName = extractNameFromEmail(app.applicant_name) ||
                         extractNameFromEmail(app.creator_name) ||
                         extractNameFromEmail(app.email)
        if (emailName) {
          return emailName
        }
        // 최종 fallback
        return app.applicant_name || app.creator_name || '-'
      }

      if (!bizAppError && bizApplications) {
        console.log('[SnsUploadManagement] BIZ applications:', bizApplications.length)
        bizApplications.forEach(app => {
          // SNS URL이 있거나 영상 관련 상태인 경우 추가
          const hasSnsUrl = app.sns_upload_url || app.week1_url || app.week2_url ||
                           app.week3_url || app.week4_url || app.step1_url ||
                           app.step2_url || app.step3_url
          const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted', 'submitted'].includes(app.status)

          if (hasSnsUrl || hasVideoStatus) {
            const campaign = campaignMap.get(app.campaign_id)

            // 캠페인 목록에 추가
            if (campaign) {
              campaignSet.set(campaign.id, {
                id: campaign.id,
                title: campaign.title,
                type: campaign.campaign_type
              })
            }

            allVideos.push({
              id: `biz_app_${app.id}`,
              application_id: app.id,
              campaign_id: app.campaign_id,
              user_id: app.user_id,
              sns_upload_url: app.sns_upload_url,
              partnership_code: app.partnership_code,
              video_file_url: app.video_file_url,
              created_at: app.updated_at || app.created_at,
              status: app.status,
              source: 'biz',
              country: campaign?.target_country || 'kr',
              campaignTitle: campaign?.title || campaign?.name || app.campaign_name || '-',
              campaignType: campaign?.campaign_type,
              creatorName: resolveCreatorName(app),
              creatorEmail: app.email,
              // 멀티비디오 URL
              week1_url: app.week1_url,
              week2_url: app.week2_url,
              week3_url: app.week3_url,
              week4_url: app.week4_url,
              step1_url: app.step1_url,
              step2_url: app.step2_url,
              step3_url: app.step3_url,
              // 광고코드
              week1_partnership_code: app.week1_partnership_code,
              week2_partnership_code: app.week2_partnership_code,
              week3_partnership_code: app.week3_partnership_code,
              week4_partnership_code: app.week4_partnership_code,
              step1_2_partnership_code: app.step1_2_partnership_code,
              step3_partnership_code: app.step3_partnership_code,
            })
          }
        })
      }

      // 2. BIZ DB에서 video_submissions 조회 (JOIN 없이 단순 조회)
      const { data: bizSubmissions, error: bizSubError } = await supabaseBiz
        .from('video_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (bizSubError) {
        console.error('[SnsUploadManagement] BIZ video_submissions error:', bizSubError)
      }

      if (!bizSubError && bizSubmissions) {
        console.log('[SnsUploadManagement] BIZ video_submissions:', bizSubmissions.length)
        bizSubmissions.forEach(sub => {
          // 영상 관련 상태인 경우만 추가
          const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted', 'submitted', 'pending'].includes(sub.status)
          if (!hasVideoStatus && !sub.sns_upload_url) return

          const campaign = campaignMap.get(sub.campaign_id)
          const isMultiVideoCampaign = ['4week_challenge', 'oliveyoung', 'oliveyoung_sale'].includes(campaign?.campaign_type)

          // 중복 체크 - 멀티비디오 캠페인은 중복이어도 추가 (나중에 그룹화됨)
          const isDuplicate = allVideos.some(v =>
            v.campaign_id === sub.campaign_id && v.user_id === sub.user_id
          )
          if (!isDuplicate || isMultiVideoCampaign) {

            // 캠페인 목록에 추가
            if (campaign) {
              campaignSet.set(campaign.id, {
                id: campaign.id,
                title: campaign.title,
                type: campaign.campaign_type
              })
            }

            allVideos.push({
              id: `biz_sub_${sub.id}`,
              submission_id: sub.id,
              application_id: sub.application_id,
              campaign_id: sub.campaign_id,
              user_id: sub.user_id,
              sns_upload_url: sub.sns_upload_url,
              partnership_code: sub.partnership_code || sub.ad_code,
              video_file_url: sub.video_file_url,
              created_at: sub.approved_at || sub.updated_at || sub.created_at,
              status: sub.status,
              source: 'biz_submission',
              country: campaign?.target_country || 'kr',
              campaignTitle: campaign?.title || campaign?.name || sub.campaign_name || '-',
              campaignType: campaign?.campaign_type,
              creatorName: resolveCreatorName(sub),
              creatorEmail: sub.email,
              week_number: sub.week_number,
            })
          }
        })
      }

      // 3. Korea DB에서 campaign_participants 조회 (JOIN 없이 단순 조회)
      if (supabaseKorea) {
        // 캠페인 정보 별도 조회
        const { data: koreaCampaigns, error: koreaCampError } = await supabaseKorea
          .from('campaigns')
          .select('*')

        if (koreaCampError) {
          console.error('[SnsUploadManagement] Korea campaigns error:', koreaCampError.message)
        }

        koreaCampaignMap = new Map()
        koreaCampaigns?.forEach(c => koreaCampaignMap.set(c.id, c))
        console.log('[SnsUploadManagement] Korea campaigns loaded:', koreaCampaignMap.size)

        // user_profiles 테이블에서 크리에이터 정보 조회 (오류 발생 시 무시)
        koreaProfileMap = new Map()
        try {
          const { data: koreaProfiles, error: profileError } = await supabaseKorea
            .from('user_profiles')
            .select('*')  // 전체 컬럼 조회 (컬럼명 오류 방지)

          if (!profileError && koreaProfiles) {
            koreaProfiles.forEach(p => {
              if (p.id) koreaProfileMap.set(p.id, p)
              if (p.user_id) koreaProfileMap.set(p.user_id, p)
            })
            console.log('[SnsUploadManagement] Korea user_profiles loaded:', koreaProfiles.length)
          } else if (profileError) {
            console.log('[SnsUploadManagement] user_profiles query error (ignored):', profileError.message)
          }
        } catch (e) {
          console.log('[SnsUploadManagement] user_profiles query failed, continuing without profiles')
        }

        const { data: koreaParticipants, error: koreaError } = await supabaseKorea
          .from('campaign_participants')
          .select('*')
          .order('created_at', { ascending: false })

        if (koreaError) {
          console.error('[SnsUploadManagement] Korea campaign_participants error:', koreaError)
        }

        // campaign_participants를 user_id로 맵핑 (video_submissions에서 크리에이터 이름 조회용)
        const koreaParticipantMap = new Map()
        koreaParticipants?.forEach(p => {
          if (p.user_id) {
            koreaParticipantMap.set(p.user_id, p)
          }
        })

        // user_profiles 이름을 참조하는 헬퍼 함수
        const getKoreaCreatorName = (userId, fallbackData) => {
          const profile = koreaProfileMap.get(userId)
          if (profile?.name && !profile.name.includes('@')) {
            return profile.name
          }
          if (profile?.full_name && !profile.full_name.includes('@')) {
            return profile.full_name
          }
          return resolveCreatorName(fallbackData)
        }

        if (!koreaError && koreaParticipants) {
          console.log('[SnsUploadManagement] Korea campaign_participants:', koreaParticipants.length)
          koreaParticipants.forEach(p => {
            // 중복 체크
            const isDuplicate = allVideos.some(v =>
              v.campaign_id === p.campaign_id && v.user_id === p.user_id
            )

            const hasSnsUrl = p.sns_upload_url || p.week1_url || p.week2_url ||
                             p.week3_url || p.week4_url || p.step1_url ||
                             p.step2_url || p.step3_url
            const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted'].includes(p.status)

            if (!isDuplicate && (hasSnsUrl || hasVideoStatus)) {
              const campaign = koreaCampaignMap.get(p.campaign_id)

              // 캠페인 목록에 추가
              if (campaign) {
                campaignSet.set(campaign.id, {
                  id: campaign.id,
                  title: campaign.title,
                  type: campaign.campaign_type
                })
              }

              allVideos.push({
                id: `korea_${p.id}`,
                application_id: p.id,
                campaign_id: p.campaign_id,
                user_id: p.user_id,
                sns_upload_url: p.sns_upload_url,
                partnership_code: p.partnership_code,
                video_file_url: p.video_file_url,
                created_at: p.updated_at || p.created_at,
                status: p.status,
                source: 'korea',
                country: campaign?.target_country || 'kr',
                campaignTitle: campaign?.title || campaign?.name || p.campaign_name || p.campaign_title || '-',
                campaignType: campaign?.campaign_type,
                creatorName: getKoreaCreatorName(p.user_id, p),
                creatorEmail: p.email,
                creatorInstagram: koreaProfileMap.get(p.user_id)?.instagram_url,
                creatorYoutube: koreaProfileMap.get(p.user_id)?.youtube_url,
                creatorTiktok: koreaProfileMap.get(p.user_id)?.tiktok_url,
                // 멀티비디오 URL
                week1_url: p.week1_url,
                week2_url: p.week2_url,
                week3_url: p.week3_url,
                week4_url: p.week4_url,
                step1_url: p.step1_url,
                step2_url: p.step2_url,
                step3_url: p.step3_url,
                // 광고코드
                week1_partnership_code: p.week1_partnership_code,
                week2_partnership_code: p.week2_partnership_code,
                week3_partnership_code: p.week3_partnership_code,
                week4_partnership_code: p.week4_partnership_code,
                step1_2_partnership_code: p.step1_2_partnership_code,
                step3_partnership_code: p.step3_partnership_code,
              })
            }
          })
        }

        // 4. Korea DB에서 video_submissions 조회 (JOIN 없이 단순 조회)
        const { data: koreaSubmissions, error: koreaSubError } = await supabaseKorea
          .from('video_submissions')
          .select('*')
          .order('created_at', { ascending: false })

        if (koreaSubError) {
          console.error('[SnsUploadManagement] Korea video_submissions error:', koreaSubError)
        }

        if (!koreaSubError && koreaSubmissions) {
          console.log('[SnsUploadManagement] Korea video_submissions:', koreaSubmissions.length)
          koreaSubmissions.forEach(sub => {
            // 영상 관련 상태인 경우만 추가
            const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted', 'submitted', 'pending'].includes(sub.status)
            if (!hasVideoStatus && !sub.sns_upload_url) return

            const campaign = koreaCampaignMap.get(sub.campaign_id)
            const isMultiVideoCampaign = ['4week_challenge', 'oliveyoung', 'oliveyoung_sale'].includes(campaign?.campaign_type)

            // 중복 체크 - 멀티비디오 캠페인은 중복이어도 추가 (나중에 그룹화됨)
            const isDuplicate = allVideos.some(v =>
              v.campaign_id === sub.campaign_id && v.user_id === sub.user_id
            )
            if (!isDuplicate || isMultiVideoCampaign) {
              // video_submissions에서 participant 정보 조회
              const participant = koreaParticipantMap.get(sub.user_id)

              // 캠페인 목록에 추가
              if (campaign) {
                campaignSet.set(campaign.id, {
                  id: campaign.id,
                  title: campaign.title,
                  type: campaign.campaign_type
                })
              }

              // 크리에이터 이름: user_profiles에서 먼저 찾기 (핵심!)
              const creatorName = getKoreaCreatorName(sub.user_id, participant || sub)

              allVideos.push({
                id: `korea_sub_${sub.id}`,
                submission_id: sub.id,
                application_id: sub.application_id,
                campaign_id: sub.campaign_id,
                user_id: sub.user_id,
                sns_upload_url: sub.sns_upload_url,
                partnership_code: sub.partnership_code || sub.ad_code,
                video_file_url: sub.video_file_url,
                created_at: sub.approved_at || sub.updated_at || sub.created_at,
                status: sub.status,
                source: 'korea_submission',
                country: campaign?.target_country || 'kr',
                campaignTitle: campaign?.title || campaign?.name || sub.campaign_name || '-',
                campaignType: campaign?.campaign_type,
                creatorName: creatorName,
                creatorEmail: sub.email,
                creatorInstagram: koreaProfileMap.get(sub.user_id)?.instagram_url,
                creatorYoutube: koreaProfileMap.get(sub.user_id)?.youtube_url,
                creatorTiktok: koreaProfileMap.get(sub.user_id)?.tiktok_url,
                week_number: sub.week_number,
              })
            }
          })
        }
      }

      // 5. Japan DB에서 조회
      console.log('[SnsUploadManagement] supabaseJapan client:', !!supabaseJapan)
      if (supabaseJapan) {
        try {
          // 캠페인 정보 조회
          const { data: japanCampaigns, error: jpCampError } = await supabaseJapan
            .from('campaigns')
            .select('*')

          if (jpCampError) console.error('[SnsUploadManagement] Japan campaigns error:', jpCampError.message)
          console.log('[SnsUploadManagement] Japan campaigns loaded:', japanCampaigns?.length || 0)

          japanCampaignMap = new Map()
          japanCampaigns?.forEach(c => japanCampaignMap.set(c.id, c))

          // user_profiles 조회
          japanProfileMap = new Map()
          try {
            const { data: japanProfiles } = await supabaseJapan
              .from('user_profiles')
              .select('*')
            japanProfiles?.forEach(p => {
              if (p.id) japanProfileMap.set(p.id, p)
              if (p.user_id) japanProfileMap.set(p.user_id, p)
            })
            console.log('[SnsUploadManagement] Japan user_profiles loaded:', japanProfiles?.length || 0)
          } catch (e) {
            console.log('[SnsUploadManagement] Japan user_profiles query failed, continuing')
          }

          const getJapanCreatorName = (userId, fallbackData) => {
            const profile = japanProfileMap.get(userId)
            if (profile?.name && !profile.name.includes('@')) return profile.name
            if (profile?.full_name && !profile.full_name.includes('@')) return profile.full_name
            return resolveCreatorName(fallbackData)
          }

          // applications 조회
          const { data: japanApps, error: japanAppError } = await supabaseJapan
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false })

          if (!japanAppError && japanApps) {
            console.log('[SnsUploadManagement] Japan applications:', japanApps.length)
            japanApps.forEach(app => {
              const hasSnsUrl = app.sns_upload_url || app.week1_url || app.week2_url ||
                               app.week3_url || app.week4_url || app.step1_url ||
                               app.step2_url || app.step3_url
              const hasVideoFile = app.video_file_url
              // 'approved'는 참여 승인이지 영상 완료가 아님 - 제외
              const hasVideoStatus = ['completed', 'sns_uploaded', 'video_submitted', 'submitted'].includes(app.status)

              if (hasSnsUrl || hasVideoFile || hasVideoStatus) {
                const campaign = japanCampaignMap.get(app.campaign_id)
                // BIZ에 중복이 있으면 교체 (country 보정)
                const dupIndex = allVideos.findIndex(v =>
                  v.campaign_id === app.campaign_id && v.user_id === app.user_id
                )
                const videoEntry = {
                  id: `japan_app_${app.id}`,
                  application_id: app.id,
                  campaign_id: app.campaign_id,
                  user_id: app.user_id,
                  sns_upload_url: app.sns_upload_url,
                  partnership_code: app.partnership_code,
                  video_file_url: app.video_file_url,
                  created_at: app.updated_at || app.created_at,
                  status: app.status,
                  source: 'japan',
                  country: 'jp',
                  campaignTitle: campaign?.title || app.campaign_name || '-',
                  campaignType: campaign?.campaign_type,
                  creatorName: getJapanCreatorName(app.user_id, app),
                  creatorEmail: app.email,
                  creatorInstagram: japanProfileMap.get(app.user_id)?.instagram_url,
                  creatorYoutube: japanProfileMap.get(app.user_id)?.youtube_url,
                  creatorTiktok: japanProfileMap.get(app.user_id)?.tiktok_url,
                  week1_url: app.week1_url, week2_url: app.week2_url,
                  week3_url: app.week3_url, week4_url: app.week4_url,
                  step1_url: app.step1_url, step2_url: app.step2_url, step3_url: app.step3_url,
                  week1_partnership_code: app.week1_partnership_code,
                  week2_partnership_code: app.week2_partnership_code,
                  week3_partnership_code: app.week3_partnership_code,
                  week4_partnership_code: app.week4_partnership_code,
                  step1_2_partnership_code: app.step1_2_partnership_code,
                  step3_partnership_code: app.step3_partnership_code,
                }
                if (campaign) {
                  campaignSet.set(campaign.id, { id: campaign.id, title: campaign.title, type: campaign.campaign_type })
                }
                if (dupIndex >= 0) {
                  allVideos[dupIndex] = videoEntry // BIZ 중복 교체
                } else {
                  allVideos.push(videoEntry)
                }
              }
            })
          }

          // video_submissions 조회
          const { data: japanSubs, error: japanSubError } = await supabaseJapan
            .from('video_submissions')
            .select('*')
            .order('created_at', { ascending: false })

          if (!japanSubError && japanSubs) {
            console.log('[SnsUploadManagement] Japan video_submissions:', japanSubs.length)
            japanSubs.forEach(sub => {
              const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted', 'submitted', 'pending'].includes(sub.status)
              if (!hasVideoStatus && !sub.sns_upload_url) return

              const campaign = japanCampaignMap.get(sub.campaign_id)
              const isMultiVideoCampaign = ['4week_challenge', 'megawari', 'oliveyoung', 'oliveyoung_sale'].includes(campaign?.campaign_type)
              // BIZ에 중복이 있으면 교체 (country 보정)
              const dupIndex = allVideos.findIndex(v =>
                v.campaign_id === sub.campaign_id && v.user_id === sub.user_id
              )

              if (dupIndex < 0 || isMultiVideoCampaign) {
                if (campaign) {
                  campaignSet.set(campaign.id, { id: campaign.id, title: campaign.title, type: campaign.campaign_type })
                }
                const videoEntry = {
                  id: `japan_sub_${sub.id}`,
                  submission_id: sub.id,
                  application_id: sub.application_id,
                  campaign_id: sub.campaign_id,
                  user_id: sub.user_id,
                  sns_upload_url: sub.sns_upload_url,
                  partnership_code: sub.partnership_code || sub.ad_code,
                  video_file_url: sub.video_file_url,
                  created_at: sub.approved_at || sub.updated_at || sub.created_at,
                  status: sub.status,
                  source: 'japan_submission',
                  country: 'jp',
                  campaignTitle: campaign?.title || '-',
                  campaignType: campaign?.campaign_type,
                  creatorName: getJapanCreatorName(sub.user_id, sub),
                  creatorEmail: sub.email,
                  creatorInstagram: japanProfileMap.get(sub.user_id)?.instagram_url,
                  creatorYoutube: japanProfileMap.get(sub.user_id)?.youtube_url,
                  creatorTiktok: japanProfileMap.get(sub.user_id)?.tiktok_url,
                  week_number: sub.week_number,
                }
                if (dupIndex >= 0) {
                  allVideos[dupIndex] = videoEntry
                } else {
                  allVideos.push(videoEntry)
                }
              }
            })
          }
        } catch (jpError) {
          console.error('[SnsUploadManagement] Japan DB error:', jpError)
        }
      }

      // 6. US DB에서 조회
      console.log('[SnsUploadManagement] supabaseUS client:', !!supabaseUS)
      if (supabaseUS) {
        console.log('[SnsUploadManagement] US DB client exists, querying...')
        try {
          // 캠페인 정보 조회
          const { data: usCampaigns, error: usCampError } = await supabaseUS
            .from('campaigns')
            .select('*')

          if (usCampError) {
            console.error('[SnsUploadManagement] US campaigns error:', usCampError.message)
          }
          console.log('[SnsUploadManagement] US campaigns loaded:', usCampaigns?.length || 0)

          usCampaignMap = new Map()
          usCampaigns?.forEach(c => usCampaignMap.set(c.id, c))

          // user_profiles 조회
          usProfileMap = new Map()
          try {
            const { data: usProfiles } = await supabaseUS
              .from('user_profiles')
              .select('*')
            usProfiles?.forEach(p => {
              if (p.id) usProfileMap.set(p.id, p)
              if (p.user_id) usProfileMap.set(p.user_id, p)
            })
            console.log('[SnsUploadManagement] US user_profiles loaded:', usProfiles?.length || 0)
          } catch (e) {
            console.log('[SnsUploadManagement] US user_profiles query failed, continuing')
          }

          const getUSCreatorName = (userId, fallbackData) => {
            const profile = usProfileMap.get(userId)
            if (profile?.name && !profile.name.includes('@')) return profile.name
            if (profile?.full_name && !profile.full_name.includes('@')) return profile.full_name
            return resolveCreatorName(fallbackData)
          }

          // applications 조회
          const { data: usApps, error: usAppError } = await supabaseUS
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false })

          if (usAppError) {
            console.error('[SnsUploadManagement] US applications error:', usAppError.message, usAppError.code)
          }
          if (!usAppError && usApps) {
            console.log('[SnsUploadManagement] US applications:', usApps.length)
            // 진단: US 앱 status 분포
            const usStatusCounts = {}
            usApps.forEach(a => { usStatusCounts[a.status] = (usStatusCounts[a.status] || 0) + 1 })
            console.log('[SnsUploadManagement] US app status distribution:', JSON.stringify(usStatusCounts))
            let usPassedFilter = 0, usAdded = 0, usReplaced = 0
            usApps.forEach(app => {
              const hasSnsUrl = app.sns_upload_url || app.week1_url || app.week2_url ||
                               app.week3_url || app.week4_url || app.step1_url ||
                               app.step2_url || app.step3_url
              const hasVideoFile = app.video_file_url
              // 'approved'는 참여 승인이지 영상 완료가 아님 - 제외
              const hasVideoStatus = ['completed', 'sns_uploaded', 'video_submitted', 'submitted'].includes(app.status)

              if (hasSnsUrl || hasVideoFile || hasVideoStatus) {
                usPassedFilter++
                const campaign = usCampaignMap.get(app.campaign_id)
                // BIZ에 중복이 있으면 교체 (country 보정)
                const dupIndex = allVideos.findIndex(v =>
                  v.campaign_id === app.campaign_id && v.user_id === app.user_id
                )
                const videoEntry = {
                  id: `us_app_${app.id}`,
                  application_id: app.id,
                  campaign_id: app.campaign_id,
                  user_id: app.user_id,
                  sns_upload_url: app.sns_upload_url,
                  partnership_code: app.partnership_code,
                  video_file_url: app.video_file_url,
                  created_at: app.updated_at || app.created_at,
                  status: app.status,
                  source: 'us',
                  country: 'us',
                  campaignTitle: campaign?.title || app.campaign_name || '-',
                  campaignType: campaign?.campaign_type,
                  creatorName: getUSCreatorName(app.user_id, app),
                  creatorEmail: app.email,
                  creatorInstagram: usProfileMap.get(app.user_id)?.instagram_url,
                  creatorYoutube: usProfileMap.get(app.user_id)?.youtube_url,
                  creatorTiktok: usProfileMap.get(app.user_id)?.tiktok_url,
                  week1_url: app.week1_url, week2_url: app.week2_url,
                  week3_url: app.week3_url, week4_url: app.week4_url,
                  step1_url: app.step1_url, step2_url: app.step2_url, step3_url: app.step3_url,
                  week1_partnership_code: app.week1_partnership_code,
                  week2_partnership_code: app.week2_partnership_code,
                  week3_partnership_code: app.week3_partnership_code,
                  week4_partnership_code: app.week4_partnership_code,
                  step1_2_partnership_code: app.step1_2_partnership_code,
                  step3_partnership_code: app.step3_partnership_code,
                }
                if (campaign) {
                  campaignSet.set(campaign.id, { id: campaign.id, title: campaign.title, type: campaign.campaign_type })
                }
                if (dupIndex >= 0) {
                  allVideos[dupIndex] = videoEntry // BIZ 중복 교체
                  usReplaced++
                } else {
                  allVideos.push(videoEntry)
                  usAdded++
                }
              }
            })
            console.log(`[SnsUploadManagement] US apps: passed filter=${usPassedFilter}, added=${usAdded}, replaced=${usReplaced}`)
          }

          // video_submissions 조회
          const { data: usSubs, error: usSubError } = await supabaseUS
            .from('video_submissions')
            .select('*')
            .order('created_at', { ascending: false })

          if (usSubError) {
            console.error('[SnsUploadManagement] US video_submissions error:', usSubError.message, usSubError.code)
          }
          if (!usSubError && usSubs) {
            console.log('[SnsUploadManagement] US video_submissions:', usSubs.length)
            usSubs.forEach(sub => {
              const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted', 'submitted', 'pending'].includes(sub.status)
              if (!hasVideoStatus && !sub.sns_upload_url) return

              const campaign = usCampaignMap.get(sub.campaign_id)
              const isMultiVideoCampaign = ['4week_challenge', 'oliveyoung', 'oliveyoung_sale'].includes(campaign?.campaign_type)
              // BIZ에 중복이 있으면 교체 (country 보정)
              const dupIndex = allVideos.findIndex(v =>
                v.campaign_id === sub.campaign_id && v.user_id === sub.user_id
              )

              if (dupIndex < 0 || isMultiVideoCampaign) {
                if (campaign) {
                  campaignSet.set(campaign.id, { id: campaign.id, title: campaign.title, type: campaign.campaign_type })
                }
                const videoEntry = {
                  id: `us_sub_${sub.id}`,
                  submission_id: sub.id,
                  application_id: sub.application_id,
                  campaign_id: sub.campaign_id,
                  user_id: sub.user_id,
                  sns_upload_url: sub.sns_upload_url,
                  partnership_code: sub.partnership_code || sub.ad_code,
                  video_file_url: sub.video_file_url,
                  created_at: sub.approved_at || sub.updated_at || sub.created_at,
                  status: sub.status,
                  source: 'us_submission',
                  country: 'us',
                  campaignTitle: campaign?.title || '-',
                  campaignType: campaign?.campaign_type,
                  creatorName: getUSCreatorName(sub.user_id, sub),
                  creatorEmail: sub.email,
                  creatorInstagram: usProfileMap.get(sub.user_id)?.instagram_url,
                  creatorYoutube: usProfileMap.get(sub.user_id)?.youtube_url,
                  creatorTiktok: usProfileMap.get(sub.user_id)?.tiktok_url,
                  week_number: sub.week_number,
                }
                if (dupIndex >= 0) {
                  allVideos[dupIndex] = videoEntry
                } else {
                  allVideos.push(videoEntry)
                }
              }
            })
          }
        } catch (usError) {
          console.error('[SnsUploadManagement] US DB error:', usError)
        }
      }

      // 멀티비디오 캠페인 그룹화 (4주 챌린지, 올리브영)
      // 동일한 campaign_id + (user_id 또는 email)를 가진 항목들을 하나로 병합
      const videoMap = new Map()

      // 그룹화 키 생성 함수 - user_id가 없으면 email 사용
      const getGroupKey = (video) => {
        const identifier = video.user_id || video.creatorEmail || video.id
        return `${video.campaign_id}_${identifier}`
      }

      // 디버그 로깅
      console.log('[SnsUploadManagement] Grouping videos by campaign + user...')
      const multiVideoTypes = allVideos.filter(v =>
        v.campaignType === '4week_challenge' ||
        v.campaignType === 'oliveyoung' ||
        v.campaignType === 'oliveyoung_sale'
      )
      console.log('[SnsUploadManagement] Multi-video type videos:', multiVideoTypes.length)

      allVideos.forEach(video => {
        // null/undefined 체크
        if (!video || !video.campaign_id) return

        const key = getGroupKey(video)

        if (!videoMap.has(key)) {
          videoMap.set(key, { ...video })
        } else {
          const existing = videoMap.get(key)
          if (!existing) return  // 안전 체크

          // week URL 병합 (sns_upload_url과 video_file_url 모두)
          if (video.week_number) {
            const weekNum = video.week_number
            const weekUrlKey = `week${weekNum}_url`
            const weekCodeKey = `week${weekNum}_partnership_code`
            const weekVideoKey = `week${weekNum}_video_file_url`

            if (video.sns_upload_url && !existing[weekUrlKey]) {
              existing[weekUrlKey] = video.sns_upload_url
            }
            if (video.partnership_code && !existing[weekCodeKey]) {
              existing[weekCodeKey] = video.partnership_code
            }
            // 주차별 video_file_url 저장 (핵심!)
            if (video.video_file_url && !existing[weekVideoKey]) {
              existing[weekVideoKey] = video.video_file_url
            }
            console.log('[SnsUploadManagement] Merging week', weekNum, '| sns_url:', !!video.sns_upload_url, '| video_file:', !!video.video_file_url)
          }

          // 개별 week URL 병합 (안전하게)
          const weekUrls = ['week1_url', 'week2_url', 'week3_url', 'week4_url',
                          'step1_url', 'step2_url', 'step3_url']
          weekUrls.forEach(urlKey => {
            if (video && video[urlKey] && existing && !existing[urlKey]) {
              existing[urlKey] = video[urlKey]
            }
          })

          // 광고코드 병합 (안전하게)
          const partnerCodes = ['week1_partnership_code', 'week2_partnership_code', 'week3_partnership_code',
                               'week4_partnership_code', 'step1_2_partnership_code', 'step3_partnership_code']
          partnerCodes.forEach(codeKey => {
            if (video && video[codeKey] && existing && !existing[codeKey]) {
              existing[codeKey] = video[codeKey]
            }
          })

          // SNS URL 병합
          if (video?.sns_upload_url && !existing?.sns_upload_url) {
            existing.sns_upload_url = video.sns_upload_url
          }

          // video_file_url 병합
          if (video?.video_file_url && !existing?.video_file_url) {
            existing.video_file_url = video.video_file_url
          }

          // 크리에이터 SNS URL 병합
          if (video?.creatorInstagram && !existing?.creatorInstagram) existing.creatorInstagram = video.creatorInstagram
          if (video?.creatorYoutube && !existing?.creatorYoutube) existing.creatorYoutube = video.creatorYoutube
          if (video?.creatorTiktok && !existing?.creatorTiktok) existing.creatorTiktok = video.creatorTiktok

          // 최신 날짜로 업데이트
          if (video?.created_at && existing?.created_at &&
              new Date(video.created_at) > new Date(existing.created_at)) {
            existing.created_at = video.created_at
          }

          // 더 진행된 상태로 업데이트
          const statusPriority = ['pending', 'video_submitted', 'approved', 'sns_uploaded', 'completed']
          const existingPriority = statusPriority.indexOf(existing.status)
          const videoPriority = statusPriority.indexOf(video.status)
          if (videoPriority > existingPriority) {
            existing.status = video.status
          }
        }
      })

      const mergedVideos = Array.from(videoMap.values())

      // 누락된 캠페인명 보정 (cross-region lookup)
      mergedVideos.forEach(video => {
        if (!video.campaignTitle || video.campaignTitle === '-') {
          const campaign = campaignMap.get(video.campaign_id) ||
                           koreaCampaignMap.get(video.campaign_id) ||
                           japanCampaignMap.get(video.campaign_id) ||
                           usCampaignMap.get(video.campaign_id)
          if (campaign) {
            video.campaignTitle = campaign.title || campaign.name
            video.campaignType = video.campaignType || campaign.campaign_type
            // 캠페인 필터 목록에도 추가
            if (!campaignSet.has(campaign.id)) {
              campaignSet.set(campaign.id, { id: campaign.id, title: campaign.title || campaign.name, type: campaign.campaign_type })
            }
          }
        }
        // 누락된 크리에이터 SNS URL 보정 (BIZ 등 프로필 없는 소스용)
        if (!video.creatorInstagram && !video.creatorYoutube && !video.creatorTiktok && video.user_id) {
          const profile = koreaProfileMap.get(video.user_id) ||
                          japanProfileMap.get(video.user_id) ||
                          usProfileMap.get(video.user_id)
          if (profile) {
            video.creatorInstagram = profile.instagram_url
            video.creatorYoutube = profile.youtube_url
            video.creatorTiktok = profile.tiktok_url
          }
        }
      })

      // 날짜 기준 정렬
      mergedVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      console.log('[SnsUploadManagement] Total completed videos (before merge):', allVideos.length)
      console.log('[SnsUploadManagement] Total completed videos (after merge):', mergedVideos.length)
      setCompletedVideos(mergedVideos)
      setCampaigns(Array.from(campaignSet.values()))
    } catch (error) {
      console.error('Error fetching completed videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterVideos = () => {
    let filtered = [...completedVideos]

    // 국가 필터 (대소문자 무시)
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(v => {
        const c = (v.country || '').toLowerCase()
        if (selectedCountry === 'kr') return c === 'kr' || c === 'korea' || !v.country
        if (selectedCountry === 'us') return c === 'us' || c === 'usa' || c === 'united states'
        if (selectedCountry === 'jp') return c === 'jp' || c === 'japan'
        return true
      })
    }

    // 캠페인 필터
    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(v => v.campaign_id === selectedCampaign)
    }

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(v =>
        v.campaignTitle?.toLowerCase().includes(term) ||
        v.creatorName?.toLowerCase().includes(term) ||
        v.sns_upload_url?.toLowerCase().includes(term)
      )
    }

    setFilteredVideos(filtered)
  }

  const handleDownloadVideo = async (video, url = null) => {
    const downloadUrl = url || video.video_file_url
    if (!downloadUrl) {
      alert('다운로드 가능한 영상 파일이 없습니다.')
      return
    }

    setDownloading(video.id)
    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()

      const urlObj = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = urlObj
      a.download = `${video.campaignTitle || 'video'}_${video.creatorName || 'creator'}_${new Date().toISOString().split('T')[0]}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(urlObj)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      window.open(downloadUrl, '_blank')
    } finally {
      setDownloading(null)
    }
  }

  const getCountryLabel = (country) => {
    if (!country || country === 'kr' || country === 'korea') return { flag: '🇰🇷', label: '한국' }
    if (country === 'us' || country === 'usa') return { flag: '🇺🇸', label: '미국' }
    if (country === 'jp' || country === 'japan') return { flag: '🇯🇵', label: '일본' }
    return { flag: '🌍', label: country }
  }

  const getCampaignTypeLabel = (type) => {
    switch (type) {
      case 'planned': return '기획형'
      case 'oliveyoung':
      case 'oliveyoung_sale': return '올리브영'
      case '4week_challenge': return '4주 챌린지'
      default: return type || '일반'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return { label: '승인완료', color: 'bg-green-100 text-green-700' }
      case 'completed': return { label: '완료', color: 'bg-blue-100 text-blue-700' }
      case 'sns_uploaded': return { label: 'SNS업로드', color: 'bg-purple-100 text-purple-700' }
      default: return { label: status, color: 'bg-gray-100 text-gray-700' }
    }
  }

  // 멀티비디오 URL 구조화 (4주 챌린지, 올리브영)
  // 각 주차별 SNS URL과 video_file_url(다운로드용)을 포함
  const getMultiVideoUrls = (video) => {
    const urls = []

    // 4주 챌린지
    if (video.campaignType === '4week_challenge') {
      if (video.week1_url) urls.push({
        label: '1주차', url: video.week1_url, code: video.week1_partnership_code,
        videoFileUrl: video.week1_video_file_url || video.video_file_url
      })
      if (video.week2_url) urls.push({
        label: '2주차', url: video.week2_url, code: video.week2_partnership_code,
        videoFileUrl: video.week2_video_file_url
      })
      if (video.week3_url) urls.push({
        label: '3주차', url: video.week3_url, code: video.week3_partnership_code,
        videoFileUrl: video.week3_video_file_url
      })
      if (video.week4_url) urls.push({
        label: '4주차', url: video.week4_url, code: video.week4_partnership_code,
        videoFileUrl: video.week4_video_file_url
      })
    }
    // 올리브영
    else if (video.campaignType === 'oliveyoung' || video.campaignType === 'oliveyoung_sale') {
      if (video.step1_url) urls.push({
        label: 'STEP1', url: video.step1_url, code: video.step1_2_partnership_code,
        videoFileUrl: video.step1_video_file_url || video.video_file_url
      })
      if (video.step2_url) urls.push({
        label: 'STEP2', url: video.step2_url, code: video.step1_2_partnership_code,
        videoFileUrl: video.step2_video_file_url
      })
      if (video.step3_url) urls.push({
        label: 'STEP3', url: video.step3_url, code: video.step3_partnership_code,
        videoFileUrl: video.step3_video_file_url
      })
    }
    // 일반
    else if (video.sns_upload_url) {
      urls.push({ label: 'SNS', url: video.sns_upload_url, code: video.partnership_code, videoFileUrl: video.video_file_url })
    }

    return urls
  }

  const toggleRowExpand = (videoId) => {
    setExpandedRows(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }))
  }

  const countByCountry = (country) => {
    if (country === 'all') return completedVideos.length
    return completedVideos.filter(v => {
      const c = (v.country || '').toLowerCase()
      if (country === 'kr') return c === 'kr' || c === 'korea' || !v.country
      if (country === 'us') return c === 'us' || c === 'usa' || c === 'united states'
      if (country === 'jp') return c === 'jp' || c === 'japan'
      return false
    }).length
  }

  const isVideoUrl = (url) => {
    if (!url) return false
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv']
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) ||
           url.includes('video') || url.includes('storage')
  }

  // GIF 변환 모달 열기
  const openGifModal = (video, videoUrl = null) => {
    const url = videoUrl || video.video_file_url
    if (!url) {
      alert('다운로드 가능한 영상 파일이 없습니다.')
      return
    }
    setGifTargetVideo({ ...video, targetUrl: url })
    setGifStartTime('0')
    setGifEndTime('3')
    setGifWidth('320')
    setGifFps('10')
    setGifResult(null)
    setGifProgress('')
  }

  // GIF 생성 (Canvas + gifenc - SharedArrayBuffer 불필요)
  const handleGenerateGif = async () => {
    if (!gifTargetVideo?.targetUrl) return

    setGeneratingGif(true)
    setGifResult(null)
    try {
      setGifProgress('GIF 인코더 로딩 중...')
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc')

      const start = parseInt(gifStartTime) || 0
      const end = parseInt(gifEndTime) || 3
      const duration = Math.max(1, end - start)
      const width = parseInt(gifWidth) || 320
      const fps = parseInt(gifFps) || 10
      const totalFrames = duration * fps
      const delay = Math.round(1000 / fps)

      // 비디오 요소 생성 및 로딩
      setGifProgress('영상 로딩 중...')
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.preload = 'auto'

      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve
        video.onerror = () => reject(new Error('영상 로딩 실패. CORS 문제일 수 있습니다.'))
        video.src = gifTargetVideo.targetUrl
      })

      // 비율 유지하며 높이 계산
      const aspectRatio = video.videoHeight / video.videoWidth
      const height = Math.round(width * aspectRatio)

      // 캔버스 생성
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // GIF 인코더 생성
      const gif = GIFEncoder()

      // 프레임 추출 및 인코딩
      for (let i = 0; i < totalFrames; i++) {
        const time = start + (i / fps)
        if (time > end) break

        setGifProgress(`프레임 추출 중... ${i + 1}/${totalFrames}`)

        // 해당 시간으로 이동
        video.currentTime = time
        await new Promise((resolve) => {
          video.onseeked = resolve
        })

        // 캔버스에 그리기
        ctx.drawImage(video, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)

        // 색상 양자화 및 프레임 추가
        const palette = quantize(imageData.data, 256)
        const index = applyPalette(imageData.data, palette)
        gif.writeFrame(index, width, height, { palette, delay })
      }

      gif.finish()

      const output = gif.bytes()
      const blob = new Blob([output], { type: 'image/gif' })
      const gifUrl = URL.createObjectURL(blob)

      setGifResult({ url: gifUrl, blob, size: output.length, width, fps, duration, start, end })
      setGifProgress('')
    } catch (error) {
      console.error('GIF generation error:', error)
      setGifProgress('')
      const msg = error?.message || String(error) || '알 수 없는 오류'
      alert('GIF 생성 실패: ' + msg)
    } finally {
      setGeneratingGif(false)
    }
  }

  // GIF 다운로드
  const handleDownloadGif = () => {
    if (!gifResult?.blob) return
    const a = document.createElement('a')
    a.href = gifResult.url
    a.download = `${gifTargetVideo?.creatorName || 'video'}_${gifTargetVideo?.campaignTitle || ''}_${gifResult.start}s-${gifResult.end}s.gif`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 네비게이션 */}
      <AdminNavigation />

      {/* 메인 콘텐츠 */}
      <div className="ml-56 p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-green-500" />
              SNS 업로드 완료 영상 관리
            </h1>
            <p className="text-sm text-gray-500 mt-1">크리에이터가 SNS에 업로드 완료한 영상을 관리합니다</p>
          </div>
          <Button onClick={fetchCompletedVideos} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCountry === 'all' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSelectedCountry('all')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">전체</p>
                  <p className="text-2xl font-bold">{countByCountry('all')}</p>
                </div>
                <Globe className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCountry === 'kr' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSelectedCountry('kr')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">🇰🇷 한국</p>
                  <p className="text-2xl font-bold">{countByCountry('kr')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCountry === 'us' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSelectedCountry('us')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">🇺🇸 미국</p>
                  <p className="text-2xl font-bold">{countByCountry('us')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCountry === 'jp' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSelectedCountry('jp')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">🇯🇵 일본</p>
                  <p className="text-2xl font-bold">{countByCountry('jp')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 & 검색 */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="캠페인명, 크리에이터명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {/* 캠페인 필터 */}
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="캠페인 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 캠페인</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title?.length > 30 ? campaign.title.slice(0, 30) + '...' : campaign.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs value={selectedCountry} onValueChange={setSelectedCountry}>
                <TabsList>
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="kr">🇰🇷 한국</TabsTrigger>
                  <TabsTrigger value="us">🇺🇸 미국</TabsTrigger>
                  <TabsTrigger value="jp">🇯🇵 일본</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              SNS 업로드 완료 목록 ({filteredVideos.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>SNS 업로드 완료된 영상이 없습니다.</p>
                <p className="text-sm text-gray-400 mt-2">캠페인 관리 → 완료 탭에서 데이터를 확인하세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[60px]">국가</TableHead>
                      <TableHead>캠페인</TableHead>
                      <TableHead>크리에이터 / SNS</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>SNS URL</TableHead>
                      <TableHead>완료일</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVideos.map((video) => {
                      const { flag } = getCountryLabel(video.country)
                      const multiUrls = getMultiVideoUrls(video)
                      const statusConfig = getStatusLabel(video.status)
                      const isExpanded = expandedRows[video.id]
                      const hasMultipleUrls = multiUrls.length > 1

                      return (
                        <>
                          <TableRow key={video.id} className={hasMultipleUrls ? 'cursor-pointer hover:bg-gray-50' : ''}>
                            <TableCell>
                              {hasMultipleUrls && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-6 w-6"
                                  onClick={() => toggleRowExpand(video.id)}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-lg">{flag}</span>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[180px]">
                                <p className="font-medium truncate" title={video.campaignTitle}>
                                  {video.campaignTitle || '-'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-400" />
                                <span className="text-sm">{video.creatorName || '-'}</span>
                              </div>
                              {(video.creatorInstagram || video.creatorYoutube || video.creatorTiktok) && (
                                <div className="flex items-center gap-1 mt-1">
                                  {video.creatorInstagram && (
                                    <a
                                      href={video.creatorInstagram.startsWith('http') ? video.creatorInstagram : `https://${video.creatorInstagram}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 hover:bg-pink-100 font-medium"
                                      title={video.creatorInstagram}
                                    >
                                      IG
                                    </a>
                                  )}
                                  {video.creatorYoutube && (
                                    <a
                                      href={video.creatorYoutube.startsWith('http') ? video.creatorYoutube : `https://${video.creatorYoutube}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                                      title={video.creatorYoutube}
                                    >
                                      YT
                                    </a>
                                  )}
                                  {video.creatorTiktok && (
                                    <a
                                      href={video.creatorTiktok.startsWith('http') ? video.creatorTiktok : `https://${video.creatorTiktok}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
                                      title={video.creatorTiktok}
                                    >
                                      TT
                                    </a>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getCampaignTypeLabel(video.campaignType)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${statusConfig.color}`}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {multiUrls.length > 0 ? (
                                  <>
                                    <a
                                      href={multiUrls[0].url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {multiUrls[0].label}
                                    </a>
                                    {multiUrls.length > 1 && (
                                      <span className="text-xs text-gray-500">
                                        +{multiUrls.length - 1}개 더보기
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">미등록</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                {video.created_at
                                  ? new Date(video.created_at).toLocaleDateString('ko-KR')
                                  : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {video.video_file_url && isVideoUrl(video.video_file_url) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPreviewVideo({ ...video, currentUrl: video.video_file_url })}
                                    title="영상 미리보기"
                                  >
                                    <Play className="w-4 h-4" />
                                  </Button>
                                )}
                                {video.video_file_url && isVideoUrl(video.video_file_url) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openGifModal(video)}
                                    title="GIF 만들기"
                                    className="text-purple-600 hover:text-purple-700"
                                  >
                                    <Film className="w-4 h-4" />
                                  </Button>
                                )}
                                {video.video_file_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadVideo(video)}
                                    disabled={downloading === video.id}
                                    title="영상 다운로드"
                                  >
                                    {downloading === video.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/campaigns/${video.campaign_id}`)}
                                  title="캠페인 상세"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* 확장된 멀티비디오 URL 행 */}
                          {isExpanded && hasMultipleUrls && (
                            <TableRow className="bg-gray-50">
                              <TableCell colSpan={10}>
                                <div className="py-3 px-4">
                                  <p className="text-sm font-medium text-gray-700 mb-3">
                                    {video.campaignType === '4week_challenge' ? '4주 챌린지 영상' : '올리브영 STEP 영상'}
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {multiUrls.map((item, idx) => (
                                      <div key={idx} className="p-3 bg-white rounded-lg border">
                                        <div className="flex items-center justify-between mb-2">
                                          <Badge variant="secondary" className="text-xs">
                                            {item.label}
                                          </Badge>
                                          <div className="flex gap-1">
                                            <a
                                              href={item.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800"
                                              title="SNS 링크 열기"
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                            {/* 주차별 GIF 버튼 */}
                                            {item.videoFileUrl && isVideoUrl(item.videoFileUrl) && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="p-1 h-6 w-6"
                                                onClick={() => openGifModal(video, item.videoFileUrl)}
                                                title="GIF 만들기"
                                              >
                                                <Film className="w-4 h-4 text-purple-600" />
                                              </Button>
                                            )}
                                            {/* 주차별 다운로드 버튼 */}
                                            {item.videoFileUrl && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="p-1 h-6 w-6"
                                                onClick={() => handleDownloadVideo(video, item.videoFileUrl)}
                                                title="영상 다운로드"
                                              >
                                                <Download className="w-4 h-4 text-green-600" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        {item.code && (
                                          <div className="mt-2">
                                            <span className="text-xs text-gray-500">광고코드: </span>
                                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                              {item.code}
                                            </code>
                                          </div>
                                        )}
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-gray-500 hover:text-blue-600 truncate block mt-1"
                                        >
                                          {item.url.length > 40 ? item.url.slice(0, 40) + '...' : item.url}
                                        </a>
                                        {item.videoFileUrl && (
                                          <p className="text-xs text-green-600 mt-1">✓ 다운로드 가능</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GIF 변환 모달 */}
      <Dialog open={!!gifTargetVideo} onOpenChange={() => { setGifTargetVideo(null); setGifResult(null); setGifProgress('') }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-500" />
              GIF 만들기
              {gifTargetVideo && (
                <span className="text-sm font-normal text-gray-500">
                  - {gifTargetVideo.creatorName} / {gifTargetVideo.campaignTitle}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {gifTargetVideo && (
            <div className="space-y-4">
              {/* 영상 미리보기 */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden max-h-[300px]">
                <video
                  src={gifTargetVideo.targetUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              {/* GIF 설정 */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">시작 (초)</label>
                  <Input
                    type="number"
                    min="0"
                    value={gifStartTime}
                    onChange={(e) => setGifStartTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">끝 (초)</label>
                  <Input
                    type="number"
                    min="1"
                    value={gifEndTime}
                    onChange={(e) => setGifEndTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">너비 (px)</label>
                  <Select value={gifWidth} onValueChange={setGifWidth}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="200">200px</SelectItem>
                      <SelectItem value="280">280px</SelectItem>
                      <SelectItem value="320">320px</SelectItem>
                      <SelectItem value="400">400px</SelectItem>
                      <SelectItem value="480">480px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">FPS</label>
                  <Select value={gifFps} onValueChange={setGifFps}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 fps</SelectItem>
                      <SelectItem value="8">8 fps</SelectItem>
                      <SelectItem value="10">10 fps</SelectItem>
                      <SelectItem value="12">12 fps</SelectItem>
                      <SelectItem value="15">15 fps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {parseInt(gifEndTime) - parseInt(gifStartTime) > 5 && (
                <p className="text-xs text-amber-600">5초 이상은 파일이 커질 수 있습니다. 자동으로 최적화됩니다.</p>
              )}

              {/* 생성 버튼 */}
              <Button
                onClick={handleGenerateGif}
                disabled={generatingGif}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {generatingGif ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Image className="w-4 h-4 mr-2" />
                )}
                {gifProgress || 'GIF 생성하기'}
              </Button>

              {/* GIF 결과 */}
              {gifResult && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-center bg-gray-100 rounded-lg p-2">
                    <img src={gifResult.url} alt="Generated GIF" className="max-h-[250px] rounded" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {(gifResult.size / 1024 / 1024).toFixed(2)}MB
                      {gifResult.size <= 5 * 1024 * 1024 && ' ✓'}
                      {' | '}{gifResult.start}s~{gifResult.end}s
                      {' | '}{gifResult.width}px / {gifResult.fps}fps
                    </span>
                    <Button onClick={handleDownloadGif} size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 영상 미리보기 모달 */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              영상 미리보기
              {previewVideo && (
                <span className="text-sm font-normal text-gray-500">
                  - {previewVideo.creatorName} / {previewVideo.campaignTitle}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={previewVideo.currentUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {previewVideo.video_file_url && (
                    <a href={previewVideo.video_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      원본 영상 링크
                    </a>
                  )}
                </div>
                <Button
                  onClick={() => handleDownloadVideo(previewVideo, previewVideo.currentUrl)}
                  disabled={downloading === previewVideo.id}
                >
                  {downloading === previewVideo.id ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  다운로드
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
