import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseKorea, supabaseJapan, supabaseUS } from '../../lib/supabaseClients';
import TossPaymentWidget from '../payment/TossPaymentWidget';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

const PaymentMethodSelection = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('id');
  const region = searchParams.get('region') || 'korea';
  
  const [paymentMethod, setPaymentMethod] = useState(''); // 'card' or 'bank_transfer'
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 지역별 Supabase 클라이언트 선택
  const getSupabaseClient = (region) => {
    switch(region) {
      case 'japan': return supabaseJapan;
      case 'us': return supabaseUS;
      default: return supabaseKorea;
    }
  };

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) {
        setError('캠페인 ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient(region);
        const { data, error: fetchError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (fetchError) throw fetchError;
        
        setCampaign(data);
        setLoading(false);
      } catch (err) {
        console.error('캠페인 조회 실패:', err);
        setError('캠페인 정보를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId, region]);

  const handleBankTransfer = () => {
    // 무통장 입금 선택 시 기존 세금계산서 신청 페이지로 이동
    if (campaign.campaign_type === 'oliveyoung') {
      navigate(`/company/campaigns/invoice/oliveyoung?id=${campaignId}`);
    } else if (campaign.campaign_type === '4week_challenge') {
      navigate(`/company/campaigns/invoice/4week?id=${campaignId}`);
    } else {
      navigate(`/company/campaigns/invoice?id=${campaignId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">캠페인 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류</h2>
          <p className="text-gray-700 mb-6">{error || '캠페인을 찾을 수 없습니다.'}</p>
          <Button onClick={() => navigate('/company/campaigns')}>
            캠페인 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')}>
            ← 캠페인 목록으로
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">💳 결제 방법 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-lg text-gray-800 mb-2">{campaign.title}</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">예상 결제 금액</span>
                <span className="text-2xl font-bold text-blue-600">
                  ₩{(campaign.estimated_cost || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {!paymentMethod && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">결제 방법을 선택해주세요</h3>
                
                {/* 카드 결제 옵션 */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">💳</div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">카드 결제</h4>
                        <p className="text-sm text-gray-600">신용카드, 체크카드로 즉시 결제</p>
                      </div>
                    </div>
                    <div className="text-blue-600 font-semibold">선택 →</div>
                  </div>
                </button>

                {/* 무통장 입금 옵션 */}
                <button
                  onClick={handleBankTransfer}
                  className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">🏦</div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-800 group-hover:text-green-600">무통장 입금</h4>
                        <p className="text-sm text-gray-600">계좌이체 후 입금 확인 (세금계산서 발행 가능)</p>
                      </div>
                    </div>
                    <div className="text-green-600 font-semibold">선택 →</div>
                  </div>
                </button>
              </div>
            )}

            {/* 카드 결제 선택 시 토스 결제 위젯 표시 */}
            {paymentMethod === 'card' && (
              <div className="mt-6">
                <Button 
                  variant="ghost" 
                  onClick={() => setPaymentMethod('')}
                  className="mb-4"
                >
                  ← 결제 방법 다시 선택
                </Button>
                
                <TossPaymentWidget
                  amount={campaign.estimated_cost || 0}
                  orderId={`campaign_${campaignId}_${Date.now()}`}
                  orderName={campaign.title}
                  customerEmail={campaign.company_email || ''}
                  customerName={campaign.brand || '고객'}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentMethodSelection;
