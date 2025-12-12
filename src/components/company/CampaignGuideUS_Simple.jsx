import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'

const CampaignGuideUSSimple = () => {
  const { id: campaignId } = useParams()
  const navigate = useNavigate()
  const supabase = getSupabaseClient('us')

  const [campaignTitle, setCampaignTitle] = useState('')
  const [brandName, setBrandName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (campaignId) {
      loadCampaign()
    }
  }, [campaignId])

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('title, brand, description, requirements')
        .eq('id', campaignId)
        .single()

      if (error) throw error

      if (data) {
        setCampaignTitle(data.title || '')
        setBrandName(data.brand || '')
        setProductDescription(data.description || '')
        setRequirements(data.requirements || '')
      }
    } catch (err) {
      console.error('캠페인 로드 실패:', err)
      setError('캠페인 정보를 불러오는데 실패했습니다.')
    }
  }

  const handleSave = async () => {
    if (!brandName || !productDescription) {
      setError('브랜드명과 제품 설명은 필수입니다.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          brand: brandName,
          description: productDescription,
          requirements: requirements
        })
        .eq('id', campaignId)

      if (error) throw error

      setSuccess('가이드가 저장되었습니다!')
      setTimeout(() => {
        navigate(`/company/campaigns/${campaignId}/invoice`)
      }, 1000)
    } catch (err) {
      console.error('저장 실패:', err)
      setError('저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">크리에이터 가이드 작성</h1>
          
          {campaignTitle && (
            <div className="mb-6 p-4 bg-blue-50 rounded">
              <p className="text-sm text-gray-600">캠페인</p>
              <p className="font-semibold">{campaignTitle}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
              {success}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                브랜드명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="브랜드명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                제품 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="제품의 특징, 효능, 사용법 등을 상세히 설명해주세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                크리에이터 요구사항
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="크리에이터가 꼭 따라야 하는 요구사항을 입력하세요"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => navigate('/company/campaigns')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {processing ? '저장 중...' : '저장하고 결제하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CampaignGuideUSSimple
