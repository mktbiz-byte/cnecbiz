import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Send,
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
  UserPlus,
  Clock
} from 'lucide-react';

/**
 * LINE 채팅 모달 컴포넌트
 *
 * Props:
 * - open: boolean - 모달 열림 상태
 * - onOpenChange: function - 모달 상태 변경
 * - creator: object - 크리에이터 정보 { id, name, email, line_user_id }
 * - region: string - 리전 (japan, korea, us, taiwan)
 */
export default function LineChatModal({ open, onOpenChange, creator, region = 'japan' }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const messagesEndRef = useRef(null);
  const sendingRef = useRef(false); // 중복 발송 방지용

  const isLineConnected = !!creator?.line_user_id;

  // 메시지 로드
  const loadMessages = async () => {
    if (!creator?.line_user_id) return;

    setLoading(true);
    try {
      const response = await fetch(`/.netlify/functions/line-messages?lineUserId=${creator.line_user_id}&limit=30`);
      const data = await response.json();

      if (data.messages) {
        setMessages(data.messages.reverse());
        scrollToBottom();

        // 읽음 처리
        await fetch('/.netlify/functions/line-messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId: creator.line_user_id })
        });
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 메시지 발송
  const sendMessage = async () => {
    if (!newMessage.trim() || !creator?.line_user_id) return;

    // 중복 발송 방지
    if (sendingRef.current) return;
    sendingRef.current = true;

    setSending(true);
    const messageToSend = newMessage;
    setNewMessage(''); // 즉시 입력창 비우기

    try {
      const response = await fetch('/.netlify/functions/line-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: creator.line_user_id,
          message: messageToSend
        })
      });

      if (response.ok) {
        await loadMessages();
      } else {
        const error = await response.json();
        alert('발송 실패: ' + (error.error || '알 수 없는 오류'));
        setNewMessage(messageToSend); // 실패 시 메시지 복원
      }
    } catch (error) {
      console.error('Send message error:', error);
      alert('발송 중 오류가 발생했습니다.');
      setNewMessage(messageToSend); // 실패 시 메시지 복원
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  // LINE 초대 이메일 + SMS 발송
  const sendInviteEmail = async () => {
    if (!creator?.email && !creator?.phone) {
      alert('이메일 주소 또는 전화번호가 없습니다.');
      return;
    }

    const inviteData = {
      to: creator.email,
      phone: creator.phone,
      creatorName: creator.name || creator.creator_name || 'クリエイター',
      language: region === 'japan' ? 'ja' : 'ko'
    };

    console.log('[LINE Invite] 발송 데이터:', inviteData);

    setSendingInvite(true);
    try {
      const response = await fetch('/.netlify/functions/send-line-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setInviteSent(true);
        // 발송 결과 메시지 생성
        const sentChannels = [];
        if (result.results?.email?.success) sentChannels.push('이메일');
        if (result.results?.sms?.success) sentChannels.push('SMS');
        alert(`LINE 친구 추가 안내가 발송되었습니다. (${sentChannels.join(' + ')})`);
      } else {
        alert('발송 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('Send invite error:', error);
      alert('발송 중 오류가 발생했습니다.');
    } finally {
      setSendingInvite(false);
    }
  };

  // 스크롤
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 메시지 변경 시 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // 시간 포맷
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 모달 열릴 때 메시지 로드
  useEffect(() => {
    if (open && creator?.line_user_id) {
      loadMessages();
    }
  }, [open, creator?.line_user_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            LINE 채팅 - {creator?.name || creator?.creator_name || '크리에이터'}
          </DialogTitle>
        </DialogHeader>

        {/* LINE 연결 상태 */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${isLineConnected ? 'bg-green-50' : 'bg-yellow-50'}`}>
          {isLineConnected ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 text-sm font-medium">LINE 연동됨</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {creator.line_user_id?.substring(0, 10)}...
              </Badge>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-yellow-500" />
              <span className="text-yellow-700 text-sm font-medium">LINE 미연동</span>
              <span className="text-yellow-600 text-xs ml-auto">친구 추가 필요</span>
            </>
          )}
        </div>

        {isLineConnected ? (
          <>
            {/* 메시지 영역 */}
            <div className="h-[350px] overflow-y-auto border rounded-lg p-3 bg-white">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                  <p>메시지가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-2.5 ${
                          msg.direction === 'outgoing'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${
                          msg.direction === 'outgoing' ? 'text-green-100' : 'text-gray-400'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 메시지 입력 */}
            <div className="flex gap-2 mt-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지 입력... (한국어 → 일본어 자동 번역)"
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="bg-green-500 hover:bg-green-600 self-end"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-400">Shift+Enter: 줄바꿈 / Enter: 발송</p>
          </>
        ) : (
          /* LINE 미연동 시 초대 이메일 발송 */
          <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-800">LINE 친구 추가가 필요합니다</p>
              <p className="text-sm text-gray-500 mt-1">
                크리에이터에게 LINE 친구 추가 안내를 발송하세요
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 w-full space-y-1">
              <p className="text-sm text-gray-600">
                <strong>이메일:</strong> {creator?.email || <span className="text-yellow-600">없음</span>}
              </p>
              <p className="text-sm text-gray-600">
                <strong>전화번호:</strong> {creator?.phone || <span className="text-yellow-600">없음</span>}
              </p>
              <p className="text-sm text-gray-600">
                <strong>언어:</strong> {region === 'japan' ? '일본어' : '한국어'}
              </p>
            </div>

            {inviteSent && (
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span>초대 발송 완료!</span>
              </div>
            )}
            <Button
              onClick={sendInviteEmail}
              disabled={sendingInvite || (!creator?.email && !creator?.phone)}
              className="bg-green-500 hover:bg-green-600"
            >
              {sendingInvite ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  {inviteSent ? '다시 발송' : 'LINE 친구 추가 안내 발송'}
                  {creator?.email && creator?.phone && ' (이메일 + SMS)'}
                  {creator?.email && !creator?.phone && ' (이메일)'}
                  {!creator?.email && creator?.phone && ' (SMS)'}
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
