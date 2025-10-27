/**
 * 세금 문서 발행 모달
 * 
 * 세금계산서, 현금영수증, 전자명세서 발행 선택 및 정보 입력
 */

import React, { useState } from 'react';
import { X, FileText, Receipt, File } from 'lucide-react';

const TaxDocumentIssueModal = ({ isOpen, onClose, onIssue, chargeAmount, companyInfo }) => {
  const [documentType, setDocumentType] = useState('taxinvoice'); // taxinvoice, cashbill, statement
  const [formData, setFormData] = useState({
    // 공통 정보
    email: companyInfo?.email || '',
    contactName: companyInfo?.representative || '',
    tel: companyInfo?.phone || '',
    hp: companyInfo?.mobile || '',
    
    // 세금계산서 전용
    purposeType: '영수', // 영수, 청구
    taxType: '과세', // 과세, 영세, 면세
    
    // 현금영수증 전용
    tradeUsage: '소득공제', // 소득공제, 지출증빙
    identityNum: '', // 휴대폰번호, 카드번호, 주민등록번호 등
    
    // 전자명세서 전용
    statementType: '121', // 121: 거래명세서, 122: 청구서, 123: 견적서
    
    // 품목 정보
    itemName: '포인트 충전',
    remark: '',
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onIssue({
        documentType,
        formData,
        chargeAmount,
      });
      onClose();
    } catch (error) {
      console.error('세금 문서 발행 실패:', error);
      alert('세금 문서 발행에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 공급가액 및 세액 계산
  const supplyCost = documentType === 'taxinvoice' && formData.taxType === '과세'
    ? Math.floor(chargeAmount / 1.1)
    : chargeAmount;
  const tax = documentType === 'taxinvoice' && formData.taxType === '과세'
    ? chargeAmount - supplyCost
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">세금 문서 발행</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 문서 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              발행할 문서 선택
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setDocumentType('taxinvoice')}
                className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  documentType === 'taxinvoice'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText size={32} className={documentType === 'taxinvoice' ? 'text-blue-500' : 'text-gray-400'} />
                <span className="font-medium">세금계산서</span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentType('cashbill')}
                className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  documentType === 'cashbill'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Receipt size={32} className={documentType === 'cashbill' ? 'text-green-500' : 'text-gray-400'} />
                <span className="font-medium">현금영수증</span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentType('statement')}
                className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  documentType === 'statement'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <File size={32} className={documentType === 'statement' ? 'text-purple-500' : 'text-gray-400'} />
                <span className="font-medium">전자명세서</span>
              </button>
            </div>
          </div>

          {/* 세금계산서 옵션 */}
          {documentType === 'taxinvoice' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  영수/청구
                </label>
                <select
                  name="purposeType"
                  value={formData.purposeType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="영수">영수</option>
                  <option value="청구">청구</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  과세 유형
                </label>
                <select
                  name="taxType"
                  value={formData.taxType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="과세">과세</option>
                  <option value="영세">영세</option>
                  <option value="면세">면세</option>
                </select>
              </div>
            </div>
          )}

          {/* 현금영수증 옵션 */}
          {documentType === 'cashbill' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거래 구분
                </label>
                <select
                  name="tradeUsage"
                  value={formData.tradeUsage}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="소득공제">소득공제</option>
                  <option value="지출증빙">지출증빙</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  식별번호 *
                </label>
                <input
                  type="text"
                  name="identityNum"
                  value={formData.identityNum}
                  onChange={handleChange}
                  placeholder="휴대폰번호, 카드번호, 주민등록번호 등"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  소득공제: 휴대폰번호 또는 카드번호 / 지출증빙: 사업자번호
                </p>
              </div>
            </>
          )}

          {/* 전자명세서 옵션 */}
          {documentType === 'statement' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                명세서 종류
              </label>
              <select
                name="statementType"
                value={formData.statementType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="121">거래명세서</option>
                <option value="122">청구서</option>
                <option value="123">견적서</option>
                <option value="124">발주서</option>
                <option value="125">입금표</option>
                <option value="126">영수증</option>
              </select>
            </div>
          )}

          {/* 공통 입력 필드 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                담당자명
              </label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일 *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호
              </label>
              <input
                type="tel"
                name="tel"
                value={formData.tel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                휴대폰번호
              </label>
              <input
                type="tel"
                name="hp"
                value={formData.hp}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              품목명
            </label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비고
            </label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* 금액 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">공급가액</span>
              <span className="font-medium">{supplyCost.toLocaleString()}원</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">부가세</span>
                <span className="font-medium">{tax.toLocaleString()}원</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>합계</span>
              <span className="text-blue-600">{chargeAmount.toLocaleString()}원</span>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '발행 중...' : '발행하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaxDocumentIssueModal;

