import React, { useState, useEffect } from 'react'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, RefreshCw, Download, Coins, Calendar, User, FileText } from 'lucide-react'

export default function CreatorPointPaymentsTab() {
  const [pointHistory, setPointHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month

  useEffect(() => {
    fetchPointHistory()
  }, [dateFilter])

  const fetchPointHistory = async () => {
    setLoading(true)
    try {
      const supabase = supabaseKorea || supabaseBiz

      let query = supabase
        .from('point_history')
        .select(`
          *,
          user_profiles:user_id (
            name,
            email,
            phone
          )
        `)
        .eq('type', 'earn')
        .order('created_at', { ascending: false })
        .limit(500)

      // 날짜 필터 적용
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate

        if (dateFilter === 'today') {
          startDate = new Date(now.setHours(0, 0, 0, 0))
        } else if (dateFilter === 'week') {
          startDate = new Date(now.setDate(now.getDate() - 7))
        } else if (dateFilter === 'month') {
          startDate = new Date(now.setMonth(now.getMonth() - 1))
        }

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString())
        }
      }

      const { data, error } = await query

      if (error) throw error

      // 캠페인 정보 조회
      if (data && data.length > 0) {
        const campaignIds = [...new Set(data.map(p => p.campaign_id).filter(Boolean))]

        if (campaignIds.length > 0) {
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id, title, company_email, company_name')
            .in('id', campaignIds)

          const campaignsMap = {}
          campaigns?.forEach(c => {
            campaignsMap[c.id] = c
          })

          const enrichedData = data.map(item => ({
            ...item,
            campaign: campaignsMap[item.campaign_id] || null
          }))

          setPointHistory(enrichedData)
        } else {
          setPointHistory(data)
        }
      } else {
        setPointHistory([])
      }
    } catch (error) {
      console.error('포인트 지급 내역 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = pointHistory.filter(item => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      item.user_profiles?.name?.toLowerCase().includes(searchLower) ||
      item.user_profiles?.email?.toLowerCase().includes(searchLower) ||
      item.campaign?.title?.toLowerCase().includes(searchLower) ||
      item.campaign?.company_name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    )
  })

  // 통계 계산
  const stats = {
    totalPayments: filteredHistory.length,
    totalAmount: filteredHistory.reduce((sum, item) => sum + (item.amount || 0), 0),
    todayPayments: filteredHistory.filter(item => {
      const today = new Date()
      const itemDate = new Date(item.created_at)
      return itemDate.toDateString() === today.toDateString()
    }).length,
    todayAmount: filteredHistory
      .filter(item => {
        const today = new Date()
        const itemDate = new Date(item.created_at)
        return itemDate.toDateString() === today.toDateString()
      })
      .reduce((sum, item) => sum + (item.amount || 0), 0)
  }

  const handleExport = () => {
    const csvContent = [
      ['지급일시', '크리에이터명', '이메일', '캠페인', '기업명', '지급포인트', '설명'].join(','),
      ...filteredHistory.map(item => [
        new Date(item.created_at).toLocaleString('ko-KR'),
        item.user_profiles?.name || '-',
        item.user_profiles?.email || '-',
        item.campaign?.title || '-',
        item.campaign?.company_name || '-',
        item.amount || 0,
        `"${(item.description || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `크리에이터_포인트_지급내역_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">포인트 지급 내역을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">전체 지급 건수</div>
            <div className="text-2xl font-bold mt-1">{stats.totalPayments.toLocaleString()}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">전체 지급 포인트</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{stats.totalAmount.toLocaleString()}P</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">오늘 지급 건수</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{stats.todayPayments.toLocaleString()}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">오늘 지급 포인트</div>
            <div className="text-2xl font-bold mt-1 text-purple-600">{stats.todayAmount.toLocaleString()}P</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('all')}
              >
                전체
              </Button>
              <Button
                variant={dateFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('today')}
              >
                오늘
              </Button>
              <Button
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('week')}
              >
                최근 1주
              </Button>
              <Button
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('month')}
              >
                최근 1개월
              </Button>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="크리에이터명, 이메일, 캠페인명, 기업명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchPointHistory}>
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 포인트 지급 내역 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-green-600" />
            크리에이터 포인트 지급 내역 ({filteredHistory.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              포인트 지급 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-xs font-medium text-gray-600">지급일시</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600">크리에이터</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600">캠페인</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600">기업</th>
                    <th className="p-3 text-right text-xs font-medium text-gray-600">지급 포인트</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600">설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {(item.user_profiles?.name || '?').charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.user_profiles?.name || '-'}</div>
                            <div className="text-xs text-gray-500">{item.user_profiles?.email || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px]">
                          <div className="font-medium text-gray-900 truncate" title={item.campaign?.title}>
                            {item.campaign?.title || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-700">{item.campaign?.company_name || '-'}</div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                          +{(item.amount || 0).toLocaleString()}P
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px] text-sm text-gray-600 truncate" title={item.description}>
                          {item.description || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
