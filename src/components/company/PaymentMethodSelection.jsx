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

        // 수출바우처 잔액 조회 (company_email 또는 company_id로 companies 테이블에서 조회)
        let companyData = null;
        if (data?.company_email) {
          const { data: cd, error: ce } = await supabaseBiz
            .from('companies')
            .select('id, user_id, points_balance, company_name, phone, notification_phone')
            .eq('email', data.company_email)
            .single();
          if (!ce) companyData = cd;
        }
        // company_email이 없으면 company_id(=user_id)로 조회
        if (!companyData && data?.company_id) {
          const { data: cd, error: ce } = await supabaseBiz
            .from('companies')
            .select('id, user_id, points_balance, company_name, phone, notification_phone')
            .eq('user_id', data.company_id)
            .single();
          if (!ce) companyData = cd;
        }
        if (companyData) {
          setVoucherBalance(companyData.points_balance || 0);
          setCompanyId(companyData.id);
          setCompanyUserId(companyData.user_id);
          setCompanyName(companyData.company_name || data.brand || '');
          setCompanyPhone(companyData.notification_phone || companyData.phone || '');
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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6C5CE7] mx-auto mb-4"></div>
          <p className="text-[#636E72]">캠페인 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-4">오류</h2>
          <p className="text-[#636E72] mb-6">{error || '캠페인을 찾을 수 없습니다.'}</p>
          <Button onClick={() => navigate('/company/campaigns')}>
            캠페인 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 패키지 가격 조회 함수 (나라별/캠페인별 가격 체계 반영)
  const getPackagePrice = (packageType, campaignType) => {
    // 일본 캠페인 가격 (캠페인 타입 + 크리에이터 등급 addon)
    if (region === 'japan') {
      const japanCampaignTypePrices = { regular: 200000, megawari: 400000, '4week_challenge': 600000 };
      const japanPackageAddon = { basic: 0, junior: 100000, intermediate: 200000, senior: 300000, premium: 400000 };
      const basePrice = japanCampaignTypePrices[campaignType] || 200000;
      const addon = japanPackageAddon[packageType?.toLowerCase()] || 0;
      return basePrice + addon;
    }

    // 미국 캠페인 가격 (캠페인 타입 + 크리에이터 등급 addon)
    if (region === 'us' || region === 'usa') {
      const usCampaignTypePrices = { regular: 300000, '4week_challenge': 600000 };
      const usPackageAddon = { junior: 0, intermediate: 100000, senior: 200000, premium: 300000 };
      const basePrice = usCampaignTypePrices[campaignType] || 300000;
      const addon = usPackageAddon[packageType?.toLowerCase()] || 0;
      return basePrice + addon;
    }

    // 올리브영 패키지 가격
    const oliveyoungPrices = { 'standard': 400000, 'premium': 500000, 'professional': 600000 };
    // 4주 챌린지 패키지 가격
    const fourWeekPrices = { 'standard': 600000, 'premium': 700000, 'professional': 800000, 'enterprise': 1000000 };
    // 기획형 패키지 가격
    const generalPrices = { 'junior': 200000, 'intermediate': 300000, 'senior': 400000, 'basic': 200000, 'standard': 300000, 'premium': 400000, 'professional': 600000, 'enterprise': 1000000 };
    // 레거시 패키지
    const legacyPrices = { 'oliveyoung': 200000, '올영 20만원': 200000, '프리미엄 30만원': 300000, '4week_challenge': 600000, '4주챌린지 60만원': 600000 };

    const packageKey = packageType?.toLowerCase();
    if (legacyPrices[packageKey]) return legacyPrices[packageKey];
    if (campaignType === 'oliveyoung' && oliveyoungPrices[packageKey]) return oliveyoungPrices[packageKey];
    if (campaignType === '4week_challenge' && fourWeekPrices[packageKey]) return fourWeekPrices[packageKey];
    return generalPrices[packageKey] || 200000;
  };

  // 패키지 가격 기반으로 정확한 금액 계산 (estimated_cost 대신 사용)
  // 스토리 숏폼은 고정 단가 20,000원 × 인원 × 1.1 (VAT)
  const slots = campaign.total_slots || 1;
  const bonus = campaign.bonus_amount || 0;
  const totalAmount = campaign.campaign_type === 'story_short'
    ? Math.round(campaign.estimated_cost || (20000 * (campaign.total_slots || 5) * 1.1))
    : Math.round((getPackagePrice(campaign.package_type, campaign.campaign_type) + bonus) * slots * 1.1);

  if (campaign.estimated_cost && campaign.estimated_cost !== totalAmount) {
    console.warn(`[PaymentMethodSelection] estimated_cost 불일치: DB=${campaign.estimated_cost}, 계산값=${totalAmount}, package=${campaign.package_type}, type=${campaign.campaign_type}, region=${region}, slots=${slots}, bonus=${bonus}`);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-14 pb-20 lg:pt-0 lg:pb-0">
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')}>
            ← 캠페인 목록으로
          </Button>
        </div>

        <Card className="mb-6 bg-white border border-[#DFE6E9] rounded-2xl shadow-lg">
          <CardHeader className="bg-[#F0EDFF] border-b border-[#DFE6E9] p-4 lg:p-6">
            <CardTitle className="text-xl lg:text-3xl flex items-center gap-2">
              <CreditCard className="h-6 w-6 lg:h-7 lg:w-7 text-[#6C5CE7]" />
              결제 방법 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#F0EDFF] border border-[#DFE6E9] rounded-2xl p-4 lg:p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-5 w-5 text-[#6C5CE7]" />
                <h3 className="font-bold text-base lg:text-xl text-[#1A1A2E]">{campaign.title}</h3>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#DFE6E9]">
                <span className="text-sm lg:text-base font-semibold text-[#636E72]">예상 결제 금액</span>
                <span className="text-2xl lg:text-3xl font-bold text-[#6C5CE7] font-['Outfit']">
                  ₩{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {!paymentMethod && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#1A1A2E] mb-4">결제 방법을 선택해주세요</h3>

                {/* 카드 결제 옵션 */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className="w-full p-4 lg:p-6 border border-[#DFE6E9] rounded-2xl hover:border-[#6C5CE7] hover:bg-[#F0EDFF] transition-all duration-200 text-left group shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="bg-[#F0EDFF] p-2 lg:p-3 rounded-full group-hover:bg-[#F0EDFF] transition-colors">
                        <CreditCard className="h-6 w-6 lg:h-8 lg:w-8 text-[#6C5CE7]" />
                      </div>
                      <div>
                        <h4 className="text-base lg:text-xl font-bold text-[#1A1A2E] group-hover:text-[#6C5CE7]">카드 결제</h4>
                        <p className="text-xs lg:text-sm text-[#636E72]">신용카드, 체크카드로 즉시 결제</p>
                      </div>
                    </div>
                    <div className="text-[#6C5CE7] font-bold text-lg hidden sm:block">선택 →</div>
                  </div>
                </button>

                {/* 수출바우처 결제 옵션 */}
                {voucherBalance > 0 && (
                  <button
                    onClick={() => voucherBalance >= Math.round(totalAmount / 1.1) && setPaymentMethod('voucher')}
                    disabled={voucherBalance < Math.round(totalAmount / 1.1)}
                    className={`w-full p-6 border rounded-2xl transition-all duration-200 text-left group shadow-md hover:shadow-lg ${
                      voucherBalance >= Math.round(totalAmount / 1.1)
                        ? 'border-[#DFE6E9] hover:border-[#6C5CE7] hover:bg-[#F0EDFF]'
                        : 'border-[#DFE6E9] bg-[#F8F9FA] cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 lg:gap-4">
                        <div className={`p-2 lg:p-3 rounded-full transition-colors ${
                          voucherBalance >= Math.round(totalAmount / 1.1)
                            ? 'bg-[#F0EDFF]'
                            : 'bg-[#F8F9FA]'
                        }`}>
                          <Wallet className={`h-6 w-6 lg:h-8 lg:w-8 ${
                            voucherBalance >= Math.round(totalAmount / 1.1) ? 'text-[#6C5CE7]' : 'text-[#B2BEC3]'
                          }`} />
                        </div>
                        <div>
                          <h4 className={`text-base lg:text-xl font-bold ${
                            voucherBalance >= Math.round(totalAmount / 1.1)
                              ? 'text-[#1A1A2E] group-hover:text-[#6C5CE7]'
                              : 'text-[#B2BEC3]'
                          }`}>
                            수출바우처 결제
                          </h4>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#636E72]">
                              잔액: <span className={`font-bold font-['Outfit'] ${voucherBalance >= Math.round(totalAmount / 1.1) ? 'text-[#6C5CE7]' : 'text-[#B2BEC3]'}`}>
                                {voucherBalance.toLocaleString()}원
                              </span>
                              <span className="text-[#B2BEC3] text-xs ml-1">(VAT 별도)</span>
                            </p>
                            {voucherBalance < Math.round(totalAmount / 1.1) && (
                              <span className="px-2 py-0.5 bg-red-50 text-red-500 text-xs rounded-md">잔액 부족</span>
                            )}
                          </div>
                          <p className="text-xs text-[#B2BEC3] mt-1">
                            필요 금액: <span className="font-['Outfit']">{Math.round(totalAmount / 1.1).toLocaleString()}</span>원 (VAT 별도)
                          </p>
                        </div>
                      </div>
                      <div className={`font-bold text-lg hidden sm:block ${
                        voucherBalance >= Math.round(totalAmount / 1.1) ? 'text-[#6C5CE7]' : 'text-[#B2BEC3]'
                      }`}>
                        선택 →
                      </div>
                    </div>
                  </button>
                )}

                {/* 무통장 입금 옵션 */}
                <button
                  onClick={handleBankTransfer}
                  className="w-full p-4 lg:p-6 border border-[#DFE6E9] rounded-2xl hover:border-[#6C5CE7] hover:bg-[#F0EDFF] transition-all duration-200 text-left group shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="bg-[#F0EDFF] p-2 lg:p-3 rounded-full group-hover:bg-[#F0EDFF] transition-colors">
                        <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-[#6C5CE7]" />
                      </div>
                      <div>
                        <h4 className="text-base lg:text-xl font-bold text-[#1A1A2E] group-hover:text-[#6C5CE7]">무통장 입금</h4>
                        <p className="text-xs lg:text-sm text-[#636E72]">계좌이체 후 입금 확인 (세금계산서 발행 가능)</p>
                      </div>
                    </div>
                    <div className="text-[#6C5CE7] font-bold text-lg hidden sm:block">선택 →</div>
                  </div>
                </button>

                {/* 환불 규정 */}
                <div className="mt-8 bg-[#F0EDFF] border border-[#DFE6E9] rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="h-5 w-5 text-[#6C5CE7]" />
                    <h4 className="font-bold text-[#1A1A2E]">환불 규정</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#F0EDFF] rounded-full flex items-center justify-center">
                        <span className="text-[#6C5CE7] font-bold text-sm font-['Outfit']">100%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A2E]">캠페인 진행 전</p>
                        <p className="text-sm text-[#636E72]">전액 환불 가능</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-[#F0EDFF] rounded-full flex items-center justify-center">
                        <span className="text-[#6C5CE7] font-bold text-sm font-['Outfit']">50%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A2E]">캠페인 진행 후</p>
                        <p className="text-sm text-[#636E72]">50% 환불 가능</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#DFE6E9]">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-[#6C5CE7] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#636E72]">
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
                  campaignId={campaignId}
                  region={region}
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

                <div className="bg-[#F0EDFF] border-2 border-[#6C5CE7] rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-[#F0EDFF] p-3 rounded-full">
                      <Wallet className="h-8 w-8 text-[#6C5CE7]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#1A1A2E]">수출바우처 결제</h3>
                      <p className="text-sm text-[#636E72]">VAT 별도 금액으로 결제됩니다</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-white rounded-2xl p-4 border border-[#DFE6E9]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#636E72]">현재 바우처 잔액</span>
                        <span className="text-xl font-bold text-[#6C5CE7] font-['Outfit']">
                          {voucherBalance.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-[#DFE6E9]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#636E72]">결제 금액 (VAT 별도)</span>
                        <span className="text-xl font-bold text-[#6C5CE7] font-['Outfit']">
                          -{Math.round(totalAmount / 1.1).toLocaleString()}원
                        </span>
                      </div>
                      <p className="text-xs text-[#B2BEC3] mt-1 text-right">
                        VAT 포함 시: {totalAmount.toLocaleString()}원
                      </p>
                    </div>

                    <div className="bg-[#F0EDFF] rounded-2xl p-4 border border-[#DFE6E9]">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#1A1A2E]">결제 후 잔액</span>
                        <span className="text-2xl font-bold text-[#6C5CE7] font-['Outfit']">
                          {(voucherBalance - Math.round(totalAmount / 1.1)).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleVoucherPayment}
                    disabled={processingVoucher}
                    className="w-full h-14 text-lg font-bold bg-[#6C5CE7] hover:bg-[#5A4BD1]"
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
