import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz, supabaseKorea } from '../lib/supabaseClients'
import { Loader2 } from 'lucide-react'

// Korea site detection
const isKoreaSite = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    return hostname.includes('cnec.co.kr') || hostname.includes('cnec-korea')
  }
  return false
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [statusMessage, setStatusMessage] = useState('로그인 중...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Determine which Supabase client to use based on current site
        const isKorea = isKoreaSite()
        const supabase = isKorea ? supabaseKorea : supabaseBiz

        console.log('AuthCallback - isKoreaSite:', isKorea)
        setStatusMessage(isKorea ? '크리에이터 로그인 중...' : '로그인 중...')

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          navigate('/login')
          return
        }

        if (!session) {
          navigate('/login')
          return
        }

        const user = session.user

        // Korea site - Creator flow
        if (isKorea) {
          setStatusMessage('프로필 확인 중...')

          // Check if user profile exists and is complete
          const { data: profile, error: profileError } = await supabaseKorea
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile check error:', profileError)
          }

          // Check if profile exists and has required fields
          const isProfileComplete = profile &&
            profile.name &&
            profile.phone &&
            (profile.instagram_url || profile.youtube_url || profile.tiktok_url)

          if (isProfileComplete) {
            // Profile complete - go to creator mypage
            console.log('Profile complete, navigating to mypage')
            navigate('/creator/mypage')
          } else {
            // Profile incomplete or doesn't exist - redirect to completion page
            console.log('Profile incomplete, redirecting to completion page')

            // Create a basic profile if it doesn't exist
            if (!profile) {
              const { error: createError } = await supabaseKorea
                .from('user_profiles')
                .insert({
                  user_id: user.id,
                  email: user.email,
                  name: user.user_metadata?.full_name || '',
                  created_at: new Date().toISOString()
                })

              if (createError) {
                console.error('Failed to create initial profile:', createError)
              }
            }

            navigate('/creator/complete-profile')
          }
          return
        }

        // BIZ site - Company/Admin flow
        // Check if admin first
        const { data: adminData, error: adminError } = await supabaseBiz
          .from('admin_users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle()

        if (adminData) {
          console.log('Admin user detected in callback:', adminData)
          navigate('/admin/dashboard')
          return
        }

        // Check if company exists
        const { data: company, error: companyError } = await supabaseBiz
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (companyError && companyError.code !== 'PGRST116') {
          console.error('Company check error:', companyError)
        }

        if (company) {
          // Existing company user
          navigate('/company/dashboard')
        } else {
          // New user - create company profile
          const { error: insertError } = await supabaseBiz
            .from('companies')
            .insert({
              user_id: user.id,
              email: user.email,
              company_name: user.user_metadata?.full_name || user.email.split('@')[0],
              contact_person: user.user_metadata?.full_name || user.email.split('@')[0]
            })

          if (insertError) {
            console.error('Failed to create company:', insertError)
            navigate('/login')
          } else {
            navigate('/company/dashboard')
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/login')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-lg text-slate-600">{statusMessage}</p>
      </div>
    </div>
  )
}

