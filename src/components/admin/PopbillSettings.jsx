/**
 * 슈퍼 관리자 - 팝빌 설정 페이지
 * 
 * 팝빌 API 설정, 계좌 관리, 카카오톡 템플릿 관리
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, CreditCard, MessageSquare, Play, Save, Plus, Trash2 } from 'lucide-react';
import { supabaseBiz } from '../../lib/supabaseClients';
import { checkAndProcessDeposits, BANK_CODES } from '../../lib/bankAccountChecker';

export default function PopbillSettings() {
  const [settings, setSettings] = useState({
    linkId: import.meta.env.VITE_POPBILL_LINK_ID || '',
    secretKey: import.meta.env.VITE_POPBILL_SECRET_KEY || '',
    testMode: import.meta.env.VITE_POPBILL_TEST_MODE === 'true',
  });

  const [bankAccounts, setBankAccounts] = useState([]);
  const [kakaoTemplates, setKakaoTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newBankAccount, setNewBankAccount] = useState({
    bank_code: '',
    account_number: '',
    account_holder: '',
    description: '',
  });

  const [newTemplate, setNewTemplate] = useState({
    template_code: '',
    template_name: '',
    template_content: '',
    template_type: 'deposit_notice', // deposit_notice, charge_complete, etc.
    status: 'draft', // draft, pending, approved, rejected
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // 계좌 정보 로드
      const { data: accounts } = await supabaseBiz
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (accounts) setBankAccounts(accounts);

      // 카카오톡 템플릿 로드
      const { data: templates } = await supabaseBiz
        .from('kakao_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (templates) setKakaoTemplates(templates);

    } catch (error) {
      console.error('설정 로드 실패:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // 환경 변수는 런타임에 변경할 수 없으므로
      // Netlify 환경 변수를 직접 업데이트해야 함
      alert('환경 변수는 Netlify 대시보드에서 직접 설정해주세요.\n\nVITE_POPBILL_LINK_ID\nVITE_POPBILL_SECRET_KEY\nVITE_POPBILL_TEST_MODE');
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!newBankAccount.bank_code || !newBankAccount.account_number) {
      alert('은행과 계좌번호를 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabaseBiz
        .from('bank_accounts')
        .insert({
          ...newBankAccount,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setBankAccounts([data, ...bankAccounts]);
      setNewBankAccount({
        bank_code: '',
        account_number: '',
        account_holder: '',
        description: '',
      });

      alert('계좌가 등록되었습니다');
    } catch (error) {
      console.error('계좌 등록 실패:', error);
      alert('계좌 등록에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBankAccount = async (id) => {
    if (!confirm('이 계좌를 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const { error } = await supabaseBiz
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBankAccounts(bankAccounts.filter(acc => acc.id !== id));
      alert('계좌가 삭제되었습니다');
    } catch (error) {
      console.error('계좌 삭제 실패:', error);
      alert('계좌 삭제에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckDeposits = async (account) => {
    setLoading(true);
    try {
      const corpNum = '1234567890'; // TODO: 실제 사업자번호로 변경
      const result = await checkAndProcessDeposits(
        corpNum,
        account.bank_code,
        account.account_number
      );

      alert(`입금 확인 완료!\n\n총 입금 건수: ${result.totalDeposits}\n처리된 충전 요청: ${result.processedRequests}`);
      
    } catch (error) {
      console.error('입금 확인 실패:', error);
      alert('입금 확인에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.template_code || !newTemplate.template_name) {
      alert('템플릿 코드와 이름을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabaseBiz
        .from('kakao_templates')
        .insert(newTemplate)
        .select()
        .single();

      if (error) throw error;

      setKakaoTemplates([data, ...kakaoTemplates]);
      setNewTemplate({
        template_code: '',
        template_name: '',
        template_content: '',
        template_type: 'deposit_notice',
        status: 'draft',
      });

      alert('템플릿이 등록되었습니다');
    } catch (error) {
      console.error('템플릿 등록 실패:', error);
      alert('템플릿 등록에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTemplateApproval = async (template) => {
    if (!confirm('카카오톡 템플릿 심사를 요청하시겠습니까?')) return;

    setLoading(true);
    try {
      // TODO: 팝빌 카카오톡 템플릿 심사 요청 API 호출
      
      const { error } = await supabaseBiz
        .from('kakao_templates')
        .update({ status: 'pending' })
        .eq('id', template.id);

      if (error) throw error;

      loadSettings();
      alert('템플릿 심사가 요청되었습니다');
    } catch (error) {
      console.error('템플릿 심사 요청 실패:', error);
      alert('템플릿 심사 요청에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">팝빌 API 설정</h1>
          <p className="text-gray-600 mt-2">세금계산서, 현금영수증, 계좌조회, 카카오톡 설정</p>
        </div>

        {/* API 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              API 인증 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Link ID</Label>
              <Input
                value={settings.linkId}
                onChange={(e) => setSettings({ ...settings, linkId: e.target.value })}
                placeholder="팝빌 Link ID"
              />
            </div>

            <div>
              <Label>Secret Key</Label>
              <Input
                type="password"
                value={settings.secretKey}
                onChange={(e) => setSettings({ ...settings, secretKey: e.target.value })}
                placeholder="팝빌 Secret Key"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.testMode}
                onChange={(e) => setSettings({ ...settings, testMode: e.target.checked })}
                className="w-4 h-4"
              />
              <Label>테스트 모드</Label>
            </div>

            <Button onClick={handleSaveSettings} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              설정 저장
            </Button>

            <p className="text-sm text-gray-500">
              * 환경 변수는 Netlify 대시보드에서 직접 설정해야 합니다
            </p>
          </CardContent>
        </Card>

        {/* 계좌 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              계좌 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 계좌 추가 폼 */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>은행</Label>
                <select
                  value={newBankAccount.bank_code}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, bank_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">은행 선택</option>
                  {Object.entries(BANK_CODES).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>계좌번호</Label>
                <Input
                  value={newBankAccount.account_number}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, account_number: e.target.value })}
                  placeholder="계좌번호 (하이픈 없이)"
                />
              </div>

              <div>
                <Label>예금주</Label>
                <Input
                  value={newBankAccount.account_holder}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, account_holder: e.target.value })}
                  placeholder="예금주명"
                />
              </div>

              <div>
                <Label>설명</Label>
                <Input
                  value={newBankAccount.description}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, description: e.target.value })}
                  placeholder="계좌 설명 (선택)"
                />
              </div>

              <div className="col-span-2">
                <Button onClick={handleAddBankAccount} disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  계좌 추가
                </Button>
              </div>
            </div>

            {/* 등록된 계좌 목록 */}
            <div className="space-y-2">
              {bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {BANK_CODES[account.bank_code]} {account.account_number}
                    </div>
                    <div className="text-sm text-gray-600">
                      {account.account_holder} {account.description && `- ${account.description}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckDeposits(account)}
                      disabled={loading}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      입금 확인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteBankAccount(account.id)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {bankAccounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 계좌가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 카카오톡 템플릿 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              카카오톡 템플릿 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 템플릿 추가 폼 */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>템플릿 코드</Label>
                  <Input
                    value={newTemplate.template_code}
                    onChange={(e) => setNewTemplate({ ...newTemplate, template_code: e.target.value })}
                    placeholder="예: DEPOSIT_NOTICE"
                  />
                </div>

                <div>
                  <Label>템플릿 이름</Label>
                  <Input
                    value={newTemplate.template_name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, template_name: e.target.value })}
                    placeholder="예: 입금 안내"
                  />
                </div>
              </div>

              <div>
                <Label>템플릿 유형</Label>
                <select
                  value={newTemplate.template_type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, template_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="deposit_notice">입금 안내</option>
                  <option value="charge_complete">충전 완료</option>
                  <option value="campaign_approved">캠페인 승인</option>
                  <option value="campaign_rejected">캠페인 반려</option>
                </select>
              </div>

              <div>
                <Label>템플릿 내용</Label>
                <Textarea
                  value={newTemplate.template_content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, template_content: e.target.value })}
                  rows={6}
                  placeholder="템플릿 내용을 입력하세요&#10;&#10;변수 사용 예시:&#10;#{회사명}님, 안녕하세요!&#10;#{금액}원이 입금되었습니다."
                />
              </div>

              <Button onClick={handleAddTemplate} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                템플릿 추가
              </Button>
            </div>

            {/* 등록된 템플릿 목록 */}
            <div className="space-y-2">
              {kakaoTemplates.map((template) => (
                <div key={template.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.template_name}</span>
                        <span className="text-xs text-gray-500">({template.template_code})</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          template.status === 'approved' ? 'bg-green-100 text-green-700' :
                          template.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          template.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {template.status === 'approved' ? '승인됨' :
                           template.status === 'pending' ? '심사중' :
                           template.status === 'rejected' ? '반려됨' :
                           '작성중'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                        {template.template_content}
                      </div>
                    </div>
                    {template.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleRequestTemplateApproval(template)}
                        disabled={loading}
                      >
                        심사 요청
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {kakaoTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 템플릿이 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

