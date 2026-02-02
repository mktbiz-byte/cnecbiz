import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients';
import TossPaymentWidget from '../payment/TossPaymentWidget';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { CreditCard, Building2, ArrowLeft, CheckCircle2, Info, AlertCircle, ShieldCheck, Wallet, Loader2 } from 'lucide-react';

const PaymentMethodSelection = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('id');
  const region = searchParams.get('region') || 'korea';

  const [paymentMethod, setPaymentMethod] = useState(''); // 'card', 'bank_transfer', or 'voucher'
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voucherBalance, setVoucherBalance] = useState(0);
  const [companyId, setCompanyId] = useState(null);  // companies.id (for updating)
  const [companyUserId, setCompanyUserId] = useState(null);  // companies.user_id (for points_transactions)
  const [companyName, setCompanyName] = useState('');  // for notifications
  const [companyPhone, setCompanyPhone] = useState('');  // for 알림톡
  const [processingVoucher, setProcessingVoucher] = useState(false);

  useEffect(() => {
    const fetchCampaignAndVoucher = async () => {
      if (!campaignId) {
        setError('캠페인 ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient(region);

        // Supabase 클라이언트가 null인 경우 (환경변수 미설정)
        if (!supabase) {
          console.error(`[PaymentMethodSelection] Supabase client for region "${region}" is null`);
          setError(`${region.toUpperCase()} 리전의 데이터베이스 연결이 설정되지 않았습니다.`);
          setLoading(false);
          return;
        }

        console.log(`[PaymentMethodSelection] Fetching campaign ${campaignId} from region: ${region}`);

        const { data, error: fetchError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (fetchError) {
          console.error(`[PaymentMethodSelection] Campaign fetch error:`, fetchError);
          throw fetchError;
        }

        if (!data) {
          console.error(`[PaymentMethodSelection] Campaign not found: ${campaignId}`);
          setError(`캠페인을 찾을 수 없습니다. (ID: ${campaignId}, Region: ${region})`);
          setLoading(false);
          return;
        }

        console.log(`[PaymentMethodSelection] Campaign found:`, data.title);
        setCampaign(data);

        // 수출바우처 잔액 조회 (company_email로 companies 테이블에서 조회)
        if (data?.company_email) {
          const { data: companyData, error: companyError } = await supabaseBiz
            .from('companies')
            .select('id, user_id, points_balance, company_name, phone')
            .eq('email', data.company_email)
            .single();

          if (!companyError && companyData) {
            setVoucherBalance(companyData.points_balance || 0);
            setCompanyId(companyData.id);  // for companies table update
            setCompanyUserId(companyData.user_id);  // for points_transactions
            setCompanyName(companyData.company_name || data.brand || '');  // for notifications
            setCompanyPhone(companyData.phone || '');  // for 알림톡
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('[PaymentMethodSelection] 캠페인 조회 실패:', err);
        setError(`캠페인 정보를 불러오는데 실패했습니다: ${err.message}`);
        setLoading(false);
      }
    };

    fetchCampaignAndVoucher();
  }, [campaignId, region]);

  const handleBankTransfer = () => {
    // 무통장 입금 선택 시 기존 세금계산서 신청 페이지로 이동 (region 파라미터 전달)
    if (campaign.campaign_type === 'oliveyoung') {
      navigate(`/company/campaigns/${campaignId}/invoice/oliveyoung?region=${region}`);
    } else if (campaign.campaign_type === '4week_challenge') {
      navigate(`/company/campaigns/${campaignId}/invoice/4week?region=${region}`);
    } else {
      navigate(`/company/campaigns/${campaignId}/invoice?region=${region}`);
    }
  };

  // 수출바우처 결제 처리
  const handleVoucherPayment = async () => {
    // VAT 별도 금액으로 계산 (총액에서 VAT 제외)
    const paymentAmount = Math.round(totalAmount / 1.1);

    if (voucherBalance < paymentAmount) {
      alert(`수출바우처 잔액이 부족합니다.\n\n필요 금액: ${paymentAmount.toLocaleString()}원 (VAT 별도)\n현재 잔액: ${voucherBalance.toLocaleString()}원`);
      return;
    }

    setProcessingVoucher(true);

    try {
      // 1. 수출바우처 잔액 차감
      const { error: updateError } = await supabaseBiz
        .from('companies')
        .update({ points_balance: voucherBalance - paymentAmount })
        .eq('id', companyId);

      if (updateError) throw updateError;

      // 2. 거래 내역 기록 (company_id는 user_id를 사용)
      const { error: transactionError } = await supabaseBiz
        .from('points_transactions')
        .insert({
          company_id: companyUserId,
          amount: -paymentAmount,
          balance_after: voucherBalance - paymentAmount,
          type: 'spend',
          description: `[수출바우처 결제] ${campaign.title}`,
          campaign_id: campaignId
        });

      if (transactionError) {
        console.error('거래 기록 실패:', transactionError);
      }

      // 3. 캠페인 결제 상태 업데이트
      const supabase = getSupabaseClient(region);
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({
          payment_status: 'paid',
          payment_method: 'voucher',
          paid_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (campaignError) {
        console.error('캠페인 상태 업데이트 실패:', campaignError);
      }

      // 4. 네이버 웍스 알림 발송
      try {
        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const campaignTypeLabel = campaign.campaign_type === 'oliveyoung' ? '올영세일'
          : campaign.campaign_type === '4week_challenge' ? '4주 챌린지'
          : '일반';
        const naverWorksMessage = `[수출바우처 결제 완료 - 캠페인 검수 요청]\n\n캠페인: ${campaign.title}\n타입: ${campaignTypeLabel}\n브랜드: ${campaign.brand || companyName}\n결제 금액: ${paymentAmount.toLocaleString()}원 (VAT 별도)\n\n기업: ${companyName}\n이메일: ${campaign.company_email || '미등록'}\n\n${koreanDate}`;

        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            message: naverWorksMessage,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
          })
        });
        console.log('수출바우처 결제 네이버 웍스 알림 발송 성공');
      } catch (naverWorksError) {
        console.error('수출바우처 결제 네이버 웍스 알림 발송 실패:', naverWorksError);
      }

      // 5. 알림톡 발송 (캠페인 검수 신청)
      if (companyPhone) {
        try {
          // 모집 기간 포맷팅
          const startDate = campaign.recruitment_start ? new Date(campaign.recruitment_start).toLocaleDateString('ko-KR') : '미정';
          const endDate = campaign.recruitment_end ? new Date(campaign.recruitment_end).toLocaleDateString('ko-KR') : '미정';

          await fetch('/.netlify/functions/send-kakao-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: companyPhone,
              receiverName: companyName,
              templateCode: '025100001010',  // 캠페인 검수 신청 템플릿
              variables: {
                '회사명': companyName,
                '캠페인명': campaign.title,
                '시작일': startDate,
                '마감일': endDate,
                '모집인원': campaign.target_creators || '미정'
              }
            })
          });
          console.log('수출바우처 결제 알림톡 발송 성공');
        } catch (kakaoError) {
          console.error('수출바우처 결제 알림톡 발송 실패:', kakaoError);
        }
      }

      alert('수출바우처 결제가 완료되었습니다!');
      navigate('/company/campaigns');

    } catch (err) {
      console.error('수출바우처 결제 실패:', err);
      alert('결제 처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setProcessingVoucher(false);
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

  // 데이터베이스의 estimated_cost를 직접 사용
  const totalAmount = campaign.estimated_cost || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')}>
            ← 캠페인 목록으로
          </Button>
        </div>

        <Card className="mb-6 border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2">
            <CardTitle className="text-3xl flex items-center gap-2">
              <CreditCard className="h-7 w-7 text-blue-600" />
              결제 방법 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-xl text-gray-900">{campaign.title}</h3>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-blue-200">
                <span className="text-base font-semibold text-gray-700">예상 결제 금액</span>
                <span className="text-3xl font-bold text-blue-600">
                  ₩{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {!paymentMethod && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">결제 방법을 선택해주세요</h3>

                {/* 카드 결제 옵션 */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className="w-full p-6 border-2 border-blue-300 rounded-xl hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 text-left group shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
                        <CreditCard className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">카드 결제</h4>
                        <p className="text-sm text-gray-600">신용카드, 체크카드로 즉시 결제</p>
                      </div>
                    </div>
                    <div className="text-blue-600 font-bold text-lg">선택 →</div>
                  </div>
                </button>

                {/* 수출바우처 결제 옵션 */}
                {voucherBalance > 0 && (
                  <button
                    onClick={() => voucherBalance >= Math.round(totalAmount / 1.1) && setPaymentMethod('voucher')}
                    disabled={voucherBalance < Math.round(totalAmount / 1.1)}
                    className={`w-full p-6 border-2 rounded-xl transition-all duration-200 text-left group shadow-md hover:shadow-lg ${
                      voucherBalance >= Math.round(totalAmount / 1.1)
                        ? 'border-purple-300 hover:border-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full transition-colors ${
                          voucherBalance >= Math.round(totalAmount / 1.1)
                            ? 'bg-purple-100 group-hover:bg-purple-200'
                            : 'bg-gray-200'
                        }`}>
                          <Wallet className={`h-8 w-8 ${
                            voucherBalance >= Math.round(totalAmount / 1.1) ? 'text-purple-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h4 className={`text-xl font-bold ${
                            voucherBalance >= Math.round(totalAmount / 1.1)
                              ? 'text-gray-800 group-hover:text-purple-600'
                              : 'text-gray-500'
                          }`}>
                            수출바우처 결제
                          </h4>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-600">
                              잔액: <span className={`font-bold ${voucherBalance >= Math.round(totalAmount / 1.1) ? 'text-purple-600' : 'text-red-500'}`}>
                                {voucherBalance.toLocaleString()}원
                              </span>
                              <span className="text-gray-400 text-xs ml-1">(VAT 별도)</span>
                            </p>
                            {voucherBalance < Math.round(totalAmount / 1.1) && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">잔액 부족</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            필요 금액: {Math.round(totalAmount / 1.1).toLocaleString()}원 (VAT 별도)
                          </p>
                        </div>
                      </div>
                      <div className={`font-bold text-lg ${
                        voucherBalance >= Math.round(totalAmount / 1.1) ? 'text-purple-600' : 'text-gray-400'
                      }`}>
                        선택 →
                      </div>
                    </div>
                  </button>
                )}

                {/* 무통장 입금 옵션 */}
                <button
                  onClick={handleBankTransfer}
                  className="w-full p-6 border-2 border-green-300 rounded-xl hover:border-green-600 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 text-left group shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors">
                        <Building2 className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-800 group-hover:text-green-600">무통장 입금</h4>
                        <p className="text-sm text-gray-600">계좌이체 후 입금 확인 (세금계산서 발행 가능)</p>
                      </div>
                    </div>
                    <div className="text-green-600 font-bold text-lg">선택 →</div>
                  </div>
                </button>

                {/* 환불 규정 */}
                <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                    <h4 className="font-bold text-gray-800">환불 규정</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">100%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">캠페인 진행 전</p>
                        <p className="text-sm text-gray-600">전액 환불 가능</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-amber-600 font-bold text-sm">50%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">캠페인 진행 후</p>
                        <p className="text-sm text-gray-600">50% 환불 가능</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">캠페인 진행 기준:</span> 크리에이터 선정 완료 시점
                      </p>
                    </div>
                  </div>
                </div>
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
                  amount={totalAmount}
                  orderId={`campaign_${campaignId}_${Date.now()}`}
                  orderName={campaign.title}
                  customerEmail={campaign.company_email || ''}
                  customerName={campaign.brand || '고객'}
                />
              </div>
            )}

            {/* 수출바우처 결제 선택 시 확인 화면 표시 */}
            {paymentMethod === 'voucher' && (
              <div className="mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setPaymentMethod('')}
                  className="mb-4"
                >
                  ← 결제 방법 다시 선택
                </Button>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <Wallet className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">수출바우처 결제</h3>
                      <p className="text-sm text-gray-600">VAT 별도 금액으로 결제됩니다</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">현재 바우처 잔액</span>
                        <span className="text-xl font-bold text-purple-600">
                          {voucherBalance.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">결제 금액 (VAT 별도)</span>
                        <span className="text-xl font-bold text-red-600">
                          -{Math.round(totalAmount / 1.1).toLocaleString()}원
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-right">
                        VAT 포함 시: {totalAmount.toLocaleString()}원
                      </p>
                    </div>

                    <div className="bg-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-purple-800">결제 후 잔액</span>
                        <span className="text-2xl font-bold text-purple-700">
                          {(voucherBalance - Math.round(totalAmount / 1.1)).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleVoucherPayment}
                    disabled={processingVoucher}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {processingVoucher ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        결제 처리 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        수출바우처로 결제하기
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentMethodSelection;
// Force rebuild Tue Dec  9 02:51:18 EST 2025
