import React, { useEffect, useRef, useState } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

// 테스트 클라이언트 키 (실제 운영 시 환경변수로 관리)
const CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';
const CUSTOMER_KEY = 'customer_' + Date.now(); // 고객 고유 키

const TossPaymentWidget = ({ 
  amount, 
  orderId, 
  orderName, 
  customerEmail, 
  customerName,
  onSuccess,
  onFail 
}) => {
  const paymentMethodRef = useRef(null);
  const agreementRef = useRef(null);
  const [paymentWidget, setPaymentWidget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializePaymentWidget = async () => {
      try {
        setLoading(true);
        
        // 토스페이먼츠 SDK 로드
        const tossPayments = await loadTossPayments(CLIENT_KEY);
        
        // 결제위젯 인스턴스 생성
        const widget = tossPayments.widgets({ customerKey: CUSTOMER_KEY });
        
        setPaymentWidget(widget);
        setLoading(false);
      } catch (err) {
        console.error('결제위젯 초기화 실패:', err);
        setError('결제 시스템을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    };

    initializePaymentWidget();
  }, []);

  useEffect(() => {
    const renderPaymentWidget = async () => {
      if (!paymentWidget || !paymentMethodRef.current || !agreementRef.current) {
        return;
      }

      try {
        // 결제 금액 설정
        await paymentWidget.setAmount({
          currency: 'KRW',
          value: amount
        });

        // 결제 UI 렌더링
        await paymentWidget.renderPaymentMethods(
          '#payment-method',
          { value: amount },
          { variantKey: 'DEFAULT' }
        );

        // 이용약관 UI 렌더링
        await paymentWidget.renderAgreement('#agreement', {
          variantKey: 'AGREEMENT'
        });
      } catch (err) {
        console.error('결제 UI 렌더링 실패:', err);
        setError('결제 화면을 표시하는데 실패했습니다.');
      }
    };

    renderPaymentWidget();
  }, [paymentWidget, amount]);

  const handlePayment = async () => {
    if (!paymentWidget) {
      alert('결제 시스템이 준비되지 않았습니다.');
      return;
    }

    try {
      // 결제 요청
      await paymentWidget.requestPayment({
        orderId: orderId,
        orderName: orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: customerEmail,
        customerName: customerName
      });
    } catch (err) {
      console.error('결제 요청 실패:', err);
      if (onFail) {
        onFail(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결제 시스템을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold">⚠️ {error}</p>
        <p className="text-red-600 text-sm mt-2">페이지를 새로고침하거나 관리자에게 문의하세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <h3 className="text-xl font-bold mb-6 text-gray-800">💳 결제 정보</h3>
      
      {/* 결제 금액 표시 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">결제 금액</span>
          <span className="text-2xl font-bold text-blue-600">
            ₩{amount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 결제 수단 선택 영역 */}
      <div id="payment-method" ref={paymentMethodRef} className="mb-6"></div>

      {/* 이용약관 영역 */}
      <div id="agreement" ref={agreementRef} className="mb-6"></div>

      {/* 결제하기 버튼 */}
      <button
        onClick={handlePayment}
        className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        ₩{amount.toLocaleString()} 결제하기
      </button>

      {/* 안내 문구 */}
      <p className="text-xs text-gray-500 text-center mt-4">
        🔒 안전한 결제를 위해 토스페이먼츠를 사용합니다.
      </p>
    </div>
  );
};

export default TossPaymentWidget;
