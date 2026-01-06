import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wallet, CheckCircle, XCircle, Clock, TrendingUp,
  Search, Filter, ChevronUp, ChevronDown, DollarSign, Download, FileText, AlertCircle
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import { maskResidentNumber, decryptResidentNumber } from '../../lib/encryptionHelper'
import { sendWithdrawalRejectedNotification } from '../../services/notifications/creatorNotifications'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

export default function WithdrawalManagement() {
  const navigate = useNavigate()
  const [withdrawals, setWithdrawals] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('korea')
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    korea: { pending: 0, approved: 0, completed: 0, rejected: 0 },
    japan: { pending: 0, approved: 0, completed: 0, rejected: 0 },
    us: { pending: 0, approved: 0, completed: 0, rejected: 0 }
  })
  
  // 국가별 포인트 통계
  const [pointStats, setPointStats] = useState({
    korea: { totalRequested: 0, completed: 0, remaining: 0 },
    japan: { totalRequested: 0, completed: 0, remaining: 0 },
    us: { totalRequested: 0, completed: 0, remaining: 0 }
  })

  // 선택된 출금 신청 (상세보기/처리)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [actionType, setActionType] = useState('') // 'approve', 'reject', 'complete'
  const [priority, setPriority] = useState(0)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    checkAuth()
    fetchWithdrawals()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [withdrawals])

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

  const fetchWithdrawals = async () => {
    setLoading(true)
    try {
      let allWithdrawals = []

      // 1. Korea DB에서 출금 신청 조회 (withdrawals 테이블) - 조인 없이 조회
      if (supabaseKorea) {
        try {
          const { data: koreaData, error: koreaError } = await supabaseKorea
            .from('withdrawals')
            .select('*')
            .order('created_at', { ascending: false })

          if (!koreaError && koreaData && koreaData.length > 0) {
            console.log('Korea DB (withdrawals)에서 데이터 조회:', koreaData.length, '건')

            // user_profiles 별도 조회 (user_id 또는 id로 조회 시도)
            const userIds = [...new Set(koreaData.map(w => w.user_id).filter(Boolean))]
            let userProfiles = {}

            if (userIds.length > 0) {
              // 먼저 id로 조회 시도
              let { data: profiles, error: profileError } = await supabaseKorea
                .from('user_profiles')
                .select('id, user_id, name, email, channel_name')
                .in('id', userIds)

              // id로 조회 실패시 user_id로 재시도
              if (profileError || !profiles || profiles.length === 0) {
                const { data: profiles2 } = await supabaseKorea
                  .from('user_profiles')
                  .select('id, user_id, name, email, channel_name')
                  .in('user_id', userIds)
                profiles = profiles2
              }

              if (profiles) {
                profiles.forEach(p => {
                  // id와 user_id 둘 다로 매핑
                  if (p.id) userProfiles[p.id] = p
                  if (p.user_id) userProfiles[p.user_id] = p
                })
              }
            }

            const koreaWithdrawals = koreaData.map(w => {
              const profile = userProfiles[w.user_id]
              // 주민번호는 나중에 BIZ DB creator_withdrawal_requests에서 매칭됨
              const residentNumber = w.resident_number_encrypted ||
                                     w.resident_registration_number ||
                                     w.resident_number ||
                                     null
              return {
                ...w,
                // 필드 매핑
                creator_name: profile?.channel_name || profile?.name || w.bank_account_holder || 'Unknown',
                region: 'korea',
                requested_points: w.amount,
                requested_amount: w.amount,
                final_amount: Math.round(w.amount * 0.967), // 3.3% 세금 공제
                currency: 'KRW',
                // 필드명 통일 (두 테이블의 필드명이 다름)
                account_number: w.bank_account_number,
                account_holder: w.bank_account_holder,
                resident_registration_number: residentNumber,
                source_db: 'korea'
              }
            })
            allWithdrawals = [...allWithdrawals, ...koreaWithdrawals]
          } else if (koreaError) {
            console.error('Korea DB withdrawals 조회 오류:', koreaError)
          } else {
            console.log('Korea DB (withdrawals): 데이터 없음')
          }
        } catch (koreaError) {
          console.error('Korea DB 조회 오류:', koreaError)
        }

        // 1-2. point_transactions에서 출금 신청 조회 (withdrawals 테이블에 없는 경우 대비)
        try {
          const { data: ptData, error: ptError } = await supabaseKorea
            .from('point_transactions')
            .select('*')
            .eq('transaction_type', 'withdraw')
            .order('created_at', { ascending: false })

          if (!ptError && ptData && ptData.length > 0) {
            console.log('Korea DB (point_transactions)에서 출금 데이터 조회:', ptData.length, '건')

            // 이미 withdrawals에서 조회된 것과 중복 체크 (user_id + amount + 날짜로 비교)
            const existingWithdrawals = allWithdrawals.map(w => ({
              user_id: w.user_id,
              amount: Math.abs(w.amount || w.requested_amount || 0),
              date: w.created_at ? new Date(w.created_at).toDateString() : ''
            }))

            // point_transactions에서 withdrawals에 없는 출금 신청만 추가
            const ptWithdrawals = ptData
              .filter(pt => {
                // related_withdrawal_id가 있으면 이미 처리된 것
                if (pt.related_withdrawal_id) return false

                // user_id + amount + 날짜가 같은 withdrawal이 있으면 중복
                const ptAmount = Math.abs(pt.amount)
                const ptDate = pt.created_at ? new Date(pt.created_at).toDateString() : ''
                const isDuplicate = existingWithdrawals.some(w =>
                  w.user_id === pt.user_id &&
                  w.amount === ptAmount &&
                  w.date === ptDate
                )
                return !isDuplicate
              })
              .map(pt => {
                // description에서 정보 파싱: [출금신청] 10,000원 | 우리은행 1002941050782 (이지훈)
                const desc = pt.description || ''
                const bankMatch = desc.match(/\|\s*([^\d]+)\s+(\d+)\s*\(([^)]+)\)/)

                return {
                  id: pt.id,
                  user_id: pt.user_id,
                  amount: Math.abs(pt.amount),
                  bank_name: bankMatch ? bankMatch[1].trim() : '미등록',
                  bank_account_number: bankMatch ? bankMatch[2] : '',
                  bank_account_holder: bankMatch ? bankMatch[3] : '',
                  status: 'pending',
                  created_at: pt.created_at,
                  // 필드 매핑
                  creator_name: bankMatch ? bankMatch[3] : 'Unknown',
                  region: 'korea',
                  requested_points: Math.abs(pt.amount),
                  requested_amount: Math.abs(pt.amount),
                  final_amount: Math.round(Math.abs(pt.amount) * 0.967),
                  currency: 'KRW',
                  account_number: bankMatch ? bankMatch[2] : '',
                  account_holder: bankMatch ? bankMatch[3] : '',
                  source_db: 'korea_pt' // point_transactions에서 온 데이터 표시
                }
              })

            if (ptWithdrawals.length > 0) {
              console.log('point_transactions에서 추가된 출금 신청:', ptWithdrawals.length, '건')
              allWithdrawals = [...allWithdrawals, ...ptWithdrawals]
            }
          }
        } catch (ptError) {
          console.error('Korea DB point_transactions 조회 오류:', ptError)
        }

        // 1-3. BIZ DB creator_withdrawal_requests에서 주민번호 매핑 데이터 조회
        // (주민번호는 BIZ DB의 creator_withdrawal_requests.resident_registration_number에 저장됨)
        try {
          console.log('BIZ DB에서 주민번호 매핑 데이터 조회 시작...')
          const { data: bizWrData, error: bizWrError } = await supabaseBiz
            .from('creator_withdrawal_requests')
            .select('id, bank_name, account_number, account_holder, resident_registration_number, creator_id')
            .not('resident_registration_number', 'is', null)

          if (bizWrError) {
            console.error('BIZ DB 주민번호 조회 오류:', bizWrError)
          }

          console.log('BIZ DB 주민번호 데이터:', bizWrData?.length || 0, '건')

          if (bizWrData && bizWrData.length > 0) {
            console.log('BIZ DB에서 주민번호 있는 출금 신청:', bizWrData.length, '건')

            // 계좌정보(예금주+계좌번호)로 주민번호 매핑
            const wrResidentByAccount = {}
            bizWrData.forEach(w => {
              if (w.resident_registration_number) {
                // 예금주명+계좌번호로 매핑
                if (w.account_holder && w.account_number) {
                  const key = `${w.account_holder.trim()}_${w.account_number.replace(/\D/g, '')}`
                  wrResidentByAccount[key] = w.resident_registration_number
                }
              }
            })

            console.log('계좌정보 기반 주민번호 매핑:', Object.keys(wrResidentByAccount).length, '건')

            // 기존 withdrawals 항목에 주민번호 병합 (없는 경우에만)
            allWithdrawals = allWithdrawals.map(w => {
              if (!w.resident_registration_number) {
                // 계좌정보로 매칭 시도
                const holder = w.bank_account_holder || w.account_holder
                const accountNum = w.bank_account_number || w.account_number
                if (holder && accountNum) {
                  const key = `${holder.trim()}_${accountNum.replace(/\D/g, '')}`
                  if (wrResidentByAccount[key]) {
                    console.log('계좌정보로 주민번호 매칭 성공:', holder)
                    return {
                      ...w,
                      resident_registration_number: wrResidentByAccount[key]
                    }
                  }
                }
              }
              return w
            })
          }
        } catch (bizWrError) {
          console.error('BIZ DB 주민번호 매핑 조회 오류:', bizWrError)
        }
      }

      // 2. BIZ DB에서도 출금 신청 조회 (통합 DB - creator_withdrawal_requests)
      try {
        const { data: bizData, error: bizError } = await supabaseBiz
          .from('creator_withdrawal_requests')
          .select('*')
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })

        if (!bizError && bizData && bizData.length > 0) {
          console.log('BIZ DB (creator_withdrawal_requests)에서 데이터 조회:', bizData.length, '건')
          const bizWithdrawals = bizData.map(w => ({
            ...w,
            // BIZ DB 필드를 표준화된 이름으로 매핑
            region: w.region || 'korea',
            requested_points: w.requested_points || w.amount,
            requested_amount: w.requested_amount || w.amount,
            final_amount: w.final_amount || Math.round((w.requested_amount || w.amount || 0) * 0.967),
            currency: w.currency || 'KRW',
            bank_name: w.bank_name,
            account_number: w.account_number,
            account_holder: w.account_holder,
            // 주민번호 필드 (BIZ DB는 resident_registration_number 사용)
            resident_registration_number: w.resident_registration_number,
            source_db: 'biz'
          }))
          allWithdrawals = [...allWithdrawals, ...bizWithdrawals]
        }
      } catch (bizError) {
        console.error('BIZ DB (creator_withdrawal_requests) 조회 오류:', bizError)
      }

      console.log('총 출금 신청 건수:', allWithdrawals.length)

      // 3. 크리에이터 정보가 없는 경우 featured_creators에서 조회
      const withdrawalsWithCreators = await Promise.all(
        allWithdrawals.map(async (w) => {
          if (w.creator_name) {
            return w
          }

          if (w.creator_id) {
            const { data: creatorData } = await supabaseBiz
              .from('featured_creators')
              .select('channel_name, name, email')
              .eq('id', w.creator_id)
              .maybeSingle()

            if (creatorData) {
              return {
                ...w,
                creator_name: creatorData.channel_name || creatorData.name || 'Unknown'
              }
            }
          }

          return w
        })
      )

      // 중복 제거 (id 기준)
      const uniqueWithdrawals = withdrawalsWithCreators.reduce((acc, curr) => {
        const existing = acc.find(w => w.id === curr.id)
        if (!existing) {
          acc.push(curr)
        }
        return acc
      }, [])

      setWithdrawals(uniqueWithdrawals)
    } catch (error) {
      console.error('출금 신청 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const newStats = {
      korea: { pending: 0, approved: 0, completed: 0, rejected: 0 },
      japan: { pending: 0, approved: 0, completed: 0, rejected: 0 },
      us: { pending: 0, approved: 0, completed: 0, rejected: 0 }
    }
    
    const newPointStats = {
      korea: { totalRequested: 0, completed: 0, remaining: 0 },
      japan: { totalRequested: 0, completed: 0, remaining: 0 },
      us: { totalRequested: 0, completed: 0, remaining: 0 }
    }

    withdrawals.forEach(w => {
      if (newStats[w.region]) {
        // 상태별 건수 계산
        if (w.status === 'pending') newStats[w.region].pending++
        else if (w.status === 'approved') newStats[w.region].approved++
        else if (w.status === 'completed') newStats[w.region].completed++
        else if (w.status === 'rejected') newStats[w.region].rejected++
        
        // 포인트 통계 계산
        const amount = parseFloat(w.requested_amount || 0)
        if (w.status !== 'rejected') {
          newPointStats[w.region].totalRequested += amount
        }
        if (w.status === 'completed') {
          newPointStats[w.region].completed += amount
        }
      }
    })
    
    // 남은 포인트 계산
    Object.keys(newPointStats).forEach(region => {
      newPointStats[region].remaining = newPointStats[region].totalRequested - newPointStats[region].completed
    })

    setStats(newStats)
    setPointStats(newPointStats)
  }

  const getFilteredWithdrawals = () => {
    let filtered = withdrawals.filter(w => w.region === selectedCountry && w.status === selectedStatus)

    if (searchTerm) {
      filtered = filtered.filter(w => {
        return (
          w.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.account_holder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.paypal_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.account_number?.includes(searchTerm)
        )
      })
    }

    return filtered
  }

  const handleApprove = async (withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setActionType('approve')
    setPriority(0)
    setAdminNotes('')
    setShowDetailModal(true)
  }

  const handleReject = async (withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setActionType('reject')
    setRejectionReason('')
    setShowDetailModal(true)
  }

  const handleComplete = async (withdrawal) => {
    if (!confirm('정말 지급 완료 처리하시겠습니까?')) return

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      // Korea DB인 경우 supabaseKorea 사용
      if (withdrawal.source_db === 'korea' && supabaseKorea) {
        const { error } = await supabaseKorea
          .from('withdrawals')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            processed_by: user?.id
          })
          .eq('id', withdrawal.id)

        if (error) throw error
      } else {
        const { error } = await supabaseBiz
          .from('creator_withdrawal_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processed_by: user.id
          })
          .eq('id', withdrawal.id)

        if (error) throw error
      }

      alert('지급 완료 처리되었습니다.')
      fetchWithdrawals()
    } catch (error) {
      console.error('완료 처리 오류:', error)
      alert('완료 처리 중 오류가 발생했습니다.')
    }
  }

  const handleSubmitAction = async () => {
    if (!selectedWithdrawal) return

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      const isKoreaDB = selectedWithdrawal.source_db === 'korea' || selectedWithdrawal.source_db === 'korea_pt'
      const isFromPointTransactions = selectedWithdrawal.source_db === 'korea_pt'

      if (actionType === 'approve') {
        if (isKoreaDB && supabaseKorea) {
          if (isFromPointTransactions) {
            // point_transactions에서 온 데이터는 withdrawals 테이블에 새로 생성
            const { data: newWithdrawal, error } = await supabaseKorea
              .from('withdrawals')
              .insert([{
                user_id: selectedWithdrawal.user_id,
                amount: selectedWithdrawal.amount,
                bank_name: selectedWithdrawal.bank_name,
                bank_account_number: selectedWithdrawal.bank_account_number || selectedWithdrawal.account_number,
                bank_account_holder: selectedWithdrawal.bank_account_holder || selectedWithdrawal.account_holder,
                status: 'approved',
                admin_notes: adminNotes,
                processed_by: user?.id,
                processed_at: new Date().toISOString(),
                platform_region: 'korea',
                country_code: 'KR',
                created_at: selectedWithdrawal.created_at // 원본 신청일 유지
              }])
              .select()
              .single()

            if (error) throw error

            // 원본 point_transaction에 related_withdrawal_id 설정하여 중복 방지
            if (newWithdrawal && selectedWithdrawal.id) {
              await supabaseKorea
                .from('point_transactions')
                .update({ related_withdrawal_id: newWithdrawal.id })
                .eq('id', selectedWithdrawal.id)
            }
          } else {
            const { error } = await supabaseKorea
              .from('withdrawals')
              .update({
                status: 'approved',
                admin_notes: adminNotes,
                processed_by: user?.id,
                processed_at: new Date().toISOString()
              })
              .eq('id', selectedWithdrawal.id)

            if (error) throw error
          }
        } else {
          const { error } = await supabaseBiz
            .from('creator_withdrawal_requests')
            .update({
              status: 'approved',
              priority: priority,
              admin_notes: adminNotes,
              processed_by: user.id,
              processed_at: new Date().toISOString()
            })
            .eq('id', selectedWithdrawal.id)

          if (error) throw error
        }
        alert('승인되었습니다.')
      } else if (actionType === 'reject') {
        if (!rejectionReason) {
          alert('거절 사유를 입력해주세요.')
          return
        }

        console.log('거절 처리 시작 - source_db:', selectedWithdrawal.source_db, 'id:', selectedWithdrawal.id)

        if (isKoreaDB && supabaseKorea) {
          // 1. withdrawals 상태 업데이트 (korea_pt가 아닌 경우에만)
          if (!isFromPointTransactions) {
            console.log('withdrawals 테이블 업데이트...')
            const { error } = await supabaseKorea
              .from('withdrawals')
              .update({
                status: 'rejected',
                admin_notes: rejectionReason,
                processed_by: user?.id,
                processed_at: new Date().toISOString()
              })
              .eq('id', selectedWithdrawal.id)

            if (error) {
              console.error('withdrawals 업데이트 오류:', error)
              throw error
            }
            console.log('withdrawals 업데이트 완료')
          } else {
            // point_transactions에서 온 데이터는 related_withdrawal_id를 설정하여 중복 방지
            console.log('point_transactions 처리 완료 표시...')
            const { error: ptUpdateError } = await supabaseKorea
              .from('point_transactions')
              .update({
                related_withdrawal_id: 'rejected_' + new Date().getTime() // 거절 처리됨 표시
              })
              .eq('id', selectedWithdrawal.id)

            if (ptUpdateError) {
              console.error('point_transactions 업데이트 오류:', ptUpdateError)
            }
          }

          // 2. 포인트 환불 (양수로 point_transactions에 추가)
          const refundAmount = selectedWithdrawal.requested_amount || selectedWithdrawal.amount
          if (refundAmount && selectedWithdrawal.user_id) {
            const { error: refundError } = await supabaseKorea
              .from('point_transactions')
              .insert([{
                user_id: selectedWithdrawal.user_id,
                amount: Math.abs(refundAmount), // 양수로 환불
                transaction_type: 'refund',
                description: `[출금거절] ${Math.abs(refundAmount).toLocaleString()}원 환불 - ${rejectionReason}`,
                related_withdrawal_id: isFromPointTransactions ? null : selectedWithdrawal.id,
                platform_region: 'kr',
                country_code: 'KR',
                created_at: new Date().toISOString()
              }])

            if (refundError) {
              console.error('포인트 환불 오류:', refundError)
              alert('출금은 거절되었지만 포인트 환불에 실패했습니다. 수동으로 포인트를 지급해주세요.')
            }
          }
        } else {
          const { error } = await supabaseBiz
            .from('creator_withdrawal_requests')
            .update({
              status: 'rejected',
              rejection_reason: rejectionReason,
              processed_by: user.id,
              processed_at: new Date().toISOString()
            })
            .eq('id', selectedWithdrawal.id)

          if (error) throw error
        }

        // 알림톡 발송 (크리에이터 전화번호 조회 후 발송)
        try {
          let creatorPhone = null
          const creatorName = selectedWithdrawal.creator_name || selectedWithdrawal.account_holder || 'Unknown'

          // 전화번호 조회
          if (selectedWithdrawal.user_id && supabaseKorea) {
            const { data: profileData } = await supabaseKorea
              .from('user_profiles')
              .select('phone')
              .eq('id', selectedWithdrawal.user_id)
              .maybeSingle()

            creatorPhone = profileData?.phone

            // id로 못 찾으면 user_id로 재시도
            if (!creatorPhone) {
              const { data: profileData2 } = await supabaseKorea
                .from('user_profiles')
                .select('phone')
                .eq('user_id', selectedWithdrawal.user_id)
                .maybeSingle()
              creatorPhone = profileData2?.phone
            }
          }

          if (creatorPhone) {
            console.log('출금 거절 알림톡 발송:', creatorName, creatorPhone)
            await sendWithdrawalRejectedNotification(creatorPhone, creatorName, {
              reason: rejectionReason
            })
            console.log('출금 거절 알림톡 발송 완료')
          } else {
            console.log('크리에이터 전화번호 없음, 알림톡 미발송')
          }
        } catch (notifyError) {
          console.error('알림톡 발송 오류:', notifyError)
          // 알림톡 실패해도 거절 처리는 완료된 것으로 처리
        }

        alert('거절되었습니다. 포인트가 환불되었습니다.')
      }

      setShowDetailModal(false)
      setSelectedWithdrawal(null)
      fetchWithdrawals()
    } catch (error) {
      console.error('처리 오류:', error)
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: '대기중' },
      approved: { color: 'bg-blue-100 text-blue-700', label: '승인됨' },
      completed: { color: 'bg-green-100 text-green-700', label: '완료' },
      rejected: { color: 'bg-red-100 text-red-700', label: '거절' }
    }

    const badge = badges[status] || badges.pending

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const getCountryLabel = (country) => {
    const labels = {
      korea: '🇰🇷 한국',
      japan: '🇯🇵 일본',
      us: '🇺🇸 미국'
    }
    return labels[country] || country
  }

  // 이번 주 월요일~일요일 범위 계산
  const getWeekRange = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    // 월요일을 시작으로 계산 (일요일=0이면 -6, 월요일=1이면 0, ...)
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return { monday, sunday }
  }

  // 지난 주 월요일~일요일 범위 계산
  const getLastWeekRange = () => {
    const { monday } = getWeekRange()

    const lastMonday = new Date(monday)
    lastMonday.setDate(monday.getDate() - 7)

    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    lastSunday.setHours(23, 59, 59, 999)

    return { monday: lastMonday, sunday: lastSunday }
  }

  // 한국 크리에이터 주간 출금 신청 엑셀 다운로드
  const handleDownloadWeeklyExcel = async (weekType = 'current') => {
    try {
      const { monday, sunday } = weekType === 'current' ? getWeekRange() : getLastWeekRange()

      // 해당 주간의 한국 크리에이터 pending/approved 출금 신청 조회
      const koreaWithdrawals = withdrawals.filter(w => {
        const createdAt = new Date(w.created_at)
        return w.region === 'korea' &&
               (w.status === 'pending' || w.status === 'approved') &&
               createdAt >= monday &&
               createdAt <= sunday
      })

      if (koreaWithdrawals.length === 0) {
        alert(`${weekType === 'current' ? '이번' : '지난'} 주 출금 신청이 없습니다.`)
        return
      }

      // 주민등록번호 복호화 및 데이터 변환
      const excelData = await Promise.all(koreaWithdrawals.map(async (w) => {
        const createdAt = new Date(w.created_at)
        const month = createdAt.getMonth() + 1
        const day = createdAt.getDate()

        // 세금 계산 (3.3% = 소득세 3% + 주민세 0.3%)
        const grossAmount = w.requested_amount || 0
        const incomeTax = Math.round(grossAmount * 0.03) // 소득세 3%
        const residentTax = Math.round(grossAmount * 0.003) // 주민세 0.3%
        const netAmount = grossAmount - incomeTax - residentTax

        // 주민등록번호 복호화
        let residentNumber = ''
        if (w.resident_registration_number) {
          try {
            residentNumber = await decryptResidentNumber(w.resident_registration_number)
          } catch (err) {
            console.error('주민번호 복호화 실패:', err)
            residentNumber = '복호화 실패'
          }
        }

        return {
          '월': month,
          '일': day,
          '이름': w.creator_name || w.account_holder || 'Unknown',
          '주민등록번호': residentNumber,
          '세금공제 전 금액': grossAmount,
          '소득세': incomeTax,
          '주민세': residentTax,
          '실입금액': netAmount,
          '은행명': w.bank_name || '',
          '계좌번호': w.account_number || '',
          '비고': w.admin_notes || ''
        }
      }))

      // 엑셀 워크북 생성
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // 컬럼 너비 설정
      ws['!cols'] = [
        { wch: 5 },   // 월
        { wch: 5 },   // 일
        { wch: 15 },  // 이름
        { wch: 18 },  // 주민등록번호
        { wch: 15 },  // 세금공제 전 금액
        { wch: 12 },  // 소득세
        { wch: 12 },  // 주민세
        { wch: 15 },  // 실입금액
        { wch: 12 },  // 은행명
        { wch: 20 },  // 계좌번호
        { wch: 20 },  // 비고
      ]

      XLSX.utils.book_append_sheet(wb, ws, '출금신청')

      // 파일명 생성
      const startStr = `${monday.getMonth() + 1}월${monday.getDate()}일`
      const endStr = `${sunday.getMonth() + 1}월${sunday.getDate()}일`
      const fileName = `크리에이터_출금신청_${startStr}-${endStr}.xlsx`

      // 다운로드
      XLSX.writeFile(wb, fileName)

      alert(`${koreaWithdrawals.length}건의 출금 신청이 다운로드되었습니다.`)
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error)
      alert('엑셀 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 전체 한국 출금 신청 엑셀 다운로드 (pending + approved)
  const handleDownloadAllKoreaExcel = async () => {
    try {
      const koreaWithdrawals = withdrawals.filter(w =>
        w.region === 'korea' && (w.status === 'pending' || w.status === 'approved')
      )

      if (koreaWithdrawals.length === 0) {
        alert('다운로드할 출금 신청이 없습니다.')
        return
      }

      // 주민등록번호 복호화 및 데이터 변환
      const excelData = await Promise.all(koreaWithdrawals.map(async (w) => {
        const createdAt = new Date(w.created_at)
        const month = createdAt.getMonth() + 1
        const day = createdAt.getDate()

        const grossAmount = w.requested_amount || 0
        const incomeTax = Math.round(grossAmount * 0.03)
        const residentTax = Math.round(grossAmount * 0.003)
        const netAmount = grossAmount - incomeTax - residentTax

        let residentNumber = ''
        if (w.resident_registration_number) {
          try {
            residentNumber = await decryptResidentNumber(w.resident_registration_number)
          } catch (err) {
            residentNumber = '복호화 실패'
          }
        }

        return {
          '월': month,
          '일': day,
          '이름': w.creator_name || w.account_holder || 'Unknown',
          '주민등록번호': residentNumber,
          '세금공제 전 금액': grossAmount,
          '소득세': incomeTax,
          '주민세': residentTax,
          '실입금액': netAmount,
          '은행명': w.bank_name || '',
          '계좌번호': w.account_number || '',
          '비고': w.admin_notes || ''
        }
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      ws['!cols'] = [
        { wch: 5 }, { wch: 5 }, { wch: 15 }, { wch: 18 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 20 }, { wch: 20 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, '출금신청')

      const today = new Date()
      const fileName = `크리에이터_출금신청_전체_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`

      XLSX.writeFile(wb, fileName)
      alert(`${koreaWithdrawals.length}건의 출금 신청이 다운로드되었습니다.`)
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error)
      alert('엑셀 다운로드 중 오류가 발생했습니다.')
    }
  }

  const filteredWithdrawals = getFilteredWithdrawals()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">크리에이터 출금 관리</h1>
                <p className="text-gray-600">국가별, 상태별로 출금 신청을 관리합니다</p>
              </div>

              {/* 한국 크리에이터 엑셀 다운로드 버튼 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadWeeklyExcel('last')}
                  className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  지난주 엑셀
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadWeeklyExcel('current')}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  이번주 엑셀
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadAllKoreaExcel}
                  className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  전체 엑셀
                </Button>
              </div>
            </div>
          </div>

          {/* 국가별 탭 */}
          <Tabs value={selectedCountry} onValueChange={setSelectedCountry} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="korea" className="text-lg">
                🇰🇷 한국
                <Badge className="ml-2 bg-yellow-500">{stats.korea.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="japan" className="text-lg">
                🇯🇵 일본
                <Badge className="ml-2 bg-yellow-500">{stats.japan.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="us" className="text-lg">
                🇺🇸 미국
                <Badge className="ml-2 bg-yellow-500">{stats.us.pending}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* 각 국가별 콘텐츠 */}
            {['korea', 'japan', 'us'].map(country => (
              <TabsContent key={country} value={country}>
                {/* 포인트 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">총 출금 신청 금액</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {country === 'korea' && '₩'}
                            {country === 'japan' && '¥'}
                            {country === 'us' && '$'}
                            {pointStats[country].totalRequested.toLocaleString()}
                          </p>
                        </div>
                        <Wallet className="w-10 h-10 text-blue-300" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">지급 완료 금액</p>
                          <p className="text-2xl font-bold text-green-600">
                            {country === 'korea' && '₩'}
                            {country === 'japan' && '¥'}
                            {country === 'us' && '$'}
                            {pointStats[country].completed.toLocaleString()}
                          </p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-300" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">미지급 금액</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {country === 'korea' && '₩'}
                            {country === 'japan' && '¥'}
                            {country === 'us' && '$'}
                            {pointStats[country].remaining.toLocaleString()}
                          </p>
                        </div>
                        <AlertCircle className="w-10 h-10 text-orange-300" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* 상태별 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('pending')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">대기중</p>
                          <p className="text-3xl font-bold text-yellow-600">{stats[country].pending}</p>
                        </div>
                        <Clock className="w-10 h-10 text-yellow-300" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('approved')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">승인됨</p>
                          <p className="text-3xl font-bold text-blue-600">{stats[country].approved}</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-blue-300" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('completed')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">완료</p>
                          <p className="text-3xl font-bold text-green-600">{stats[country].completed}</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-green-300" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('rejected')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">거절</p>
                          <p className="text-3xl font-bold text-red-600">{stats[country].rejected}</p>
                        </div>
                        <XCircle className="w-10 h-10 text-red-300" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 상태별 탭 */}
                <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="pending">
                      대기중 ({stats[country].pending})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                      승인됨 ({stats[country].approved})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      완료 ({stats[country].completed})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                      거절 ({stats[country].rejected})
                    </TabsTrigger>
                  </TabsList>

                  {/* 검색 */}
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="크리에이터명, 이메일, 계좌정보로 검색..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* 출금 신청 목록 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          {getCountryLabel(country)} - {getStatusBadge(selectedStatus).props.children} ({filteredWithdrawals.length}건)
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="text-center py-12 text-gray-500">로딩 중...</div>
                      ) : filteredWithdrawals.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          출금 신청이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredWithdrawals.map((withdrawal) => (
                            <div
                              key={withdrawal.id}
                              className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="text-lg font-bold">
                                    {withdrawal.creator_name || 'Unknown'}
                                  </h3>
                                  {getStatusBadge(withdrawal.status)}
                                  {withdrawal.priority > 0 && (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                      우선순위: {withdrawal.priority}
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                  <div>
                                    <span className="font-medium">신청 포인트:</span> {withdrawal.requested_points.toLocaleString()}P
                                  </div>
                                  <div>
                                    <span className="font-medium">지급액:</span> {withdrawal.final_amount?.toLocaleString()} {withdrawal.currency}
                                  </div>
                                  <div>
                                    <span className="font-medium">신청일:</span> {new Date(withdrawal.created_at).toLocaleDateString('ko-KR')}
                                  </div>
                                  {withdrawal.region === 'korea' ? (
                                    <>
                                      <div>
                                        <span className="font-medium">계좌:</span> {withdrawal.bank_name} {withdrawal.account_number}
                                      </div>
                                      <div>
                                        <span className="font-medium">주민번호:</span>{' '}
                                        {withdrawal.resident_registration_number ? (
                                          <span className="text-green-600">등록됨 ✓</span>
                                        ) : (
                                          <span className="text-red-500">미등록</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div>
                                      <span className="font-medium">PayPal:</span> {withdrawal.paypal_email}
                                    </div>
                                  )}
                                </div>

                                {withdrawal.admin_notes && (
                                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg mb-2">
                                    <span className="font-medium">관리자 메모:</span> {withdrawal.admin_notes}
                                  </div>
                                )}

                                {withdrawal.rejection_reason && (
                                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="font-medium">거절 사유:</span> {withdrawal.rejection_reason}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                {withdrawal.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApprove(withdrawal)}
                                      className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      승인
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReject(withdrawal)}
                                      className="bg-red-50 text-red-600 hover:bg-red-100"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      거절
                                    </Button>
                                  </>
                                )}
                                {withdrawal.status === 'approved' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleComplete(withdrawal)}
                                    className="bg-green-50 text-green-600 hover:bg-green-100"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    지급완료
                                  </Button>
                                )}
                                {withdrawal.status === 'rejected' && (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                    재신청 대기중
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* 승인/거절 모달 */}
      {showDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">
                {actionType === 'approve' ? '출금 승인' : '출금 거절'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">{selectedWithdrawal.creator_name || 'Unknown'}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>신청 포인트: {selectedWithdrawal.requested_points.toLocaleString()}P</div>
                  <div>지급액: {selectedWithdrawal.final_amount?.toLocaleString()} {selectedWithdrawal.currency}</div>
                </div>
              </div>

              {actionType === 'approve' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      우선순위 (0-10, 높을수록 우선)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      관리자 메모 (선택사항)
                    </label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="내부 메모를 입력하세요..."
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    거절 사유 (필수) *
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="크리에이터에게 전달될 거절 사유를 입력하세요. 크리에이터는 이 사유를 확인하고 재신청할 수 있습니다."
                    rows={4}
                    className="border-red-200 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    * 거절된 신청은 크리에이터가 사유를 확인하고 수정하여 재신청할 수 있습니다.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedWithdrawal(null)
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleSubmitAction}
                className={actionType === 'approve' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {actionType === 'approve' ? '승인하기' : '거절하기'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

