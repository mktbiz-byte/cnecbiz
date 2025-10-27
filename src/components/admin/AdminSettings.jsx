import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Save, AlertCircle, Package } from 'lucide-react'

const AdminSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 각 지역별 계좌 정보
  const [accounts, setAccounts] = useState({
    korea: { bank_name: '', account_number: '', account_holder: '' },
    japan: { bank_name: '', account_number: '', account_holder: '' },
    us: { bank_name: '', account_number: '', account_holder: '' },
    taiwan: { bank_name: '', account_number: '', account_holder: '' }
  })

  // 패키지 설정
  const [packageSettings, setPackageSettings] = useState([])

  useEffect(() => {
    loadAccounts()
    loadPackageSettings()
  }, [])

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_accounts')
        .select('*')

      if (error && error.code !== 'PGRST116') throw error

      if (data && data.length > 0) {
        const accountsMap = {}
        data.forEach(account => {
          accountsMap[account.region] = {
            id: account.id,
            bank_name: account.bank_name,
            account_number: account.account_number,
            account_holder: account.account_holder
          }
        })
        setAccounts(prev => ({ ...prev, ...accountsMap }))
      }
    } catch (err) {
      console.error('계좌 정보 로드 실패:', err)
      setError('계좌 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadPackageSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('package_settings')
        .select('*')
        .order('price', { ascending: true })

      if (error) throw error

      setPackageSettings(data || [])
    } catch (err) {
      console.error('패키지 설정 로드 실패:', err)
      setError('패키지 설정을 불러오는데 실패했습니다.')
    }
  }

  const handleAccountChange = (region, field, value) => {
    setAccounts(prev => ({
      ...prev,
      [region]: {
        ...prev[region],
        [field]: value
      }
    }))
  }

  const handlePackageChange = (packageType, field, value) => {
    setPackageSettings(prev => prev.map(pkg => 
      pkg.package_type === packageType 
        ? { ...pkg, [field]: parseInt(value) || 0 }
        : pkg
    ))
  }

  const saveAccounts = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      for (const [region, accountData] of Object.entries(accounts)) {
        if (accountData.id) {
          // 업데이트
          const { error } = await supabase
            .from('payment_accounts')
            .update({
              bank_name: accountData.bank_name,
              account_number: accountData.account_number,
              account_holder: accountData.account_holder
            })
            .eq('id', accountData.id)

          if (error) throw error
        } else {
          // 새로 삽입
          const { error } = await supabase
            .from('payment_accounts')
            .insert({
              region,
              bank_name: accountData.bank_name,
              account_number: accountData.account_number,
              account_holder: accountData.account_holder
            })

          if (error) throw error
        }
      }

      setSuccess('계좌 정보가 저장되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
      await loadAccounts()
    } catch (err) {
      console.error('계좌 정보 저장 실패:', err)
      setError('계좌 정보 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const savePackageSettings = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      for (const pkg of packageSettings) {
        const { error } = await supabase
          .from('package_settings')
          .update({
            expected_youtube_applicants: pkg.expected_youtube_applicants,
            expected_instagram_applicants: pkg.expected_instagram_applicants,
            expected_tiktok_applicants: pkg.expected_tiktok_applicants,
            updated_at: new Date().toISOString()
          })
          .eq('package_type', pkg.package_type)

        if (error) throw error
      }

      setSuccess('패키지 설정이 저장되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
      await loadPackageSettings()
    } catch (err) {
      console.error('패키지 설정 저장 실패:', err)
      setError('패키지 설정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">관리자 설정</h1>
        <p className="text-gray-600 mt-2">시스템 전반의 설정을 관리합니다</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="accounts">입금 계좌 관리</TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="w-4 h-4 mr-2" />
            패키지 설정
          </TabsTrigger>
        </TabsList>

        {/* 입금 계좌 관리 탭 */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>지역별 입금 계좌 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 한국 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg mb-4">🇰🇷 한국 (Korea)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>은행명</Label>
                    <Input
                      value={accounts.korea.bank_name}
                      onChange={(e) => handleAccountChange('korea', 'bank_name', e.target.value)}
                      placeholder="예: 국민은행"
                    />
                  </div>
                  <div>
                    <Label>계좌번호</Label>
                    <Input
                      value={accounts.korea.account_number}
                      onChange={(e) => handleAccountChange('korea', 'account_number', e.target.value)}
                      placeholder="예: 123-456-789012"
                    />
                  </div>
                  <div>
                    <Label>예금주</Label>
                    <Input
                      value={accounts.korea.account_holder}
                      onChange={(e) => handleAccountChange('korea', 'account_holder', e.target.value)}
                      placeholder="예: (주)씨넥"
                    />
                  </div>
                </div>
              </div>

              {/* 일본 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg mb-4">🇯🇵 일본 (Japan)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>은행명</Label>
                    <Input
                      value={accounts.japan.bank_name}
                      onChange={(e) => handleAccountChange('japan', 'bank_name', e.target.value)}
                      placeholder="例: 三菱UFJ銀行"
                    />
                  </div>
                  <div>
                    <Label>계좌번호</Label>
                    <Input
                      value={accounts.japan.account_number}
                      onChange={(e) => handleAccountChange('japan', 'account_number', e.target.value)}
                      placeholder="例: 1234567"
                    />
                  </div>
                  <div>
                    <Label>예금주</Label>
                    <Input
                      value={accounts.japan.account_holder}
                      onChange={(e) => handleAccountChange('japan', 'account_holder', e.target.value)}
                      placeholder="例: CNEC株式会社"
                    />
                  </div>
                </div>
              </div>

              {/* 미국 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg mb-4">🇺🇸 미국 (USA)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>은행명</Label>
                    <Input
                      value={accounts.us.bank_name}
                      onChange={(e) => handleAccountChange('us', 'bank_name', e.target.value)}
                      placeholder="e.g., Bank of America"
                    />
                  </div>
                  <div>
                    <Label>계좌번호</Label>
                    <Input
                      value={accounts.us.account_number}
                      onChange={(e) => handleAccountChange('us', 'account_number', e.target.value)}
                      placeholder="e.g., 1234567890"
                    />
                  </div>
                  <div>
                    <Label>예금주</Label>
                    <Input
                      value={accounts.us.account_holder}
                      onChange={(e) => handleAccountChange('us', 'account_holder', e.target.value)}
                      placeholder="e.g., CNEC Inc."
                    />
                  </div>
                </div>
              </div>

              {/* 대만 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg mb-4">🇹🇼 대만 (Taiwan)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>은행명</Label>
                    <Input
                      value={accounts.taiwan.bank_name}
                      onChange={(e) => handleAccountChange('taiwan', 'bank_name', e.target.value)}
                      placeholder="例: 台灣銀行"
                    />
                  </div>
                  <div>
                    <Label>계좌번호</Label>
                    <Input
                      value={accounts.taiwan.account_number}
                      onChange={(e) => handleAccountChange('taiwan', 'account_number', e.target.value)}
                      placeholder="例: 123-456-789012"
                    />
                  </div>
                  <div>
                    <Label>예금주</Label>
                    <Input
                      value={accounts.taiwan.account_holder}
                      onChange={(e) => handleAccountChange('taiwan', 'account_holder', e.target.value)}
                      placeholder="例: CNEC股份有限公司"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={saveAccounts} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '저장 중...' : '계좌 정보 저장'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 패키지 설정 탭 */}
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>패키지별 예상 지원 크리에이터 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  각 패키지별로 예상되는 플랫폼별 지원 크리에이터 수를 설정합니다. 
                  이 수치는 캠페인 생성 시 회사에게 표시되어 참고 자료로 활용됩니다.
                </p>
              </div>

              {packageSettings.map((pkg) => (
                <div key={pkg.package_type} className="p-4 border rounded-lg">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg">{pkg.package_name}</h3>
                    <p className="text-sm text-gray-600">{pkg.description}</p>
                    <p className="text-sm font-semibold text-blue-600 mt-1">
                      ₩{pkg.price.toLocaleString()} / 1인당
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>🎥 유튜브 예상 지원자</Label>
                      <Input
                        type="number"
                        value={pkg.expected_youtube_applicants}
                        onChange={(e) => handlePackageChange(pkg.package_type, 'expected_youtube_applicants', e.target.value)}
                        placeholder="15"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">명</p>
                    </div>
                    <div>
                      <Label>📸 인스타그램 예상 지원자</Label>
                      <Input
                        type="number"
                        value={pkg.expected_instagram_applicants}
                        onChange={(e) => handlePackageChange(pkg.package_type, 'expected_instagram_applicants', e.target.value)}
                        placeholder="25"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">명</p>
                    </div>
                    <div>
                      <Label>🎵 틱톡 예상 지원자</Label>
                      <Input
                        type="number"
                        value={pkg.expected_tiktok_applicants}
                        onChange={(e) => handlePackageChange(pkg.package_type, 'expected_tiktok_applicants', e.target.value)}
                        placeholder="20"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">명</p>
                    </div>
                  </div>
                </div>
              ))}

              <Button 
                onClick={savePackageSettings} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '저장 중...' : '패키지 설정 저장'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminSettings

