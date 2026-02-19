/**
 * 설 연휴 운영 안내 팝업
 * 2026년 설 연휴 (2/15 ~ 2/18) 고객센터 휴무 공지
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Phone, MessageCircle, Mail, CalendarClock, Megaphone, Sparkles } from 'lucide-react'

export default function HolidayNotice() {
  const [show, setShow] = useState(false)
  const [closing, setClosing] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // 2/13 ~ 2/18 기간에만 표시
    const now = new Date()
    const start = new Date('2026-02-13T00:00:00+09:00')
    const end = new Date('2026-02-18T23:59:59+09:00')
    if (now < start || now > end) return

    // 24시간 내 닫았으면 표시하지 않음
    const dismissedAt = localStorage.getItem('holidayNotice2026_dismissed')
    if (dismissedAt && now.getTime() - Number(dismissedAt) < 24 * 60 * 60 * 1000) return

    // 약간의 딜레이 후 표시 (페이지 로드 후 자연스럽게)
    const timer = setTimeout(() => setShow(true), 800)
    return () => clearTimeout(timer)
  }, [])

  // 관리자, 서명, 결제 페이지에서는 숨김
  const hiddenPaths = ['/admin', '/sign-contract', '/payment']
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => setShow(false), 300)
  }

  const handleDismiss24h = () => {
    localStorage.setItem('holidayNotice2026_dismissed', String(Date.now()))
    handleClose()
  }

  if (!show) return null

  const isToday = new Date().toDateString() === new Date('2026-02-13').toDateString()

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] sm:max-w-[380px] w-auto transition-all duration-300 ${
        closing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}
      style={{ animation: closing ? 'none' : 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden">
        {/* 헤더 */}
        <div className="relative bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-4">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🧧</span>
            <div>
              <p className="text-white font-bold text-[15px] leading-tight">설 연휴 운영 안내</p>
              <p className="text-white/80 text-xs mt-0.5">2025년 2월 15일(토) ~ 18일(수)</p>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4 space-y-3">

          {/* 오늘 마감 경고 */}
          {isToday && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              <div className="flex items-start gap-2">
                <Megaphone className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-800 text-xs font-semibold">금일 오후 4시 마감</p>
                  <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
                    캠페인 생성 활성화 등 요청사항은<br/>
                    <strong>오늘(2/13) 오후 4시까지</strong> 접수해 주세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CS 운영 현황 */}
          <div className="space-y-2">
            <p className="text-gray-500 text-[11px] font-medium uppercase tracking-wide">고객센터 운영</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 text-[13px]">
                <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Phone className="w-3 h-3 text-red-400" />
                </div>
                <span className="text-gray-600">전화 상담</span>
                <span className="ml-auto text-xs text-red-500 font-medium">운영 중단</span>
              </div>
              <div className="flex items-center gap-2.5 text-[13px]">
                <div className="w-5 h-5 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-3 h-3 text-yellow-500" />
                </div>
                <span className="text-gray-600">카카오톡 상담</span>
                <span className="ml-auto text-xs text-red-500 font-medium">응대 불가</span>
              </div>
              <div className="flex items-center gap-2.5 text-[13px]">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail className="w-3 h-3 text-blue-400" />
                </div>
                <span className="text-gray-600">이메일 문의</span>
                <span className="ml-auto text-xs text-emerald-600 font-medium">접수 가능</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* 크리에이터 활동 안내 */}
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              크리에이터 활동은 연휴 중에도 정상 진행되며,
              <span className="text-gray-700 font-medium"> 알림톡·이메일</span>을 통한
              진행 관련 공지는 예정대로 발송됩니다.
            </p>
          </div>

          {/* 정상 운영 재개 */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3.5 py-2.5">
            <CalendarClock className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-[12px] text-gray-600">
              <strong className="text-gray-800">2월 19일(목)</strong>부터 정상 운영 · 순차 답변
            </p>
          </div>

          {/* 새해 인사 */}
          <p className="text-center text-[12px] text-gray-400 pt-1 pb-0.5">
            🎊 새해 복 많이 받으세요!
          </p>

          {/* 24시간 보지 않기 */}
          <button
            onClick={handleDismiss24h}
            className="w-full text-center text-[11px] text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            24시간 동안 보지 않기
          </button>
        </div>
      </div>
    </div>
  )
}
