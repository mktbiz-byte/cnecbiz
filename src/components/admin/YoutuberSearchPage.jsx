import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search, Youtube, Mail, Send, ExternalLink, Users, Globe,
  ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle,
  Eye, Download, Filter, RefreshCw, Star, Clock, MessageSquare,
  AlertCircle, Info, PlayCircle, Video, Image, Film, Link2,
  FileSpreadsheet, Settings, Upload, UserCheck, UserX, BookOpen, Plus
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

// 상태 배지 컬러
const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  interested: 'bg-purple-100 text-purple-800',
  negotiating: 'bg-orange-100 text-orange-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  no_response: 'bg-gray-100 text-gray-800',
  invalid_email: 'bg-red-100 text-red-600',
  blacklisted: 'bg-black text-white'
}

const STATUS_LABELS = {
  new: '신규',
  contacted: '연락함',
  responded: '응답 받음',
  interested: '관심 있음',
  negotiating: '협상 중',
  accepted: '수락 (섭외 성공)',
  declined: '거절',
  no_response: '무응답',
  invalid_email: '이메일 무효',
  blacklisted: '블랙리스트'
}

// 구독자 수 포맷
const formatSubscribers = (count) => {
  if (!count) return '0'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toLocaleString()
}

// 날짜 포맷
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export default function YoutuberSearchPage() {
  const navigate = useNavigate()

  // 검색 상태
  const [searchKeyword, setSearchKeyword] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [minSubscribers, setMinSubscribers] = useState('')
  const [maxSubscribers, setMaxSubscribers] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [nextPageToken, setNextPageToken] = useState(null)
  const [searchType, setSearchType] = useState('video') // 'video' 또는 'channel'
  const [saveOnlyWithEmail, setSaveOnlyWithEmail] = useState(true) // 이메일 있는 것만 저장

  // GIF 변환 상태
  const [shortsUrl, setShortsUrl] = useState('')
  const [startTime, setStartTime] = useState('0')
  const [gifDuration, setGifDuration] = useState('3')
  const [videoInfo, setVideoInfo] = useState(null)
  const [loadingVideo, setLoadingVideo] = useState(false)

  // 목록 상태
  const [activeTab, setActiveTab] = useState('search')
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState('all')
  const [emailFilter, setEmailFilter] = useState('all')
  const [listSearchTerm, setListSearchTerm] = useState('')

  // 선택 상태
  const [selectedProspects, setSelectedProspects] = useState([])

  // 모달 상태
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [emailLanguage, setEmailLanguage] = useState('en')
  const [previewHtml, setPreviewHtml] = useState('')
  const [sending, setSending] = useState(false)

  // 통계
  const [stats, setStats] = useState({
    total: 0,
    with_email: 0,
    by_status: {},
    by_country: {}
  })

  // Google Sheets 상태
  const [sheetSettings, setSheetSettings] = useState({
    korea: { url: '', nameColumn: 'A', emailColumn: 'B', sheetTab: '', stibeeListId: '', autoSync: false },
    japan: { url: '', nameColumn: 'A', emailColumn: 'B', sheetTab: '', stibeeListId: '', autoSync: false },
    japan2: { url: '', nameColumn: 'A', emailColumn: 'B', sheetTab: '', stibeeListId: '', autoSync: false },
    us: { url: '', nameColumn: 'A', emailColumn: 'B', sheetTab: '', stibeeListId: '', autoSync: false }
  })
  const [lastSyncResult, setLastSyncResult] = useState(null)
  const [runningSyncManual, setRunningSyncManual] = useState(false)
  const [sheetData, setSheetData] = useState({
    korea: { data: [], loading: false, error: null },
    japan: { data: [], loading: false, error: null },
    japan2: { data: [], loading: false, error: null },
    us: { data: [], loading: false, error: null }
  })
  const [selectedSheetCountry, setSelectedSheetCountry] = useState('korea')
  const [filterExistingUsers, setFilterExistingUsers] = useState(true)
  const [selectedSheetCreators, setSelectedSheetCreators] = useState([])
  const [showStibeeModal, setShowStibeeModal] = useState(false)
  const [stibeeTriggerUrl, setStibeeTriggerUrl] = useState('')
  const [stibeeTriggerLabel, setStibeeTriggerLabel] = useState('')
  const [stibeeTriggerPresets, setStibeeTriggerPresets] = useState([])
  const [customTriggerUrl, setCustomTriggerUrl] = useState('')
  const [sendingStibee, setSendingStibee] = useState(false)
  const [stibeeSendProgress, setStibeeSendProgress] = useState({ sent: 0, failed: 0, total: 0 })

  // 스티비 주소록 상태
  const [addressBooks, setAddressBooks] = useState([])
  const [selectedAddressBook, setSelectedAddressBook] = useState('')
  const [loadingAddressBooks, setLoadingAddressBooks] = useState(false)
  const [showAddToListModal, setShowAddToListModal] = useState(false)
  const [addingToList, setAddingToList] = useState(false)
  const [stibeeStep, setStibeeStep] = useState(1) // 1: 주소록 선택, 2: 템플릿 입력, 3: 발송 확인
  const [addressBookSubscriberCount, setAddressBookSubscriberCount] = useState(0)
  const [loadingSubscriberCount, setLoadingSubscriberCount] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (activeTab === 'list') {
      fetchProspects()
      fetchStats()
    }
  }, [activeTab, currentPage, statusFilter, emailFilter])

  // Google Sheets 설정 로드
  useEffect(() => {
    if (activeTab === 'sheets') {
      loadSheetSettings()
    }
  }, [activeTab])

  const checkAuth = async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/admin/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/login')
    }
  }

  const getAuthToken = async () => {
    const { data: { session } } = await supabaseBiz.auth.getSession()
    return session?.access_token
  }

  // Google Sheets 설정 불러오기
  const loadSheetSettings = async () => {
    try {
      const response = await fetch('/.netlify/functions/fetch-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load_settings' })
      })
      const result = await response.json()
      if (result.success && result.settings) {
        // 기존 설정과 병합 (누락된 필드에 기본값 적용)
        const defaultSettings = {
          korea: { url: '', nameColumn: 'A', emailColumn: 'B', sheetTab: '', stibeeListId: '', autoSync: false },
          japan: { url: '', nameColumn: 'A', emailColumn: 'B', sheetTab: '', stibeeListId: '', autoSync: false },
          japan2: { url: '', nameColumn: 'A', emailColumn: 'B', sheetTab: '', stibeeListId: '', autoSync: false },
          us: { url: '', nameColumn: 'A', emailColumn: 'B', sheetTab: '', stibeeListId: '', autoSync: false }
        }
        const mergedSettings = {
          korea: { ...defaultSettings.korea, ...(result.settings.korea || {}) },
          japan: { ...defaultSettings.japan, ...(result.settings.japan || {}) },
          japan2: { ...defaultSettings.japan2, ...(result.settings.japan2 || {}) },
          us: { ...defaultSettings.us, ...(result.settings.us || {}) }
        }
        setSheetSettings(mergedSettings)

        // 마지막 동기화 결과 로드
        try {
          const syncRes = await fetch('/.netlify/functions/fetch-google-sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'load_settings', settingsKey: 'stibee_sync_last_result' })
          })
          const syncResult = await syncRes.json()
          if (syncResult.success && syncResult.settings) {
            setLastSyncResult(syncResult.settings)
          }
        } catch { /* ignore */ }
      }
    } catch (error) {
      console.error('Failed to load sheet settings:', error)
    }
  }

  // Google Sheets 설정 저장
  const saveSheetSettings = async () => {
    try {
      const response = await fetch('/.netlify/functions/fetch-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_settings',
          settings: sheetSettings
        })
      })
      const result = await response.json()
      if (result.success) {
        alert('설정이 저장되었습니다.')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to save sheet settings:', error)
      alert('설정 저장 실패: ' + error.message)
    }
  }

  // Google Sheets에서 데이터 가져오기
  const fetchSheetData = async (country) => {
    const settings = sheetSettings[country]
    if (!settings.url) {
      alert('시트 URL을 입력해주세요.')
      return
    }

    setSheetData(prev => ({
      ...prev,
      [country]: { ...prev[country], loading: true, error: null }
    }))

    try {
      const response = await fetch('/.netlify/functions/fetch-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch',
          sheetUrl: settings.url,
          nameColumn: settings.nameColumn,
          emailColumn: settings.emailColumn,
          sheetTab: settings.sheetTab,
          country: country,
          filterExisting: filterExistingUsers
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      setSheetData(prev => ({
        ...prev,
        [country]: { data: result.data, loading: false, error: null }
      }))

      // 선택 초기화
      setSelectedSheetCreators([])

    } catch (error) {
      console.error('Failed to fetch sheet data:', error)
      setSheetData(prev => ({
        ...prev,
        [country]: { data: [], loading: false, error: error.message }
      }))
    }
  }

  // 시트 크리에이터 선택 토글
  const toggleSheetCreatorSelection = (email) => {
    setSelectedSheetCreators(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    )
  }

  // 전체 선택/해제 (신규만)
  const toggleAllNewCreators = (country) => {
    const newCreators = sheetData[country].data.filter(c => !c.is_existing)
    const allSelected = newCreators.every(c => selectedSheetCreators.includes(c.email))

    if (allSelected) {
      setSelectedSheetCreators(prev => prev.filter(e => !newCreators.some(c => c.email === e)))
    } else {
      const newEmails = newCreators.map(c => c.email)
      setSelectedSheetCreators(prev => [...new Set([...prev, ...newEmails])])
    }
  }

  // 스티비 이메일 발송 (트리거 URL 방식)
  const sendStibeeEmail = async () => {
    if (selectedSheetCreators.length === 0) {
      alert('발송할 크리에이터를 선택해주세요.')
      return
    }

    const triggerUrl = stibeeTriggerUrl || customTriggerUrl
    if (!triggerUrl) {
      alert('트리거 URL을 선택하거나 입력해주세요.')
      return
    }

    if (!confirm(`${selectedSheetCreators.length}명에게 스티비 자동 이메일을 발송하시겠습니까?`)) {
      return
    }

    setSendingStibee(true)
    setStibeeSendProgress({ sent: 0, failed: 0, total: 0 })
    try {
      const allData = [...sheetData.korea.data, ...sheetData.japan.data, ...sheetData.japan2.data, ...sheetData.us.data]
      const subscribers = selectedSheetCreators.map(email => {
        const creator = allData.find(c => c.email === email)
        return {
          email: email,
          name: creator?.name || ''
        }
      })

      // 20명씩 배치로 나눠서 발송 (Netlify 10초 타임아웃 방지)
      const BATCH_SIZE = 20
      let totalSent = 0
      let totalFailed = 0
      setStibeeSendProgress({ sent: 0, failed: 0, total: subscribers.length })

      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE)
        try {
          const response = await fetch('/.netlify/functions/send-stibee-auto-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              triggerUrl: triggerUrl,
              subscribers: batch
            })
          })

          const result = await response.json()
          if (result.success) {
            totalSent += result.results?.sent || 0
            totalFailed += result.results?.failed || 0
          } else {
            totalFailed += batch.length
          }
        } catch (batchErr) {
          console.error(`Batch ${i / BATCH_SIZE + 1} error:`, batchErr)
          totalFailed += batch.length
        }
        setStibeeSendProgress({ sent: totalSent, failed: totalFailed, total: subscribers.length })
      }

      alert(`${totalSent}명에게 이메일 발송 완료!${totalFailed ? ` (${totalFailed}명 실패)` : ''}`)
      setShowStibeeModal(false)
      setSelectedSheetCreators([])

    } catch (error) {
      console.error('Failed to send Stibee email:', error)
      alert('이메일 발송 실패: ' + error.message)
    } finally {
      setSendingStibee(false)
    }
  }

  // 스티비 트리거 프리셋 목록 조회
  const fetchTriggerPresets = async () => {
    try {
      const response = await fetch('/.netlify/functions/send-stibee-auto-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_presets' })
      })
      const result = await response.json()
      if (result.success && result.presets) {
        setStibeeTriggerPresets(result.presets)
      }
    } catch (error) {
      console.error('Failed to fetch trigger presets:', error)
    }
  }

  // 스티비 주소록 목록 조회
  const fetchAddressBooks = async () => {
    setLoadingAddressBooks(true)
    try {
      const response = await fetch('/.netlify/functions/stibee-address-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lists' })
      })
      const result = await response.json()
      if (result.success) {
        setAddressBooks(result.lists || [])
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to fetch address books:', error)
      alert('주소록 목록 조회 실패: ' + error.message)
    } finally {
      setLoadingAddressBooks(false)
    }
  }

  // 선택한 크리에이터를 스티비 주소록에 추가
  const addToAddressBook = async () => {
    if (!selectedAddressBook) {
      alert('주소록을 선택해주세요.')
      return
    }
    if (selectedSheetCreators.length === 0) {
      alert('추가할 크리에이터를 선택해주세요.')
      return
    }

    if (!confirm(`${selectedSheetCreators.length}명을 선택한 주소록에 추가하시겠습니까?`)) return

    setAddingToList(true)
    try {
      const allData = [...sheetData.korea.data, ...sheetData.japan.data, ...sheetData.japan2.data, ...sheetData.us.data]
      const subscribers = selectedSheetCreators.map(email => {
        const creator = allData.find(c => c.email === email)
        return { email, name: creator?.name || '' }
      })

      const response = await fetch('/.netlify/functions/stibee-address-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_subscribers',
          listId: selectedAddressBook,
          subscribers
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`주소록 추가 완료!\n${result.message}`)
        setShowAddToListModal(false)
        setSelectedSheetCreators([])
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to add to address book:', error)
      alert('주소록 추가 실패: ' + error.message)
    } finally {
      setAddingToList(false)
    }
  }

  // 주소록 구독자 수 조회
  const fetchSubscriberCount = async (listId) => {
    if (!listId) return
    setLoadingSubscriberCount(true)
    try {
      const response = await fetch('/.netlify/functions/stibee-address-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_subscribers', listId })
      })
      const result = await response.json()
      if (result.success) {
        setAddressBookSubscriberCount(result.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch subscriber count:', error)
    } finally {
      setLoadingSubscriberCount(false)
    }
  }

  // 주소록 대상 메일 발송 (트리거 URL 방식)
  const sendToAddressBook = async () => {
    if (!selectedAddressBook) {
      alert('주소록을 선택해주세요.')
      return
    }

    const triggerUrl = stibeeTriggerUrl || customTriggerUrl
    if (!triggerUrl) {
      alert('트리거 URL을 선택하거나 입력해주세요.')
      return
    }

    const selectedBook = addressBooks.find(b => b.id?.toString() === selectedAddressBook?.toString())
    if (!confirm(`"${selectedBook?.name || selectedAddressBook}" 주소록의 ${addressBookSubscriberCount}명에게 자동 이메일을 발송하시겠습니까?`)) return

    setSendingStibee(true)
    setStibeeSendProgress({ sent: 0, failed: 0, total: 0 })
    try {
      // 1. 주소록에서 구독자 목록 가져오기
      const subsResponse = await fetch('/.netlify/functions/stibee-address-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_subscribers',
          listId: selectedAddressBook
        })
      })
      const subsResult = await subsResponse.json()
      if (!subsResult.success) throw new Error(subsResult.error || '구독자 목록 조회 실패')

      const subscribers = (subsResult.subscribers || []).map(s => ({
        email: s.email,
        name: s.name || ''
      }))

      if (subscribers.length === 0) throw new Error('주소록에 구독자가 없습니다.')

      // 2. 트리거 URL로 자동 이메일 발송 (20명씩 배치, 진행률 표시)
      const BATCH_SIZE = 20
      let totalSent = 0
      let totalFailed = 0
      setStibeeSendProgress({ sent: 0, failed: 0, total: subscribers.length })

      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE)
        try {
          const response = await fetch('/.netlify/functions/send-stibee-auto-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              triggerUrl: triggerUrl,
              subscribers: batch
            })
          })

          const result = await response.json()
          if (result.success) {
            totalSent += result.results?.sent || 0
            totalFailed += result.results?.failed || 0
          } else {
            totalFailed += batch.length
          }
        } catch (batchErr) {
          console.error(`Batch ${i / BATCH_SIZE + 1} error:`, batchErr)
          totalFailed += batch.length
        }
        setStibeeSendProgress({ sent: totalSent, failed: totalFailed, total: subscribers.length })
      }

      alert(`발송 완료!\n${totalSent}명 발송, ${totalFailed}명 실패`)
      setShowStibeeModal(false)
      setStibeeStep(1)
      setStibeeTriggerUrl('')
      setCustomTriggerUrl('')
      setSelectedAddressBook('')
    } catch (error) {
      console.error('Failed to send to address book:', error)
      alert('메일 발송 실패: ' + error.message)
    } finally {
      setSendingStibee(false)
    }
  }

  // YouTube 영상/채널 검색
  const handleSearch = async (pageToken = null) => {
    if (!searchKeyword.trim()) {
      alert('검색 키워드를 입력하세요')
      return
    }

    setSearching(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/search-youtube-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'search',
          keyword: searchKeyword,
          country_code: countryCode,
          max_results: 50,
          min_subscribers: minSubscribers ? parseInt(minSubscribers) : 0,
          max_subscribers: maxSubscribers ? parseInt(maxSubscribers) : undefined,
          page_token: pageToken,
          save_results: true,
          save_only_with_email: saveOnlyWithEmail, // 이메일 있는 것만 저장
          search_type: searchType // 'video' 또는 'channel'
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      if (pageToken) {
        setSearchResults(prev => [...prev, ...result.data.channels])
      } else {
        setSearchResults(result.data.channels)
      }

      setNextPageToken(result.data.nextPageToken)

    } catch (error) {
      console.error('Search error:', error)
      alert('검색 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setSearching(false)
    }
  }

  // YouTube 쇼츠 정보 조회
  const handleGetVideoInfo = async () => {
    if (!shortsUrl.trim()) {
      alert('YouTube 쇼츠 URL을 입력하세요')
      return
    }

    setLoadingVideo(true)
    try {
      const response = await fetch('/.netlify/functions/youtube-to-gif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_gif_url',
          url: shortsUrl,
          start_time: parseInt(startTime) || 0,
          duration: parseInt(gifDuration) || 3
        })
      })

      const result = await response.json()
      if (result.success) {
        setVideoInfo(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      alert('영상 정보 조회 실패: ' + error.message)
    } finally {
      setLoadingVideo(false)
    }
  }

  // 저장된 prospects 목록 조회
  const fetchProspects = async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/search-youtube-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'list',
          country_code: countryCode !== 'all' ? countryCode : undefined,
          outreach_status: statusFilter !== 'all' ? statusFilter : undefined,
          has_email: emailFilter === 'with_email' ? true : emailFilter === 'without_email' ? false : undefined,
          search_term: listSearchTerm || undefined,
          page: currentPage,
          limit: 50
        })
      })

      const result = await response.json()

      if (result.success) {
        setProspects(result.data.prospects || [])
        setTotalPages(result.data.totalPages || 1)
        setTotalCount(result.data.total || 0)
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 통계 조회
  const fetchStats = async () => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/search-youtube-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'stats'
        })
      })

      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Stats error:', error)
    }
  }

  // 이메일 미리보기
  const handlePreviewEmail = async () => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/send-outreach-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'preview',
          language: emailLanguage,
          channel_name: 'Sample Creator'
        })
      })

      const result = await response.json()
      if (result.success) {
        setPreviewHtml(result.html)
        setShowPreviewModal(true)
      } else {
        alert('템플릿 미리보기 실패: ' + (result.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Preview error:', error)
      alert('템플릿 미리보기 중 오류가 발생했습니다: ' + error.message)
    }
  }

  // 단일 이메일 발송
  const handleSendEmail = async (prospectId) => {
    if (!confirm('이 크리에이터에게 섭외 이메일을 발송하시겠습니까?')) return

    setSending(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/send-outreach-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'send_single',
          prospect_id: prospectId,
          language: emailLanguage
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('이메일이 발송되었습니다!')
        fetchProspects()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      alert('발송 실패: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  // 대량 이메일 발송
  const handleBulkSend = async () => {
    if (selectedProspects.length === 0) {
      alert('발송할 크리에이터를 선택하세요')
      return
    }

    if (!confirm(`선택한 ${selectedProspects.length}명에게 섭외 이메일을 발송하시겠습니까?`)) return

    setSending(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/send-outreach-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'send_bulk',
          prospect_ids: selectedProspects,
          language: emailLanguage
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`발송 완료!\n- 성공: ${result.results.sent}건\n- 스킵: ${result.results.skipped}건\n- 실패: ${result.results.failed}건`)
        setSelectedProspects([])
        fetchProspects()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      alert('발송 실패: ' + error.message)
    } finally {
      setSending(false)
      setShowEmailModal(false)
    }
  }

  // 상태 업데이트
  const handleUpdateStatus = async (prospectId, newStatus) => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/search-youtube-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update_status',
          prospect_id: prospectId,
          status: newStatus
        })
      })

      const result = await response.json()
      if (result.success) {
        fetchProspects()
      }
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  // 엑셀 다운로드
  const handleExportExcel = () => {
    const data = prospects.map(p => ({
      '채널명': p.channel_name,
      '채널ID': p.channel_id,
      '핸들': p.channel_handle,
      '국가': p.country_code,
      '구독자': p.subscriber_count,
      '영상수': p.video_count,
      '조회수': p.view_count,
      '이메일': p.extracted_email || '',
      '상태': STATUS_LABELS[p.outreach_status] || p.outreach_status,
      '마지막연락': formatDate(p.last_contacted_at),
      '연락횟수': p.contact_count || 0,
      '등록일': formatDate(p.created_at)
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'YouTubers')
    XLSX.writeFile(wb, `youtuber_prospects_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // 선택 토글
  const toggleSelectAll = () => {
    if (selectedProspects.length === prospects.filter(p => p.extracted_email).length) {
      setSelectedProspects([])
    } else {
      setSelectedProspects(prospects.filter(p => p.extracted_email).map(p => p.id))
    }
  }

  const toggleSelect = (id) => {
    setSelectedProspects(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Youtube className="h-8 w-8 text-red-600" />
            유튜버 검색 & 섭외
          </h1>
          <p className="mt-2 text-gray-600">
            미국/일본 유튜버를 검색하고 섭외 이메일을 발송합니다. (YouTube Data API 공식 사용)
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">전체 수집</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.with_email}</div>
              <div className="text-sm text-gray-500">이메일 있음</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.by_country?.US || 0}</div>
              <div className="text-sm text-gray-500">미국</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.by_country?.JP || 0}</div>
              <div className="text-sm text-gray-500">일본</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{stats.by_status?.contacted || 0}</div>
              <div className="text-sm text-gray-500">연락함</div>
            </CardContent>
          </Card>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              영상 기반 검색
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              수집 목록 ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="sheets" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              시트 가져오기
            </TabsTrigger>
            <TabsTrigger value="gif" className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              쇼츠 → GIF
            </TabsTrigger>
          </TabsList>

          {/* 검색 탭 */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  영상 콘텐츠 기반 크리에이터 검색
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 검색 타입 선택 */}
                <div className="flex gap-4 mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="searchType"
                      value="video"
                      checked={searchType === 'video'}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">영상 콘텐츠 기반 (추천)</span>
                    <span className="text-xs text-gray-500">- 키워드 관련 영상을 올린 크리에이터 검색</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="searchType"
                      value="channel"
                      checked={searchType === 'channel'}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">채널명 검색</span>
                    <span className="text-xs text-gray-500">- 채널명에 키워드 포함</span>
                  </label>
                </div>

                {/* 검색 폼 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      검색 키워드
                    </label>
                    <Input
                      placeholder={searchType === 'video' ? "예: beauty tutorial, gaming review, cooking..." : "예: beauty, vlog, tech..."}
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      국가
                    </label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">미국 (US)</SelectItem>
                        <SelectItem value="JP">일본 (JP)</SelectItem>
                        <SelectItem value="KR">한국 (KR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleSearch()}
                      disabled={searching}
                      className="w-full"
                    >
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      검색
                    </Button>
                  </div>
                </div>

                {/* 구독자 필터 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      최소 구독자
                    </label>
                    <Input
                      type="number"
                      placeholder="예: 10000"
                      value={minSubscribers}
                      onChange={(e) => setMinSubscribers(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      최대 구독자
                    </label>
                    <Input
                      type="number"
                      placeholder="예: 1000000"
                      value={maxSubscribers}
                      onChange={(e) => setMaxSubscribers(e.target.value)}
                    />
                  </div>
                </div>

                {/* 저장 옵션 */}
                <div className="flex items-center gap-2 mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Checkbox
                    id="saveOnlyWithEmail"
                    checked={saveOnlyWithEmail}
                    onCheckedChange={setSaveOnlyWithEmail}
                  />
                  <label htmlFor="saveOnlyWithEmail" className="text-sm font-medium text-green-800 cursor-pointer flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    이메일 있는 크리에이터만 수집 목록에 저장
                  </label>
                  <span className="text-xs text-green-600 ml-2">
                    (체크 해제 시 모든 검색 결과 저장)
                  </span>
                </div>

                {/* 안내 메시지 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">
                        {searchType === 'video' ? '영상 콘텐츠 기반 검색' : '채널명 검색'}
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {searchType === 'video' ? (
                          <>
                            <li>키워드 관련 영상을 올린 크리에이터를 찾습니다</li>
                            <li>예: "beauty tutorial" → 뷰티 튜토리얼 영상을 올린 크리에이터</li>
                            <li>50개 영상 검색 → 중복 제거 → 크리에이터 추출</li>
                          </>
                        ) : (
                          <>
                            <li>채널명에 키워드가 포함된 채널을 검색합니다</li>
                          </>
                        )}
                        <li>채널 설명란에 공개된 이메일만 추출 (합법적 방법)</li>
                        <li>검색 결과는 자동으로 DB에 저장됩니다</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 검색 결과 */}
                {searchResults.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">
                        검색 결과: {searchResults.length}개
                        <span className="ml-2 text-green-600">
                          (이메일 발견: {searchResults.filter(r => r.extracted_email).length}개)
                        </span>
                        {saveOnlyWithEmail && (
                          <span className="ml-2 text-blue-600">
                            → 이메일 있는 {searchResults.filter(r => r.extracted_email).length}개만 저장됨
                          </span>
                        )}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {searchResults.map((channel) => (
                        <div
                          key={channel.channel_id}
                          className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <img
                            src={channel.thumbnail_url || '/placeholder-avatar.png'}
                            alt={channel.channel_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 truncate">
                                {channel.channel_name}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-500">
                              {channel.channel_handle}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {formatSubscribers(channel.subscriber_count)}
                              </span>
                              <span className="flex items-center gap-1">
                                <PlayCircle className="h-3 w-3" />
                                {channel.video_count} 영상
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatSubscribers(channel.view_count)} 조회
                              </span>
                            </div>
                            {/* 이메일 직접 표시 */}
                            {channel.extracted_email ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Mail className="h-4 w-4 text-green-600" />
                                <a
                                  href={`mailto:${channel.extracted_email}`}
                                  className="text-sm font-medium text-green-600 hover:underline"
                                >
                                  {channel.extracted_email}
                                </a>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(channel.extracted_email)
                                    alert('이메일이 복사되었습니다!')
                                  }}
                                  className="text-xs px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  복사
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <a
                                  href={`https://www.youtube.com/channel/${channel.channel_id}/about`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                  title="YouTube About 페이지에서 이메일 확인"
                                >
                                  이메일 확인하기
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <a
                              href={channel.channel_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="YouTube 채널 열기"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </a>
                            {channel.saved ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                저장됨
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                자동저장
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {nextPageToken && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          onClick={() => handleSearch(nextPageToken)}
                          disabled={searching}
                        >
                          더 보기
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 목록 탭 */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    수집된 유튜버 목록
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      엑셀 다운로드
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewEmail}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      템플릿 미리보기
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowEmailModal(true)}
                      disabled={selectedProspects.length === 0}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      선택 발송 ({selectedProspects.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 필터 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <Input
                    placeholder="채널명 검색..."
                    value={listSearchTerm}
                    onChange={(e) => setListSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchProspects()}
                  />
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="국가" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 국가</SelectItem>
                      <SelectItem value="US">미국</SelectItem>
                      <SelectItem value="JP">일본</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="new">신규</SelectItem>
                      <SelectItem value="contacted">연락함</SelectItem>
                      <SelectItem value="responded">응답 받음</SelectItem>
                      <SelectItem value="interested">관심 있음</SelectItem>
                      <SelectItem value="accepted">섭외 성공</SelectItem>
                      <SelectItem value="declined">거절</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={emailFilter} onValueChange={setEmailFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="이메일" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="with_email">이메일 있음</SelectItem>
                      <SelectItem value="without_email">이메일 없음</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchProspects}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    새로고침
                  </Button>
                </div>

                {/* 테이블 */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="p-3 text-left">
                              <Checkbox
                                checked={selectedProspects.length === prospects.filter(p => p.extracted_email).length}
                                onCheckedChange={toggleSelectAll}
                              />
                            </th>
                            <th className="p-3 text-left">채널</th>
                            <th className="p-3 text-left">국가</th>
                            <th className="p-3 text-right">구독자</th>
                            <th className="p-3 text-left">이메일</th>
                            <th className="p-3 text-left">상태</th>
                            <th className="p-3 text-center">연락</th>
                            <th className="p-3 text-center">액션</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prospects.map((prospect) => (
                            <tr key={prospect.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                {prospect.extracted_email && (
                                  <Checkbox
                                    checked={selectedProspects.includes(prospect.id)}
                                    onCheckedChange={() => toggleSelect(prospect.id)}
                                  />
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={prospect.thumbnail_url || '/placeholder-avatar.png'}
                                    alt={prospect.channel_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                  <div>
                                    <a
                                      href={prospect.channel_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-gray-900 hover:text-blue-600"
                                    >
                                      {prospect.channel_name}
                                    </a>
                                    <div className="text-sm text-gray-500">
                                      {prospect.channel_handle}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline">
                                  <Globe className="h-3 w-3 mr-1" />
                                  {prospect.country_code}
                                </Badge>
                              </td>
                              <td className="p-3 text-right font-medium">
                                {formatSubscribers(prospect.subscriber_count)}
                              </td>
                              <td className="p-3">
                                {prospect.extracted_email ? (
                                  <span className="text-sm text-green-600">
                                    {prospect.extracted_email}
                                  </span>
                                ) : (
                                  <a
                                    href={`https://www.youtube.com/channel/${prospect.channel_id}/about`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                    title="YouTube About 페이지에서 이메일 확인"
                                  >
                                    확인하기
                                  </a>
                                )}
                              </td>
                              <td className="p-3">
                                <Select
                                  value={prospect.outreach_status}
                                  onValueChange={(value) => handleUpdateStatus(prospect.id, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <Badge className={STATUS_COLORS[prospect.outreach_status]}>
                                      {STATUS_LABELS[prospect.outreach_status]}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3 text-center">
                                <div className="text-sm">
                                  <div>{prospect.contact_count || 0}회</div>
                                  {prospect.last_contacted_at && (
                                    <div className="text-xs text-gray-500">
                                      {formatDate(prospect.last_contacted_at)}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <a
                                    href={prospect.channel_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-gray-400 hover:text-red-600"
                                  >
                                    <Youtube className="h-4 w-4" />
                                  </a>
                                  {prospect.extracted_email && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSendEmail(prospect.id)}
                                      disabled={sending}
                                    >
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-600">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Google Sheets 탭 */}
          <TabsContent value="sheets">
            <div className="space-y-6">
              {/* 시트 설정 카드 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Google Sheets 설정
                    </CardTitle>
                    <Button onClick={saveSheetSettings} size="sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      설정 저장
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 시트 설정 - 공통 렌더링 */}
                    {[
                      { key: 'korea', label: 'KR 한국', emoji: '🇰🇷', bg: 'blue', schedule: '매일 오후 5시 (KST)' },
                      { key: 'japan', label: 'JP 일본', emoji: '🇯🇵', bg: 'red', schedule: '매일 오후 5시 (KST)' },
                      { key: 'japan2', label: 'JP 일본 2', emoji: '🇯🇵', bg: 'pink', schedule: '매일 오후 5시 (KST)' },
                      { key: 'us', label: 'US 미국', emoji: '🇺🇸', bg: 'purple', schedule: '매일 오전 10시 (EST)' }
                    ].map(({ key, label, emoji, bg, schedule }) => (
                      <div key={key} className={`border rounded-lg p-4 bg-${bg}-50`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={`font-medium text-${bg}-800 flex items-center gap-2`}>
                            {emoji} {label}
                          </h4>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sheetSettings[key]?.autoSync || false}
                              onChange={(e) => setSheetSettings(prev => ({
                                ...prev,
                                [key]: { ...prev[key], autoSync: e.target.checked }
                              }))}
                              className="w-4 h-4 rounded border-gray-300 text-green-600"
                            />
                            <span className="text-xs text-gray-600">자동 발송</span>
                          </label>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">시트 URL</label>
                            <Input
                              placeholder="https://docs.google.com/spreadsheets/d/..."
                              value={sheetSettings[key]?.url || ''}
                              onChange={(e) => setSheetSettings(prev => ({
                                ...prev,
                                [key]: { ...prev[key], url: e.target.value }
                              }))}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">이름 열</label>
                              <Input
                                placeholder="A"
                                value={sheetSettings[key]?.nameColumn || ''}
                                onChange={(e) => setSheetSettings(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], nameColumn: e.target.value.toUpperCase() }
                                }))}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">이메일 열</label>
                              <Input
                                placeholder="B"
                                value={sheetSettings[key]?.emailColumn || ''}
                                onChange={(e) => setSheetSettings(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], emailColumn: e.target.value.toUpperCase() }
                                }))}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">시트 탭</label>
                              <Input
                                placeholder="gid (선택)"
                                value={sheetSettings[key]?.sheetTab || ''}
                                onChange={(e) => setSheetSettings(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], sheetTab: e.target.value }
                                }))}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">스티비 주소록 ID</label>
                            <Input
                              placeholder="주소록 ID (숫자)"
                              value={sheetSettings[key]?.stibeeListId || ''}
                              onChange={(e) => setSheetSettings(prev => ({
                                ...prev,
                                [key]: { ...prev[key], stibeeListId: e.target.value }
                              }))}
                            />
                          </div>
                          {sheetSettings[key]?.autoSync && (
                            <p className="text-xs text-green-700 bg-green-100 rounded px-2 py-1">
                              {schedule} 자동 싱크
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                  </div>

                  {/* 안내 */}
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 space-y-1">
                    <p>
                      <Info className="h-4 w-4 inline mr-2" />
                      Google Sheets는 <strong>"링크가 있는 모든 사용자 - 뷰어"</strong>로 공유 설정되어 있어야 합니다.
                    </p>
                    <p className="text-xs text-yellow-700 ml-6">
                      <strong>시트 탭(gid):</strong> 같은 스프레드시트 내 여러 탭이 있는 경우, URL의 <code className="bg-yellow-100 px-1">#gid=123456</code> 부분의 숫자를 입력하세요.
                      첫 번째 탭은 0입니다.
                    </p>
                    <p className="text-xs text-yellow-700 ml-6">
                      <strong>스티비 주소록 ID:</strong> 스티비 대시보드 → 주소록 → URL의 <code className="bg-yellow-100 px-1">lists/123456</code> 숫자가 ID입니다.
                      자동 발송을 켜면 스케줄에 따라 새 이메일이 주소록에 자동 추가되고, 스티비 자동 이메일이 발송됩니다.
                    </p>
                  </div>

                  {/* 수동 싱크 + 마지막 싱크 결과 */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {lastSyncResult?.timestamp && (
                        <span>마지막 동기화: {new Date(lastSyncResult.timestamp).toLocaleString('ko-KR')}</span>
                      )}
                      {lastSyncResult?.results?.map((r, i) => (
                        <span key={i} className="ml-3">
                          {r.region}: {r.status === 'success' ? `+${r.newCount}명` : r.status === 'skip' ? '변경없음' : r.status}
                        </span>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={runningSyncManual}
                      onClick={async () => {
                        setRunningSyncManual(true)
                        try {
                          const res = await fetch('/.netlify/functions/scheduled-stibee-sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                          })
                          const result = await res.json()
                          if (result.success) {
                            const summary = (result.results || []).map(r =>
                              `${r.region}: ${r.status === 'success' ? `+${r.newCount}명 추가` : r.message || r.status}`
                            ).join('\n')
                            alert(`동기화 완료!\n${summary}`)
                            setLastSyncResult({ timestamp: new Date().toISOString(), results: result.results })
                          } else {
                            alert('동기화 실패: ' + (result.error || '알 수 없는 오류'))
                          }
                        } catch (e) {
                          alert('동기화 오류: ' + e.message)
                        } finally {
                          setRunningSyncManual(false)
                        }
                      }}
                    >
                      {runningSyncManual ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      수동 동기화
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 데이터 가져오기 카드 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      크리에이터 가져오기
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="filterExisting"
                          checked={filterExistingUsers}
                          onCheckedChange={setFilterExistingUsers}
                        />
                        <label htmlFor="filterExisting" className="text-sm cursor-pointer">
                          기존 가입자 표시
                        </label>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (selectedSheetCreators.length === 0) {
                            alert('추가할 크리에이터를 선택해주세요.')
                            return
                          }
                          fetchAddressBooks()
                          setShowAddToListModal(true)
                        }}
                        disabled={selectedSheetCreators.length === 0}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        주소록에 추가 ({selectedSheetCreators.length})
                      </Button>
                      <Button
                        onClick={() => {
                          fetchAddressBooks()
                          setStibeeStep(1)
                          setSelectedAddressBook('')
                          setStibeeTriggerUrl('')
                          setCustomTriggerUrl('')
                          setStibeeTriggerLabel('')
                          setShowStibeeModal(true)
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        스티비 메일 발송
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 국가 선택 탭 */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[
                      { key: 'korea', label: '🇰🇷 한국', color: 'blue' },
                      { key: 'japan', label: '🇯🇵 일본', color: 'red' },
                      { key: 'japan2', label: '🇯🇵 일본 2', color: 'pink' },
                      { key: 'us', label: '🇺🇸 미국', color: 'purple' }
                    ].map(({ key, label, color }) => (
                      <Button
                        key={key}
                        variant={selectedSheetCountry === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedSheetCountry(key)}
                        className={selectedSheetCountry === key ? `bg-${color}-600` : ''}
                      >
                        {label}
                        {sheetData[key].data.length > 0 && (
                          <Badge className="ml-2 bg-white text-gray-800">{sheetData[key].data.length}</Badge>
                        )}
                      </Button>
                    ))}
                  </div>

                  {/* 가져오기 버튼 */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      onClick={() => fetchSheetData(selectedSheetCountry)}
                      disabled={sheetData[selectedSheetCountry].loading || !sheetSettings[selectedSheetCountry].url}
                    >
                      {sheetData[selectedSheetCountry].loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      시트에서 가져오기
                    </Button>
                    {sheetData[selectedSheetCountry].data.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => toggleAllNewCreators(selectedSheetCountry)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        신규만 전체 선택
                      </Button>
                    )}
                  </div>

                  {/* 에러 표시 */}
                  {sheetData[selectedSheetCountry].error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                      <AlertCircle className="h-4 w-4 inline mr-2" />
                      {sheetData[selectedSheetCountry].error}
                    </div>
                  )}

                  {/* 데이터 테이블 */}
                  {sheetData[selectedSheetCountry].data.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-600">
                          총 {sheetData[selectedSheetCountry].data.length}명
                          <span className="mx-2">|</span>
                          <span className="text-green-600">
                            <UserCheck className="h-4 w-4 inline mr-1" />
                            신규: {sheetData[selectedSheetCountry].data.filter(c => !c.is_existing).length}명
                          </span>
                          <span className="mx-2">|</span>
                          <span className="text-orange-600">
                            <UserX className="h-4 w-4 inline mr-1" />
                            기존: {sheetData[selectedSheetCountry].data.filter(c => c.is_existing).length}명
                          </span>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">선택</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {sheetData[selectedSheetCountry].data.map((creator, idx) => (
                              <tr
                                key={idx}
                                className={`${creator.is_existing ? 'bg-orange-50 opacity-60' : 'hover:bg-gray-50'}`}
                              >
                                <td className="px-4 py-3">
                                  <Checkbox
                                    checked={selectedSheetCreators.includes(creator.email)}
                                    onCheckedChange={() => toggleSheetCreatorSelection(creator.email)}
                                    disabled={creator.is_existing}
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium">{creator.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{creator.email}</td>
                                <td className="px-4 py-3">
                                  {creator.is_existing ? (
                                    <Badge className="bg-orange-100 text-orange-800">
                                      <UserX className="h-3 w-3 mr-1" />
                                      기존 가입자
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-800">
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      신규
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 빈 상태 */}
                  {!sheetData[selectedSheetCountry].loading && sheetData[selectedSheetCountry].data.length === 0 && !sheetData[selectedSheetCountry].error && (
                    <div className="text-center py-12 text-gray-500">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>시트 URL을 설정하고 "시트에서 가져오기" 버튼을 클릭하세요.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 주소록에 추가 모달 */}
          <Dialog open={showAddToListModal} onOpenChange={setShowAddToListModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  스티비 주소록에 추가
                </DialogTitle>
                <DialogDescription>
                  선택한 {selectedSheetCreators.length}명을 스티비 주소록에 추가합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주소록 선택
                  </label>
                  {loadingAddressBooks ? (
                    <div className="flex items-center gap-2 text-gray-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      주소록 목록 불러오는 중...
                    </div>
                  ) : (
                    <Select value={selectedAddressBook} onValueChange={setSelectedAddressBook}>
                      <SelectTrigger>
                        <SelectValue placeholder="주소록을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {addressBooks.map(book => (
                          <SelectItem key={book.id} value={book.id?.toString()}>
                            {book.name} ({book.subscriberCount || 0}명)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 space-y-1">
                  <p><strong>추가 대상:</strong> {selectedSheetCreators.length}명</p>
                  <p className="text-xs text-blue-600">이미 주소록에 있는 이메일은 자동으로 업데이트됩니다.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddToListModal(false)}>
                  취소
                </Button>
                <Button
                  onClick={addToAddressBook}
                  disabled={addingToList || !selectedAddressBook}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {addingToList ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  주소록에 추가
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 스티비 메일 발송 모달 (주소록 선택 → 자동 이메일 선택 → 발송) */}
          <Dialog open={showStibeeModal} onOpenChange={(open) => {
            setShowStibeeModal(open)
            if (open) {
              fetchTriggerPresets()
            }
            if (!open) {
              setStibeeStep(1)
              setStibeeTriggerUrl('')
              setStibeeTriggerLabel('')
              setCustomTriggerUrl('')
              setSelectedAddressBook('')
              setAddressBookSubscriberCount(0)
            }
          }}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  스티비 메일 발송
                </DialogTitle>
                <DialogDescription>
                  주소록의 구독자에게 스티비 자동 이메일(트리거)을 발송합니다.
                </DialogDescription>
              </DialogHeader>

              {/* 스텝 인디케이터 */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[
                  { step: 1, label: '주소록 선택' },
                  { step: 2, label: '이메일 선택' },
                  { step: 3, label: '발송 확인' }
                ].map(({ step, label }, idx) => (
                  <div key={step} className="flex items-center gap-2">
                    {idx > 0 && <ChevronRight className="h-4 w-4 text-gray-300" />}
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                      stibeeStep === step
                        ? 'bg-green-100 text-green-800'
                        : stibeeStep > step
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {stibeeStep > step ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <span className="w-4 text-center">{step}</span>
                      )}
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 py-2">
                {/* Step 1: 주소록 선택 */}
                {stibeeStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        발송 대상 주소록
                      </label>
                      {loadingAddressBooks ? (
                        <div className="flex items-center gap-2 text-gray-500 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          주소록 목록 불러오는 중...
                        </div>
                      ) : addressBooks.length === 0 ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                          <AlertCircle className="h-4 w-4 inline mr-2" />
                          주소록이 없습니다. 스티비 대시보드에서 주소록을 먼저 만들어주세요.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                          {addressBooks.map(book => (
                            <div
                              key={book.id}
                              onClick={() => setSelectedAddressBook(book.id?.toString())}
                              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedAddressBook === book.id?.toString()
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <BookOpen className={`h-5 w-5 ${
                                  selectedAddressBook === book.id?.toString() ? 'text-green-600' : 'text-gray-400'
                                }`} />
                                <div>
                                  <p className="font-medium text-gray-900">{book.name}</p>
                                  <p className="text-xs text-gray-500">ID: {book.id}</p>
                                </div>
                              </div>
                              <Badge className={
                                selectedAddressBook === book.id?.toString()
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600'
                              }>
                                {book.subscriberCount || 0}명
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: 트리거 URL 선택 */}
                {stibeeStep === 2 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                      <strong>선택된 주소록:</strong>{' '}
                      {addressBooks.find(b => b.id?.toString() === selectedAddressBook)?.name || selectedAddressBook}
                      <span className="ml-2">
                        ({loadingSubscriberCount ? (
                          <Loader2 className="h-3 w-3 animate-spin inline" />
                        ) : (
                          `${addressBookSubscriberCount}명`
                        )})
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        발송할 자동 이메일 선택
                      </label>
                      {/* 프리셋 목록 */}
                      <div className="space-y-2 mb-3">
                        {stibeeTriggerPresets.map(preset => (
                          <div
                            key={preset.key}
                            onClick={() => {
                              setStibeeTriggerUrl(preset.url)
                              setStibeeTriggerLabel(preset.label)
                              setCustomTriggerUrl('')
                            }}
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                              stibeeTriggerUrl === preset.url
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="font-medium text-sm">{preset.label}</span>
                            {stibeeTriggerUrl === preset.url && (
                              <span className="text-green-600 text-xs font-medium">선택됨</span>
                            )}
                          </div>
                        ))}
                        {stibeeTriggerPresets.length === 0 && (
                          <p className="text-sm text-gray-500 py-2">저장된 프리셋이 없습니다.</p>
                        )}
                      </div>
                      {/* 직접 입력 옵션 */}
                      <div className="border-t pt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          또는 트리거 URL 직접 입력
                        </label>
                        <Input
                          placeholder="https://stibee.com/api/v1.0/auto/..."
                          value={customTriggerUrl}
                          onChange={(e) => {
                            setCustomTriggerUrl(e.target.value)
                            setStibeeTriggerUrl('')
                            setStibeeTriggerLabel('')
                          }}
                          className="text-xs"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          스티비 대시보드 → 자동 이메일 → 트리거 설정에서 URL을 복사하세요.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: 발송 확인 */}
                {stibeeStep === 3 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">주소록</span>
                        <span className="font-medium">
                          {addressBooks.find(b => b.id?.toString() === selectedAddressBook)?.name || selectedAddressBook}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">발송 대상</span>
                        <span className="font-medium">{addressBookSubscriberCount}명</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">자동 이메일</span>
                        <span className="font-medium text-sm">
                          {stibeeTriggerLabel || (customTriggerUrl ? '직접 입력 URL' : '-')}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      <AlertCircle className="h-4 w-4 inline mr-2" />
                      발송을 시작하면 주소록의 모든 구독자에게 자동 이메일이 전송됩니다.
                      취소할 수 없으니 신중하게 확인해주세요.
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2">
                {stibeeStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStibeeStep(s => s - 1)}
                    className="mr-auto"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    이전
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowStibeeModal(false)}>
                  취소
                </Button>
                {stibeeStep < 3 ? (
                  <Button
                    onClick={() => {
                      if (stibeeStep === 1) {
                        if (!selectedAddressBook) {
                          alert('주소록을 선택해주세요.')
                          return
                        }
                        fetchSubscriberCount(selectedAddressBook)
                      }
                      if (stibeeStep === 2 && !stibeeTriggerUrl && !customTriggerUrl) {
                        alert('발송할 자동 이메일을 선택하거나 트리거 URL을 입력해주세요.')
                        return
                      }
                      setStibeeStep(s => s + 1)
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    다음
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={sendToAddressBook}
                    disabled={sendingStibee}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {sendingStibee ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {stibeeSendProgress.total > 0
                          ? `${stibeeSendProgress.sent + stibeeSendProgress.failed} / ${stibeeSendProgress.total}`
                          : '준비 중...'
                        }
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        발송하기
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* GIF 변환 탭 */}
          <TabsContent value="gif">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  유튜브 쇼츠 → GIF 변환
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 입력 폼 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        YouTube 쇼츠 URL
                      </label>
                      <Input
                        placeholder="https://youtube.com/shorts/xxxxx"
                        value={shortsUrl}
                        onChange={(e) => setShortsUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시작 시간 (초)
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        길이 (초)
                      </label>
                      <Select value={gifDuration} onValueChange={setGifDuration}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2초</SelectItem>
                          <SelectItem value="3">3초</SelectItem>
                          <SelectItem value="4">4초</SelectItem>
                          <SelectItem value="5">5초</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleGetVideoInfo}
                    disabled={loadingVideo || !shortsUrl}
                    className="w-full md:w-auto"
                  >
                    {loadingVideo ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Image className="h-4 w-4 mr-2" />
                    )}
                    GIF 변환 옵션 생성
                  </Button>

                  {/* 결과 */}
                  {videoInfo && (
                    <div className="border rounded-lg p-6 bg-gray-50">
                      <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                        <Youtube className="h-5 w-5 text-red-600" />
                        영상 정보
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 썸네일 */}
                        <div>
                          <p className="text-sm text-gray-600 mb-2">썸네일 (GIF 대용 가능)</p>
                          <img
                            src={videoInfo.thumbnails?.high}
                            alt="Video thumbnail"
                            className="rounded-lg w-full"
                          />
                          <div className="mt-2 flex gap-2">
                            <a
                              href={videoInfo.thumbnails?.maxres}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              고화질 다운로드
                            </a>
                          </div>
                        </div>

                        {/* GIF 변환 옵션 */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">GIF 변환 서비스</p>
                            <p className="text-xs text-gray-500 mb-3">
                              아래 서비스에서 {startTime}초 ~ {parseInt(startTime) + parseInt(gifDuration)}초 구간을 GIF로 변환하세요
                            </p>
                            <div className="space-y-2">
                              <a
                                href={videoInfo.external_services?.ezgif}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:border-blue-500 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">EZGIF.com</span>
                                <span className="text-xs text-gray-500">- 무료, 5MB 이하 최적화 가능</span>
                              </a>
                              <a
                                href={videoInfo.external_services?.giphy}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:border-purple-500 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">GIPHY</span>
                                <span className="text-xs text-gray-500">- GIF 생성 및 호스팅</span>
                              </a>
                              <a
                                href={videoInfo.external_services?.makeagif}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:border-green-500 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 text-green-600" />
                                <span className="font-medium">MakeAGif</span>
                                <span className="text-xs text-gray-500">- YouTube URL 직접 입력</span>
                              </a>
                            </div>
                          </div>

                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              <strong>5MB 이하로 만들려면:</strong>
                              <br />
                              • 해상도: 480p 이하
                              <br />
                              • 길이: 3-4초
                              <br />
                              • 프레임: 10-15 fps
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 미리보기 임베드 */}
                      <div className="mt-6">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          영상 미리보기 ({startTime}초 ~ {parseInt(startTime) + parseInt(gifDuration)}초)
                        </p>
                        <div className="aspect-[9/16] max-w-xs bg-black rounded-lg overflow-hidden">
                          <iframe
                            src={videoInfo.embed_url}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 사용 안내 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">GIF 변환 방법</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>YouTube 쇼츠 URL을 입력합니다</li>
                          <li>시작 시간과 길이를 설정합니다</li>
                          <li>"GIF 변환 옵션 생성" 버튼을 클릭합니다</li>
                          <li>외부 서비스(EZGIF 추천)에서 GIF를 생성합니다</li>
                          <li>5MB 이하로 최적화하여 다운로드합니다</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 이메일 발송 모달 */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>섭외 이메일 발송</DialogTitle>
            <DialogDescription>
              선택한 {selectedProspects.length}명의 크리에이터에게 섭외 이메일을 발송합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일 언어
              </label>
              <Select value={emailLanguage} onValueChange={setEmailLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (미국)</SelectItem>
                  <SelectItem value="jp">日本語 (일본)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">발송 전 확인사항</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>신규(new) 상태인 크리에이터만 발송됩니다</li>
                    <li>이미 연락한 크리에이터는 스킵됩니다</li>
                    <li>수신거부(opt-out) 링크가 자동 포함됩니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              취소
            </Button>
            <Button onClick={handleBulkSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              발송하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이메일 미리보기 모달 */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>이메일 템플릿 미리보기</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="mb-4">
              <Select value={emailLanguage} onValueChange={(v) => {
                setEmailLanguage(v)
                handlePreviewEmail()
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="jp">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
