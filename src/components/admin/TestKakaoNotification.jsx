import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { POPBILL_TEMPLATES } from '@/lib/popbillTemplates';
import { sendKakaoNotification } from '@/services/popbillService';

const TestKakaoNotification = () => {
  const [formData, setFormData] = useState({
    receiverNum: '01077147675',
    receiverName: '테스트',
    templateType: 'company',
    templateCode: '',
    variables: {}
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // 템플릿 목록
  const companyTemplates = [
    { code: POPBILL_TEMPLATES.COMPANY.SIGNUP.code, name: '회원가입 환영', vars: ['회원명'] },
    { code: POPBILL_TEMPLATES.COMPANY.PAYMENT_REQUEST.code, name: '캠페인 신청 및 입금 안내', vars: ['회사명', '캠페인명', '금액'] },
    { code: POPBILL_TEMPLATES.COMPANY.POINT_CHARGE_COMPLETE.code, name: '포인트 충전 완료', vars: ['회사명', '포인트'] },
    { code: POPBILL_TEMPLATES.COMPANY.CAMPAIGN_APPROVED.code, name: '캠페인 승인', vars: ['회사명', '캠페인명', '시작일', '마감일', '모집인원'] },
  ];

  const creatorTemplates = [
    { code: POPBILL_TEMPLATES.CREATOR.SIGNUP.code, name: '회원가입 환영', vars: ['이름'] },
    { code: POPBILL_TEMPLATES.CREATOR.CAMPAIGN_SELECTED.code, name: '캠페인 선정', vars: ['크리에이터명', '캠페인명'] },
    { code: POPBILL_TEMPLATES.CREATOR.VIDEO_APPROVED.code, name: '영상 승인', vars: ['크리에이터명', '캠페인명', '업로드기한'] },
  ];

  const templates = formData.templateType === 'company' ? companyTemplates : creatorTemplates;
  const selectedTemplate = templates.find(t => t.code === formData.templateCode);

  const handleTemplateChange = (code) => {
    const template = templates.find(t => t.code === code);
    const variables = {};
    
    // 템플릿 변수 초기화
    if (template) {
      template.vars.forEach(varName => {
        variables[varName] = '';
      });
    }
    
    setFormData(prev => ({
      ...prev,
      templateCode: code,
      variables
    }));
  };

  const handleVariableChange = (varName, value) => {
    setFormData(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [varName]: value
      }
    }));
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      // 전화번호 하이픈 제거
      const phoneNum = formData.receiverNum.replace(/-/g, '');

      // 알림톡 발송
      const response = await sendKakaoNotification(
        phoneNum,
        formData.receiverName,
        formData.templateCode,
        formData.variables
      );

      setResult(response);
    } catch (err) {
      console.error('알림톡 발송 오류:', err);
      setError(err.message || '알림톡 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-6 w-6" />
            테스트 알림톡 발송
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 수신자 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receiverNum">수신번호</Label>
              <Input
                id="receiverNum"
                value={formData.receiverNum}
                onChange={(e) => setFormData(prev => ({ ...prev, receiverNum: e.target.value }))}
                placeholder="010-1234-5678"
              />
            </div>
            <div>
              <Label htmlFor="receiverName">수신자 이름</Label>
              <Input
                id="receiverName"
                value={formData.receiverName}
                onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                placeholder="홍길동"
              />
            </div>
          </div>

          {/* 템플릿 유형 */}
          <div>
            <Label htmlFor="templateType">템플릿 유형</Label>
            <Select
              value={formData.templateType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, templateType: value, templateCode: '', variables: {} }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">기업용</SelectItem>
                <SelectItem value="creator">크리에이터용</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 템플릿 선택 */}
          <div>
            <Label htmlFor="template">템플릿</Label>
            <Select
              value={formData.templateCode}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="템플릿을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.code} value={template.code}>
                    {template.name} ({template.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 템플릿 변수 */}
          {selectedTemplate && selectedTemplate.vars.length > 0 && (
            <div className="space-y-4">
              <Label>템플릿 변수</Label>
              {selectedTemplate.vars.map(varName => (
                <div key={varName}>
                  <Label htmlFor={varName} className="text-sm text-gray-600">
                    {varName}
                  </Label>
                  <Input
                    id={varName}
                    value={formData.variables[varName] || ''}
                    onChange={(e) => handleVariableChange(varName, e.target.value)}
                    placeholder={`${varName} 입력`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 발송 버튼 */}
          <Button
            onClick={handleSend}
            disabled={loading || !formData.templateCode}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                알림톡 발송
              </>
            )}
          </Button>

          {/* 결과 표시 */}
          {result && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                알림톡이 성공적으로 발송되었습니다!
                <pre className="mt-2 text-xs bg-white p-2 rounded">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestKakaoNotification;
