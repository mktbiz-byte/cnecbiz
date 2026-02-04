import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentFail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get('code');
  const message = searchParams.get('message');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-md w-full mx-4 sm:mx-auto text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-red-600 mb-4">결제 실패</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-gray-800 font-semibold mb-2">오류 코드: {code}</p>
          <p className="text-gray-700">{message || '결제 처리 중 오류가 발생했습니다.'}</p>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          문제가 계속되면 고객센터로 문의해주세요.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            다시 시도
          </button>
          <button
            onClick={() => navigate('/company/campaigns')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            캠페인 목록
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFail;
