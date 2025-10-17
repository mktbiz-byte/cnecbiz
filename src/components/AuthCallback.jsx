import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz } from '../lib/supabaseClients'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabaseBiz.auth.getSession()
        
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

        // Check if admin
        const { data: adminData } = await supabaseBiz
          .from('admins')
          .select('*')
          .eq('email', user.email)
          .eq('is_active', true)
          .single()

        if (adminData) {
          navigate('/admin/dashboard')
          return
        }

        // Check if company exists
        const { data: company, error: companyError } = await supabaseBiz
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single()

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
              status: 'active'
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
        <p className="text-lg text-slate-600">로그인 중...</p>
      </div>
    </div>
  )
}

