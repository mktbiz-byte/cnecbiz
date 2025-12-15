import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseKorea } from '../../lib/supabaseClients'
import { User, Phone, Instagram, Youtube, AlertCircle, CheckCircle, Globe } from 'lucide-react'

export default function ProfileCompletionKorea() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabaseKorea.auth.getUser()

      if (!user) {
        navigate('/login')
        return
      }

      setUser(user)

      // Load existing profile if any
      const { data: profile } = await supabaseKorea
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        setName(profile.name || user.user_metadata?.full_name || '')
        setPhone(profile.phone || '')
        setInstagramUrl(profile.instagram_url || '')
        setYoutubeUrl(profile.youtube_url || '')
        setTiktokUrl(profile.tiktok_url || '')

        // If profile is already complete, redirect to mypage
        const isComplete = profile.name && profile.phone &&
          (profile.instagram_url || profile.youtube_url || profile.tiktok_url)

        if (isComplete) {
          navigate('/creator/mypage')
          return
        }
      } else {
        setName(user.user_metadata?.full_name || '')
      }
    } catch (error) {
      console.error('Error loading user:', error)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return false
    }

    if (!phone.trim()) {
      setError('전화번호를 입력해주세요.')
      return false
    }

    // Phone format validation
    const phoneRegex = /^01[0-9]{8,9}$/
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      setError('올바른 전화번호 형식이 아닙니다. (예: 01012345678)')
      return false
    }

    if (!instagramUrl.trim() && !youtubeUrl.trim() && !tiktokUrl.trim()) {
      setError('SNS 주소를 최소 하나 이상 입력해주세요.')
      return false
    }

    // Validate SNS URLs if provided
    if (instagramUrl && !isValidUrl(instagramUrl, 'instagram')) {
      setError('올바른 인스타그램 URL을 입력해주세요.')
      return false
    }

    if (youtubeUrl && !isValidUrl(youtubeUrl, 'youtube')) {
      setError('올바른 유튜브 URL을 입력해주세요.')
      return false
    }

    if (tiktokUrl && !isValidUrl(tiktokUrl, 'tiktok')) {
      setError('올바른 틱톡 URL을 입력해주세요.')
      return false
    }

    return true
  }

  const isValidUrl = (url, platform) => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()

      switch (platform) {
        case 'instagram':
          return hostname.includes('instagram.com')
        case 'youtube':
          return hostname.includes('youtube.com') || hostname.includes('youtu.be')
        case 'tiktok':
          return hostname.includes('tiktok.com')
        default:
          return true
      }
    } catch {
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setSaving(true)

    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '')

      // Upsert user profile
      const { error: upsertError } = await supabaseKorea
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          name: name.trim(),
          phone: cleanPhone,
          instagram_url: instagramUrl.trim() || null,
          youtube_url: youtubeUrl.trim() || null,
          tiktok_url: tiktokUrl.trim() || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) {
        throw upsertError
      }

      // Profile saved successfully - redirect to mypage
      navigate('/creator/mypage')

    } catch (error) {
      console.error('Error saving profile:', error)
      setError('프로필 저장 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">CNEC Korea</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 shadow-lg shadow-purple-500/25">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            프로필 정보 입력
          </h1>
          <p className="text-gray-500">
            크리에이터 활동을 위해 필수 정보를 입력해주세요
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                </div>
                기본 정보
              </h3>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="실명을 입력해주세요"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">- 없이 숫자만 입력해주세요</p>
              </div>
            </div>

            {/* SNS Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                </div>
                SNS 주소 <span className="text-red-500 text-xs ml-1">* 최소 1개 필수</span>
              </h3>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  인스타그램
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/username"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-500" />
                  유튜브
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                  틱톡
                </label>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@username"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p className="text-sm text-purple-800">
                  <span className="font-semibold">안내:</span> 인스타그램, 유튜브, 틱톡 중 최소 1개의 SNS 주소를 입력해야 합니다.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-4 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  프로필 저장하고 시작하기
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          입력하신 정보는 캠페인 참여 및 크리에이터 활동에 사용됩니다.
        </p>
      </div>
    </div>
  )
}
