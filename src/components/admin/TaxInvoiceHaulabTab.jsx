import { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckCircle, AlertCircle, DollarSign, X, Plus, Building2, RefreshCw, Download } from 'lucide-react';
import { supabaseBiz } from '../../lib/supabaseClients';

const TaxInvoiceHaulabTab = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 기업 불러오기 상태
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [companySearchResults, setCompanySearchResults] = useState([]);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const companySearchRef = useRef(null);

  // 수동 발행 모달 상태
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isManualIssuing, setIsManualIssuing] = useState(false);
  const [manualForm, setManualForm] = useState({
    companyName: '',
    businessNumber: '',
    ceoName: '',
    address: '',
    businessType: '',
    businessCategory: '',
    email: '',
    phone: '',
    contactName: '',
    amount: '',
    itemName: '크리에이터 마케팅 서비스',
    memo: '',
    writeDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // manual_tax_invoices 테이블에서 하우랩 발행 내역 조회
      // mgt_key가 'L'로 시작하는 것 = 하우랩 발행분
      const { data, error } = await supabaseBiz
        .from('manual_tax_invoices')
        .select('*')
        .like('mgt_key', 'L%')
        .order('issued_at', { ascending: false });

      if (error) {
        console.error('하우랩 세금계산서 조회 오류:', error);
        // issuer 컬럼으로도 시도
        const { data: data2, error: error2 } = await supabaseBiz
          .from('manual_tax_invoices')
          .select('*')
          .eq('issuer', 'haulab')
          .order('issued_at', { ascending: false });

        if (!error2 && data2) {
          setInvoices(data2);
        } else {
          setInvoices([]);
        }
      } else {
        setInvoices(data || []);
      }
    } catch (error) {
      console.error('하우랩 세금계산서 조회 오류:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // 사업자번호 포맷팅 (자동 하이픈 추가)
  const formatBusinessNumber = (value) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  // 금액 포맷팅 (콤마 추가)
  const formatAmount = (value) => {
    const numbers = value.replace(/[^0-9]/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 수동 발행 모달 열기
  const openManualModal = () => {
    setManualForm({
      companyName: '',
      businessNumber: '',
      ceoName: '',
      address: '',
      businessType: '',
      businessCategory: '',
      email: '',
      phone: '',
      contactName: '',
      amount: '',
      itemName: '크리에이터 마케팅 서비스',
      memo: '',
      writeDate: new Date().toISOString().split('T')[0]
    });
    setIsManualModalOpen(true);
  };

  // 수동 발행 모달 닫기
  const closeManualModal = () => {
    setIsManualModalOpen(false);
    setCompanySearchOpen(false);
    setCompanySearchTerm('');
    setCompanySearchResults([]);
  };

  // 기업 검색
  const handleCompanySearch = async (term) => {
    setCompanySearchTerm(term);
    if (term.trim().length < 1) {
      setCompanySearchResults([]);
      return;
    }
    setCompanySearchLoading(true);
    try {
      const { data, error } = await supabaseBiz
        .from('companies')
        .select('id, company_name, ceo_name, business_registration_number, company_address, business_type, business_category, email, phone, contact_person')
        .or(`company_name.ilike.%${term}%,business_registration_number.ilike.%${term}%`)
        .limit(10);
      if (!error && data) {
        setCompanySearchResults(data);
      }
    } catch (err) {
      console.error('기업 검색 오류:', err);
    } finally {
      setCompanySearchLoading(false);
    }
  };

  // 기업 선택 시 폼 자동 채우기
  const handleSelectCompany = (company) => {
    setManualForm(prev => ({
      ...prev,
      companyName: company.company_name || '',
      businessNumber: formatBusinessNumber(company.business_registration_number || ''),
      ceoName: company.ceo_name || '',
      address: company.company_address || '',
      businessType: company.business_type || '',
      businessCategory: company.business_category || '',
      email: company.email || '',
      phone: company.phone || '',
      contactName: company.contact_person || ''
    }));
    setCompanySearchOpen(false);
    setCompanySearchTerm('');
    setCompanySearchResults([]);
  };

  // 수동 발행 처리
  const handleManualIssue = async () => {
    // 필수 필드 검증
    if (!manualForm.companyName.trim()) {
      alert('회사명을 입력해주세요.');
      return;
    }
    if (!manualForm.businessNumber.trim()) {
      alert('사업자등록번호를 입력해주세요.');
      return;
    }
    if (!manualForm.ceoName.trim()) {
      alert('대표자명을 입력해주세요.');
      return;
    }
    const amount = parseInt(manualForm.amount.replace(/,/g, ''));
    if (!amount || isNaN(amount)) {
      alert('금액을 입력해주세요.');
      return;
    }
    if (amount < 0) {
      alert('하우랩은 마이너스(음수) 세금계산서 발행이 불가능합니다.\n마이너스 발행은 하우파파 탭에서만 가능합니다.');
      return;
    }

    const confirmMessage = `[하우랩] 세금계산서를 발행하시겠습니까?\n\n` +
      `공급자: 하우랩주식회사 (376-81-00944)\n` +
      `공급받는자: ${manualForm.companyName}\n` +
      `사업자번호: ${manualForm.businessNumber}\n` +
      `금액: ${amount.toLocaleString()}원 (VAT 포함)\n` +
      `품목: ${manualForm.itemName || '크리에이터 마케팅 서비스'}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsManualIssuing(true);
    try {
      const response = await fetch('/.netlify/functions/issue-tax-invoice-haulab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceData: {
            companyName: manualForm.companyName.trim(),
            businessNumber: manualForm.businessNumber.replace(/-/g, ''),
            ceoName: manualForm.ceoName.trim(),
            address: manualForm.address.trim(),
            businessType: manualForm.businessType.trim(),
            businessCategory: manualForm.businessCategory.trim(),
            email: manualForm.email.trim(),
            phone: manualForm.phone.trim(),
            contactName: manualForm.contactName.trim()
          },
          amount: amount,
          itemName: manualForm.itemName.trim() || '크리에이터 마케팅 서비스',
          memo: manualForm.memo.trim(),
          writeDate: manualForm.writeDate
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '세금계산서 발행 실패');
      }

      alert(`하우랩 세금계산서가 발행되었습니다!\n\n국세청 승인번호: ${result.ntsConfirmNum}`);
      closeManualModal();
      fetchInvoices();
    } catch (error) {
      console.error('하우랩 세금계산서 발행 오류:', error);
      alert(`세금계산서 발행에 실패했습니다: ${error.message}`);
    } finally {
      setIsManualIssuing(false);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    (inv.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.business_number || '').includes(searchTerm) ||
    (inv.nts_confirm_num || '').includes(searchTerm)
  );

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* 헤더 - 하우랩 표시 및 발행 버튼 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            공급자: 하우랩주식회사 (376-81-00944)
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchInvoices}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <button
            onClick={openManualModal}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            세금계산서 발행
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 발행 건수</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}건</p>
            </div>
            <FileText className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 발행 금액</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalAmount.toLocaleString()}원</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="회사명, 사업자번호, 승인번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 발행 내역 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  발행일시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공급받는자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사업자번호
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공급가액
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  세액
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  합계
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  품목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  국세청 승인번호
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-green-500" />
                    로딩 중...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p>하우랩으로 발행된 세금계산서가 없습니다.</p>
                    <p className="text-sm mt-1">위의 "세금계산서 발행" 버튼을 클릭하여 발행하세요.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.issued_at ? new Date(invoice.issued_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.company_name}</div>
                      {invoice.email && (
                        <div className="text-sm text-gray-500">{invoice.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {invoice.business_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {(invoice.supply_cost || 0).toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {(invoice.tax || 0).toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-700">
                      {(invoice.total_amount || 0).toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {invoice.item_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.nts_confirm_num ? (
                        <span className="text-sm text-blue-600 font-mono">{invoice.nts_confirm_num}</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          발행완료
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수동 발행 모달 */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-50">
              <div>
                <h2 className="text-xl font-bold text-green-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6" />
                  하우랩 세금계산서 발행
                </h2>
                <p className="text-sm text-green-700 mt-1">공급자: 하우랩주식회사 (376-81-00944)</p>
              </div>
              <button
                onClick={closeManualModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 space-y-6">
              {/* 공급받는자 정보 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    공급받는자 정보
                  </h3>
                  <div className="relative" ref={companySearchRef}>
                    <button
                      type="button"
                      onClick={() => setCompanySearchOpen(!companySearchOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-colors font-medium"
                    >
                      <Download className="w-4 h-4" />
                      기업 불러오기
                    </button>
                    {companySearchOpen && (
                      <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        <div className="p-2">
                          <input
                            type="text"
                            value={companySearchTerm}
                            onChange={(e) => handleCompanySearch(e.target.value)}
                            placeholder="회사명 또는 사업자번호 검색..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {companySearchLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">검색 중...</div>
                          ) : companySearchResults.length > 0 ? (
                            companySearchResults.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectCompany(c)}
                                className="w-full text-left px-3 py-2 hover:bg-green-50 border-t border-gray-100 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900">{c.company_name}</div>
                                <div className="text-xs text-gray-500">{c.business_registration_number || '-'} | {c.ceo_name || '-'}</div>
                              </button>
                            ))
                          ) : companySearchTerm.length > 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">검색 결과 없음</div>
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-400 text-center">회사명 또는 사업자번호를 입력하세요</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      회사명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualForm.companyName}
                      onChange={(e) => setManualForm(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="(주)OO회사"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사업자등록번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualForm.businessNumber}
                      onChange={(e) => setManualForm(prev => ({ ...prev, businessNumber: formatBusinessNumber(e.target.value) }))}
                      placeholder="000-00-00000"
                      maxLength={12}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대표자명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualForm.ceoName}
                      onChange={(e) => setManualForm(prev => ({ ...prev, ceoName: e.target.value }))}
                      placeholder="대표자명"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      담당자명
                    </label>
                    <input
                      type="text"
                      value={manualForm.contactName}
                      onChange={(e) => setManualForm(prev => ({ ...prev, contactName: e.target.value }))}
                      placeholder="담당자명"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      주소
                    </label>
                    <input
                      type="text"
                      value={manualForm.address}
                      onChange={(e) => setManualForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="서울시 강남구..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업태
                    </label>
                    <input
                      type="text"
                      value={manualForm.businessType}
                      onChange={(e) => setManualForm(prev => ({ ...prev, businessType: e.target.value }))}
                      placeholder="도소매업"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업종
                    </label>
                    <input
                      type="text"
                      value={manualForm.businessCategory}
                      onChange={(e) => setManualForm(prev => ({ ...prev, businessCategory: e.target.value }))}
                      placeholder="전자상거래"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이메일
                    </label>
                    <input
                      type="email"
                      value={manualForm.email}
                      onChange={(e) => setManualForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="example@company.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연락처
                    </label>
                    <input
                      type="tel"
                      value={manualForm.phone}
                      onChange={(e) => setManualForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="02-0000-0000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 금액 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  금액 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      금액 (VAT 포함) <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-gray-400 font-normal">마이너스 발행 불가</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={manualForm.amount}
                        onChange={(e) => setManualForm(prev => ({ ...prev, amount: formatAmount(e.target.value) }))}
                        placeholder="110,000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                    </div>
                    {manualForm.amount && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span>공급가액: {Math.round(parseInt(manualForm.amount.replace(/,/g, '') || 0) / 1.1).toLocaleString()}원</span>
                        <span className="mx-2">|</span>
                        <span>세액: {(parseInt(manualForm.amount.replace(/,/g, '') || 0) - Math.round(parseInt(manualForm.amount.replace(/,/g, '') || 0) / 1.1)).toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      작성일자
                    </label>
                    <input
                      type="date"
                      value={manualForm.writeDate}
                      onChange={(e) => setManualForm(prev => ({ ...prev, writeDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      품목명
                    </label>
                    <input
                      type="text"
                      value={manualForm.itemName}
                      onChange={(e) => setManualForm(prev => ({ ...prev, itemName: e.target.value }))}
                      placeholder="크리에이터 마케팅 서비스"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      비고 (메모)
                    </label>
                    <input
                      type="text"
                      value={manualForm.memo}
                      onChange={(e) => setManualForm(prev => ({ ...prev, memo: e.target.value }))}
                      placeholder="비고 내용"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 발행 미리보기 */}
              {manualForm.companyName && manualForm.amount && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3">발행 미리보기</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">공급자:</div>
                    <div className="font-medium">하우랩주식회사 (376-81-00944)</div>
                    <div className="text-gray-600">공급받는자:</div>
                    <div className="font-medium">{manualForm.companyName}</div>
                    <div className="text-gray-600">사업자번호:</div>
                    <div className="font-medium">{manualForm.businessNumber || '-'}</div>
                    <div className="text-gray-600">공급가액:</div>
                    <div className="font-medium">{Math.round(parseInt(manualForm.amount.replace(/,/g, '') || 0) / 1.1).toLocaleString()}원</div>
                    <div className="text-gray-600">세액:</div>
                    <div className="font-medium">{(parseInt(manualForm.amount.replace(/,/g, '') || 0) - Math.round(parseInt(manualForm.amount.replace(/,/g, '') || 0) / 1.1)).toLocaleString()}원</div>
                    <div className="text-gray-600">합계:</div>
                    <div className="font-bold text-green-700">{parseInt(manualForm.amount.replace(/,/g, '') || 0).toLocaleString()}원</div>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeManualModal}
                disabled={isManualIssuing}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleManualIssue}
                disabled={isManualIssuing || !manualForm.companyName || !manualForm.businessNumber || !manualForm.ceoName || !manualForm.amount}
                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isManualIssuing ? (
                  <>발행 중...</>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    팝빌로 발행 (하우랩)
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

export default TaxInvoiceHaulabTab;
