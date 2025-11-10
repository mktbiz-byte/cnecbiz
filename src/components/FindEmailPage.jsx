import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FindEmailPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    businessNumber: '',
    phoneNumber: ''
  })
  const [errors, setErrors] = useState({})
  const [foundAccounts, setFoundAccounts] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.businessNumber.trim()) {
      newErrors.businessNumber = '사업자번호를 입력해주세요'
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '담당자 전화번호를 입력해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const response = await fetch('/.netlify/functions/find-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessNumber: formData.businessNumber,
          phoneNumber: formData.phoneNumber
        })
      })

      const result = await response.json()

      if (result.success) {
        setFoundAccounts(result.accounts)
      } else {
        setErrors({ submit: result.error || 'ID 찾기에 실패했습니다.' })
      }
    } catch (error) {
      console.error('ID 찾기 오류:', error)
      setErrors({ submit: '서버 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              로그인으로 돌아가기
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold">ID(이메일) 찾기</CardTitle>
          <CardDescription>
            사업자번호와 담당자 전화번호로 가입한 이메일을 찾을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!foundAccounts ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessNumber">사업자번호</Label>
                <Input
                  id="businessNumber"
                  name="businessNumber"
                  placeholder="123-45-67890"
                  value={formData.businessNumber}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.businessNumber && (
                  <p className="text-sm text-red-500">{errors.businessNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">담당자 전화번호</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="010-1234-5678"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-500">{errors.phoneNumber}</p>
                )}
              </div>

              {errors.submit && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {errors.submit}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? '찾는 중...' : 'ID 찾기'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">
                    {foundAccounts.length}개의 계정을 찾았습니다
                  </h3>
                </div>
                <div className="space-y-2">
                  {foundAccounts.map((account, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <p className="font-medium text-gray-900">{account.email}</p>
                      <p className="text-sm text-gray-600">{account.companyName}</p>
                      <p className="text-xs text-gray-400">
                        가입일: {new Date(account.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setFoundAccounts(null)
                    setFormData({ businessNumber: '', phoneNumber: '' })
                  }}
                >
                  다시 찾기
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate('/login')}
                >
                  로그인하기
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FindEmailPage
