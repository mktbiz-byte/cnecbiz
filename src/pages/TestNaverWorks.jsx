import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestNaverWorks() {
  const [testType, setTestType] = useState('admin'); // 'admin' or 'creator'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 관리자 알림 테스트
  const [adminMessage, setAdminMessage] = useState(
    '🔔 테스트 알림\n\n' +
    '포인트 충전 신청: 1,000,000원\n' +
    '회사명: 테스트 기업\n' +
    '입금자명: 홍길동\n' +
    '신청 시간: 2025-01-15 10:30\n\n' +
    '관리자 페이지: https://cnectotal.netlify.app/admin/deposits'
  );

  // 크리에이터 추천 알림 테스트
  const [companyName, setCompanyName] = useState('테스트 기업');
  const [brandName, setBrandName] = useState('테스트 브랜드');
  const [creatorName, setCreatorName] = useState('테스트 크리에이터');

  const sendAdminNotification = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: adminMessage,
          isAdminNotification: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        throw new Error(data.error || '메시지 전송 실패');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendCreatorNotification = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creators: [{ creator_name: creatorName }],
          companyName: companyName,
          brandName: brandName
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        throw new Error(data.error || '메시지 전송 실패');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
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
            네이버 웍스 메시지 테스트
          </CardTitle>
          <CardDescription>
            네이버 웍스 메시지방으로 테스트 메시지를 전송합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 테스트 유형 선택 */}
          <div className="flex gap-4">
            <Button
              onClick={() => setTestType('admin')}
              variant={testType === 'admin' ? 'default' : 'outline'}
              className="flex-1"
            >
              관리자 알림 테스트
            </Button>
            <Button
              onClick={() => setTestType('creator')}
              variant={testType === 'creator' ? 'default' : 'outline'}
              className="flex-1"
            >
              크리에이터 추천 알림 테스트
            </Button>
          </div>

          {/* 관리자 알림 테스트 */}
          {testType === 'admin' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="adminMessage">메시지 내용</Label>
                <Textarea
                  id="adminMessage"
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <Button
                onClick={sendAdminNotification}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    관리자 알림 전송
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 크리에이터 추천 알림 테스트 */}
          {testType === 'creator' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">기업명</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="기업명을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="brandName">브랜드명</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="브랜드명을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="creatorName">크리에이터 이름</Label>
                <Input
                  id="creatorName"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="크리에이터 이름을 입력하세요"
                />
              </div>
              <Button
                onClick={sendCreatorNotification}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    크리에이터 추천 알림 전송
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 성공 메시지 */}
          {result && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                메시지가 성공적으로 전송되었습니다!
                <pre className="mt-2 text-xs bg-white p-2 rounded">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          {/* 에러 메시지 */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* 안내 */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <strong>💡 안내:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>관리자 알림: 포인트 충전, 출금 신청 등 관리자에게 전송되는 메시지</li>
              <li>크리에이터 추천 알림: 기업이 추천 크리에이터를 선택했을 때 전송되는 메시지</li>
              <li>메시지는 설정된 네이버 웍스 채널로 전송됩니다</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
