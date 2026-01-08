import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle,
  Send,
  RefreshCw,
  Search,
  User,
  Clock,
  CheckCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function LineMessagesManagement() {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // 대화 목록 로드
  const loadConversations = async () => {
    setLoading(true);
    try {
      // 모든 사용자별 최근 메시지 조회
      const response = await fetch('/.netlify/functions/line-messages?limit=100');
      const data = await response.json();

      if (data.messages) {
        // 사용자별로 그룹핑
        const userMap = new Map();
        let unread = 0;

        data.messages.forEach(msg => {
          const userId = msg.line_user_id;
          if (!userMap.has(userId)) {
            userMap.set(userId, {
              lineUserId: userId,
              displayName: msg.line_users?.display_name || '알 수 없음',
              profilePicture: msg.line_users?.profile_picture_url,
              creatorId: msg.creator_id,
              lastMessage: msg.message_content,
              lastMessageTime: msg.created_at,
              unreadCount: 0
            });
          }
          if (msg.direction === 'incoming' && !msg.read_at) {
            userMap.get(userId).unreadCount++;
            unread++;
          }
        });

        setConversations(Array.from(userMap.values()));
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 특정 사용자의 메시지 로드
  const loadMessages = async (lineUserId) => {
    try {
      const response = await fetch(`/.netlify/functions/line-messages?lineUserId=${lineUserId}&limit=50`);
      const data = await response.json();

      if (data.messages) {
        setMessages(data.messages.reverse()); // 시간순 정렬
        scrollToBottom();

        // 읽음 처리
        await fetch('/.netlify/functions/line-messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId })
        });
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  // 메시지 발송
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    setSending(true);
    try {
      const response = await fetch('/.netlify/functions/line-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: selectedUser.lineUserId,
          message: newMessage
        })
      });

      if (response.ok) {
        setNewMessage('');
        // 메시지 목록 새로고침
        await loadMessages(selectedUser.lineUserId);
      } else {
        const error = await response.json();
        alert('발송 실패: ' + error.error);
      }
    } catch (error) {
      console.error('Send message error:', error);
      alert('발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  // 스크롤 맨 아래로
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 초기 로드
  useEffect(() => {
    loadConversations();
    // 30초마다 새로고침
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // 사용자 선택시 메시지 로드
  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.lineUserId);
    }
  }, [selectedUser]);

  // 시간 포맷
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // 검색 필터
  const filteredConversations = conversations.filter(conv =>
    conv.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-200px)] flex gap-4">
      {/* 대화 목록 */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              LINE 메시지
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={loadConversations} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {loading ? '로딩 중...' : '메시지가 없습니다'}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.lineUserId}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedUser?.lineUserId === conv.lineUserId ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedUser(conv)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.profilePicture} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{conv.displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 메시지 영역 */}
      <Card className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedUser.profilePicture} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedUser.displayName}</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedUser.creatorId ? '크리에이터 연동됨' : 'LINE 사용자'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.direction === 'outgoing'
                            ? 'bg-green-500 text-white'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message_content}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          msg.direction === 'outgoing' ? 'text-green-100' : 'text-muted-foreground'
                        }`}>
                          <Clock className="h-3 w-3" />
                          {new Date(msg.created_at).toLocaleString('ko-KR')}
                          {msg.direction === 'outgoing' && <CheckCheck className="h-3 w-3 ml-1" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* 메시지 입력 */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="메시지를 입력하세요... (한국어로 입력하면 일본어로 자동 번역됩니다)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="min-h-[60px]"
                  />
                  <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * Shift+Enter로 줄바꿈, Enter로 전송
                </p>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>대화를 선택해주세요</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
