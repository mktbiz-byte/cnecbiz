import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseBiz } from '../../lib/supabaseClients';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        setError('결제 정보가 올바르지 않습니다.');
        setProcessing(false);
        return;
      }

      try {
        // 서버에서 결제 승인 처리 (Netlify Function 호출)
        const response = await fetch('/.netlify/functions/confirm-toss-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount)
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || '결제 승인에 실패했습니다.');
        }

        // 결제 성공 - 캠페인 상태 업데이트 등 추가 처리
        setProcessing(false);

        // 3초 후 캠페인 목록으로 이동
        setTimeout(() => {
          navigate('/company/campaigns');
        }, 3000);

      } catch (err) {
        console.error('결제 승인 오류:', err);
        setError(err.message);
        setProcessing(false);
      }
    };

    confirmPayment();
  }, [searchParams, navigate]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">결제 처리 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">결제 실패</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/company/campaigns')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            캠페인 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-600 mb-4">결제 완료!</h2>
        <p className="text-gray-700 mb-2">캠페인 결제가 성공적으로 완료되었습니다.</p>
        <p className="text-sm text-gray-500 mb-6">잠시 후 캠페인 목록으로 이동합니다...</p>
        <button
          onClick={() => navigate('/company/campaigns')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
        >
          지금 이동하기
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
