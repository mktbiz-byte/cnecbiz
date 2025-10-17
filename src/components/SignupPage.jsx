import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz } from '@/lib/supabaseClients'

const SignupPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    company_name: '',
    business_number: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    password: '',
    password_confirm: ''
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.company_name.trim()) {
      newErrors.company_name = '회사명을 입력해주세요'
    }

    if (!formData.business_number.trim()) {
      newErrors.business_number = '사업자등록번호를 입력해주세요'
    }

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = '담당자명을 입력해주세요'
    }

    if (!formData.contact_email.trim()) {
      newErrors.contact_email = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = '올바른 이메일 형식이 아닙니다'
    }

    if (!formData.contact_phone.trim()) {
      newErrors.contact_phone = '연락처를 입력해주세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다'
    }

    if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = '비밀번호가 일치하지 않습니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Check if Supabase client is available
      if (!supabaseBiz) {
        alert('서비스 연결에 실패했습니다. 환경 변수를 확인해주세요.')
        setLoading(false)
        return
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseBiz.auth.signUp({
        email: formData.contact_email,
        password: formData.password,
        options: {
          data: {
            company_name: formData.company_name,
            contact_name: formData.contact_name
          }
        }
      })

      if (authError) throw authError

      // Create company record
      const { error: companyError } = await supabaseBiz
        .from('companies')
        .insert([{
          id: authData.user.id,
          company_name: formData.company_name,
          business_number: formData.business_number,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone
        }])

      if (companyError) throw companyError

      alert('회원가입이 완료되었습니다! 로그인해주세요.')
      navigate('/login')
    } catch (error) {
      console.error('Signup error:', error)
      alert(error.message || '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <Globe className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">CNEC BIZ</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            홈으로
          </Button>
        </div>
      </header>

      {/* Signup Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">기업 회원가입</CardTitle>
            <CardDescription>
              CNEC BIZ에서 글로벌 인플루언서 마케팅을 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company_name">회사명 *</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="(주)크넥"
                  className={errors.company_name ? 'border-red-500' : ''}
                />
                {errors.company_name && (
                  <p className="text-sm text-red-500">{errors.company_name}</p>
                )}
              </div>

              {/* Business Number */}
              <div className="space-y-2">
                <Label htmlFor="business_number">사업자등록번호 *</Label>
                <Input
                  id="business_number"
                  name="business_number"
                  value={formData.business_number}
                  onChange={handleChange}
                  placeholder="123-45-67890"
                  className={errors.business_number ? 'border-red-500' : ''}
                />
                {errors.business_number && (
                  <p className="text-sm text-red-500">{errors.business_number}</p>
                )}
              </div>

              {/* Contact Name */}
              <div className="space-y-2">
                <Label htmlFor="contact_name">담당자명 *</Label>
                <Input
                  id="contact_name"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="홍길동"
                  className={errors.contact_name ? 'border-red-500' : ''}
                />
                {errors.contact_name && (
                  <p className="text-sm text-red-500">{errors.contact_name}</p>
                )}
              </div>

              {/* Contact Email */}
              <div className="space-y-2">
                <Label htmlFor="contact_email">이메일 * (로그인 ID)</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  placeholder="contact@company.com"
                  className={errors.contact_email ? 'border-red-500' : ''}
                />
                {errors.contact_email && (
                  <p className="text-sm text-red-500">{errors.contact_email}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div className="space-y-2">
                <Label htmlFor="contact_phone">연락처 *</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="010-1234-5678"
                  className={errors.contact_phone ? 'border-red-500' : ''}
                />
                {errors.contact_phone && (
                  <p className="text-sm text-red-500">{errors.contact_phone}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="최소 6자 이상"
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Password Confirm */}
              <div className="space-y-2">
                <Label htmlFor="password_confirm">비밀번호 확인 *</Label>
                <Input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력해주세요"
                  className={errors.password_confirm ? 'border-red-500' : ''}
                />
                {errors.password_confirm && (
                  <p className="text-sm text-red-500">{errors.password_confirm}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? '처리 중...' : '회원가입'}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:underline"
                >
                  로그인
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SignupPage

