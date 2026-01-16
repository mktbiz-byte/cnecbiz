import { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle, XCircle, AlertCircle, DollarSign, X, MinusCircle } from 'lucide-react';

const TaxInvoiceRequestsTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, issued, prepaid
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  // 마이너스 발행 모달 상태
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelRequest, setCancelRequest] = useState(null);
  const [cancelForm, setCancelForm] = useState({
    modifyCode: '04',
    cancelReason: ''
  });
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 백엔드 API 호출 (Service Role Key 사용)
      const url = `/.netlify/functions/get-tax-invoice-requests?filter=${filter}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '조회 실패');
      }

      setRequests(data.requests || []);
    } catch (error) {
      console.error('세금계산서 신청 내역 조회 오류:', error);
      alert('세금계산서 신청 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleIssueInvoice = async (isReissue = false) => {
    if (!selectedRequest) return;

    const confirmMessage = isReissue
      ? `${selectedRequest.companies.company_name}의 세금계산서를 재발행하시겠습니까?\n\n⚠️ 기존 발행 기록은 유지되며, 새로운 세금계산서가 발행됩니다.`
      : `${selectedRequest.companies.company_name}의 세금계산서를 팝빌로 발행하시겠습니까?${!selectedRequest.is_deposit_confirmed ? '\n\n⚠️ 입금이 확인되지 않았습니다. 선발행 시 미수금으로 처리됩니다.' : ''}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsIssuing(true);
    try {
      // 재발행인 경우 먼저 발행 상태 초기화
      if (isReissue) {
        const resetResponse = await fetch('/.netlify/functions/reset-tax-invoice-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: selectedRequest.id })
        });
        const resetResult = await resetResponse.json();
        if (!resetResult.success) {
          throw new Error(resetResult.error || '상태 초기화 실패');
        }
      }

      // 팝빌 세금계산서 발행 API 호출
      const response = await fetch('/.netlify/functions/issue-tax-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxInvoiceRequestId: selectedRequest.id,
          forceIssue: !selectedRequest.is_deposit_confirmed
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '발행 실패');
      }

      alert(isReissue ? '세금계산서가 재발행되었습니다.' : '세금계산서가 팝빌로 발행되었습니다.');
      closeModal();
      fetchRequests();
    } catch (error) {
      console.error('세금계산서 발행 오류:', error);
      alert(`세금계산서 발행에 실패했습니다: ${error.message}`);
    } finally {
      setIsIssuing(false);
    }
  };

  // 마이너스 발행 모달 열기
  const openCancelModal = (request) => {
    setCancelRequest(request);
    setCancelForm({
      modifyCode: '04',
      cancelReason: ''
    });
    setIsCancelModalOpen(true);
  };

  // 마이너스 발행 모달 닫기
  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setCancelRequest(null);
    setCancelForm({ modifyCode: '04', cancelReason: '' });
  };

  // 마이너스 발행 (수정세금계산서) 처리
  const handleCancelInvoice = async () => {
    if (!cancelRequest) return;

    const modifyCodeNames = {
      '01': '기재사항 착오정정',
      '02': '공급가액 변동',
      '03': '환입 (반품)',
      '04': '계약의 해지',
      '05': '내국신용장 사후개설',
      '06': '착오에 의한 이중발행'
    };

    const confirmMessage = `${cancelRequest.companies.company_name}의 세금계산서를 마이너스 발행(취소)하시겠습니까?\n\n` +
      `금액: -${cancelRequest.amount.toLocaleString()}원\n` +
      `수정사유: ${modifyCodeNames[cancelForm.modifyCode]}\n\n` +
      `⚠️ 이 작업은 되돌릴 수 없습니다.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch('/.netlify/functions/issue-tax-invoice-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxInvoiceRequestId: cancelRequest.id,
          modifyCode: cancelForm.modifyCode,
          cancelReason: cancelForm.cancelReason || modifyCodeNames[cancelForm.modifyCode]
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '마이너스 발행 실패');
      }

      alert(`수정세금계산서(마이너스)가 발행되었습니다.\n\n국세청 승인번호: ${result.ntsConfirmNum}`);
      closeCancelModal();
      closeModal();
      fetchRequests();
    } catch (error) {
      console.error('마이너스 발행 오류:', error);
      alert(`마이너스 발행에 실패했습니다: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredRequests = requests.filter(req =>
    req.companies.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.companies.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    issued: requests.filter(r => r.status === 'issued').length,
    prepaid: requests.filter(r => r.is_prepaid && r.status === 'issued').length
  };

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 신청</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}건</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">발행 대기</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}건</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">발행 완료</p>
              <p className="text-2xl font-bold text-green-600">{stats.issued}건</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">선발행 (미수금)</p>
              <p className="text-2xl font-bold text-red-600">{stats.prepaid}건</p>
            </div>
            <DollarSign className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              발행 대기
            </button>
            <button
              onClick={() => setFilter('issued')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'issued'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              발행 완료
            </button>
            <button
              onClick={() => setFilter('prepaid')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'prepaid'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              선발행
            </button>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="회사명, 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 신청 내역 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청일시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  회사명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  입금 확인
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  발행일시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.companies.company_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.companies.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.amount.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.is_deposit_confirmed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          확인됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          미확인
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.tax_invoice_info?.cancelled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">
                          <MinusCircle className="w-3 h-3 mr-1" />
                          마이너스 발행됨
                        </span>
                      ) : request.status === 'issued' ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.is_prepaid
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {request.is_prepaid ? '선발행 (미수금)' : '발행 완료'}
                        </span>
                      ) : request.status === 'cancelled' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          취소됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          발행 대기
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.issued_at ? (
                        <div>
                          <div>{new Date(request.issued_at).toLocaleString('ko-KR')}</div>
                          {request.nts_confirm_num && (
                            <div className="text-xs text-blue-600">{request.nts_confirm_num}</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => openModal(request)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 세금계산서 상세 모달 */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">세금계산서 상세 정보</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">신청일시</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedRequest.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">금액</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRequest.amount.toLocaleString()}원
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">입금 확인</p>
                    <p className="text-sm font-medium">
                      {selectedRequest.is_deposit_confirmed ? (
                        <span className="text-green-600">✓ 확인됨</span>
                      ) : (
                        <span className="text-gray-600">✗ 미확인</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">상태</p>
                    <p className="text-sm font-medium">
                      {selectedRequest.status === 'issued' ? (
                        <span className="text-green-600">발행 완료</span>
                      ) : (
                        <span className="text-orange-600">발행 대기</span>
                      )}
                    </p>
                  </div>
                  {selectedRequest.status === 'issued' && selectedRequest.nts_confirm_num && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">국세청 승인번호</p>
                      <p className="text-sm font-medium text-blue-600">
                        {selectedRequest.nts_confirm_num}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 세금계산서 정보 */}
              {selectedRequest.tax_invoice_info && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">세금계산서 정보</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">회사명</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedRequest.tax_invoice_info.company_name || selectedRequest.companies.company_name || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">사업자등록번호</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedRequest.tax_invoice_info.business_number || selectedRequest.companies.business_registration_number || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">대표자명</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedRequest.tax_invoice_info.representative || selectedRequest.companies.ceo_name || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">연락처</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedRequest.tax_invoice_info.contact || selectedRequest.companies.phone || '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">이메일</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedRequest.tax_invoice_info.email || selectedRequest.companies.email || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">업태</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedRequest.tax_invoice_info.business_type || selectedRequest.companies.business_type || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">업종</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedRequest.tax_invoice_info.business_category || selectedRequest.companies.business_category || '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">주소</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedRequest.tax_invoice_info.address || selectedRequest.companies.company_address || '-'}
                        </p>
                      </div>
                      {selectedRequest.tax_invoice_info.memo && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">메모</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedRequest.tax_invoice_info.memo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 경고 메시지 */}
              {!selectedRequest.is_deposit_confirmed && selectedRequest.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">입금 미확인</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        입금이 확인되지 않았습니다. 발행 시 선발행(미수금)으로 처리됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
              {selectedRequest.status === 'pending' && (
                <button
                  onClick={() => handleIssueInvoice(false)}
                  disabled={isIssuing}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isIssuing ? '발행 중...' : '발행하기 (팝빌)'}
                </button>
              )}
              {selectedRequest.status === 'issued' && (
                <>
                  <button
                    onClick={() => handleIssueInvoice(true)}
                    disabled={isIssuing}
                    className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isIssuing ? '재발행 중...' : '재발행하기'}
                  </button>
                  {!selectedRequest.tax_invoice_info?.cancelled && (
                    <button
                      onClick={() => openCancelModal(selectedRequest)}
                      disabled={isIssuing}
                      className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <MinusCircle className="w-4 h-4" />
                      마이너스 발행
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 마이너스 발행 모달 */}
      {isCancelModalOpen && cancelRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
              <h2 className="text-xl font-bold text-red-900 flex items-center gap-2">
                <MinusCircle className="w-6 h-6" />
                수정세금계산서 (마이너스 발행)
              </h2>
              <button
                onClick={closeCancelModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 space-y-6">
              {/* 원본 세금계산서 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">원본 세금계산서 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">회사명:</span>
                    <span className="ml-2 font-medium">{cancelRequest.companies.company_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">금액:</span>
                    <span className="ml-2 font-medium">{cancelRequest.amount.toLocaleString()}원</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">국세청 승인번호:</span>
                    <span className="ml-2 font-medium text-blue-600">{cancelRequest.tax_invoice_info?.nts_confirm_num || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 취소 금액 표시 */}
              <div className="bg-red-100 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600 mb-1">취소 금액</p>
                <p className="text-3xl font-bold text-red-700">-{cancelRequest.amount.toLocaleString()}원</p>
              </div>

              {/* 수정사유 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수정사유 선택 *
                </label>
                <select
                  value={cancelForm.modifyCode}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, modifyCode: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="01">01 - 기재사항 착오정정</option>
                  <option value="02">02 - 공급가액 변동</option>
                  <option value="03">03 - 환입 (반품)</option>
                  <option value="04">04 - 계약의 해지</option>
                  <option value="05">05 - 내국신용장 사후개설</option>
                  <option value="06">06 - 착오에 의한 이중발행</option>
                </select>
              </div>

              {/* 취소 사유 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  취소 사유 (선택)
                </label>
                <textarea
                  value={cancelForm.cancelReason}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, cancelReason: e.target.value }))}
                  placeholder="취소 사유를 입력하세요..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none h-24"
                />
              </div>

              {/* 경고 메시지 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">주의사항</h4>
                    <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1">
                      <li>수정세금계산서는 국세청에 즉시 전송됩니다</li>
                      <li>발행 후 취소할 수 없습니다</li>
                      <li>공급받는자에게 이메일로 발송됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeCancelModal}
                disabled={isCancelling}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={isCancelling || !cancelRequest.tax_invoice_info?.nts_confirm_num}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCancelling ? (
                  <>처리 중...</>
                ) : (
                  <>
                    <MinusCircle className="w-4 h-4" />
                    마이너스 발행
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxInvoiceRequestsTab;
