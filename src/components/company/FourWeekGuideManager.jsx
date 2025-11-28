import { useState } from 'react'
import { Button } from '../ui/button'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import FourWeekGuideModal from './FourWeekGuideModal'

export default function FourWeekGuideManager({ campaign, filteredParticipants, onRefresh }) {
  const [showGuideModal, setShowGuideModal] = useState(false)

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-purple-900 mb-1">🏆 4주 챌린지 가이드 관리</h3>
            <p className="text-sm text-purple-700">
              주차별 가이드를 생성하고 크리에이터에게 전달하세요
            </p>
          </div>
          <Button
            onClick={() => setShowGuideModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            📝 가이드 관리
          </Button>
        </div>
      </div>
      
      {/* 4주 챌린지 가이드 모달 */}
      {showGuideModal && (
        <FourWeekGuideModal
          campaign={campaign}
          initialWeek={1}
          onClose={() => setShowGuideModal(false)}
          onSave={() => {
            setShowGuideModal(false)
            if (onRefresh) onRefresh()
          }}
          supabase={getSupabaseClient()}
        />
      )}
    </div>
  )
}
