import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Save, AlertCircle } from 'lucide-react'

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

  useEffect(() => {
    loadAccounts()
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

  const handleSave = async (region) => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const accountData = accounts[region]
      
      if (!accountData.bank_name || !accountData.account_number || !accountData.account_holder) {
        setError('모든 필드를 입력해주세요.')
        setSaving(false)
        return
      }

      // 기존 계좌 정보가 있는지 확인
      const { data: existing } = await supabase
        .from('payment_accounts')
        .select('id')
        .eq('region', region)
        .single()

      if (existing) {
        // 업데이트
        const { error } = await supabase
          .from('payment_accounts')
          .update({
            bank_name: accountData.bank_name,
            account_number: accountData.account_number,
            account_holder: accountData.account_holder,
            updated_at: new Date().toISOString()
          })
          .eq('region', region)

        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('payment_accounts')
          .insert({
            region: region,
            bank_name: accountData.bank_name,
            account_number: accountData.account_number,
            account_holder: accountData.account_holder
          })

        if (error) throw error
      }

      setSuccess(`${getRegionLabel(region)} 계좌 정보가 저장되었습니다.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('계좌 정보 저장 실패:', err)
      setError('계좌 정보 저장에 실패했습니다: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateAccount = (region, field, value) => {
    setAccounts(prev => ({
      ...prev,
      [region]: {
        ...prev[region],
        [field]: value
      }
    }))
  }

  const getRegionLabel = (region) => {
    const labels = {
      korea: '한국',
      japan: '일본',
      us: '미국',
      taiwan: '대만'
    }
    return labels[region] || region
  }

  const renderAccountForm = (region) => (
    <div className="space-y-4">
      <div>
        <Label>은행명</Label>
        <Input
          value={accounts[region].bank_name}
          onChange={(e) => updateAccount(region, 'bank_name', e.target.value)}
          placeholder="예: 국민은행"
          className="mt-1"
        />
      </div>

      <div>
        <Label>계좌번호</Label>
        <Input
          value={accounts[region].account_number}
          onChange={(e) => updateAccount(region, 'account_number', e.target.value)}
          placeholder="예: 123-456-789012"
          className="mt-1"
        />
      </div>

      <div>
        <Label>예금주</Label>
        <Input
          value={accounts[region].account_holder}
          onChange={(e) => updateAccount(region, 'account_holder', e.target.value)}
          placeholder="예: (주)씨넥"
          className="mt-1"
        />
      </div>

      <Button
        onClick={() => handleSave(region)}
        disabled={saving}
        className="w-full"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? '저장 중...' : '저장'}
      </Button>
    </div>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">관리자 설정</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            각 지역별 입금 계좌 정보를 관리합니다
          </p>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="korea" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="korea">한국</TabsTrigger>
              <TabsTrigger value="japan">일본</TabsTrigger>
              <TabsTrigger value="us">미국</TabsTrigger>
              <TabsTrigger value="taiwan">대만</TabsTrigger>
            </TabsList>

            <TabsContent value="korea" className="mt-6">
              <h3 className="font-semibold mb-4">한국 입금 계좌</h3>
              {renderAccountForm('korea')}
            </TabsContent>

            <TabsContent value="japan" className="mt-6">
              <h3 className="font-semibold mb-4">일본 입금 계좌</h3>
              {renderAccountForm('japan')}
            </TabsContent>

            <TabsContent value="us" className="mt-6">
              <h3 className="font-semibold mb-4">미국 입금 계좌</h3>
              {renderAccountForm('us')}
            </TabsContent>

            <TabsContent value="taiwan" className="mt-6">
              <h3 className="font-semibold mb-4">대만 입금 계좌</h3>
              {renderAccountForm('taiwan')}
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-start gap-2">
              <Save className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">안내사항</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>각 지역별로 입금 계좌 정보를 설정할 수 있습니다</li>
              <li>설정된 계좌 정보는 견적서 페이지에 표시됩니다</li>
              <li>계좌 정보는 언제든지 수정할 수 있습니다</li>
              <li>보안을 위해 관리자만 접근할 수 있도록 권한을 설정하세요</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminSettings

