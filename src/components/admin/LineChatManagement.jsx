import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageCircle,
  Send,
  Search,
  RefreshCw,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  Mail,
  ExternalLink
} from 'lucide-react'
import { supabaseJapan } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function LineChatManagement() {
  const [chatRooms, setChatRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef(null)

  // 채팅방 목록 로드
  const loadChatRooms = async () => {
    setLoading(true)
    try {
      // line_messages에서 고유한 line_user_id 목록 조회 (모든 채팅 내역)
      const { data: allMessages, error: msgError } = await supabaseJapan
        .from('line_messages')
        .select('line_user_id')
        .order('created_at', { ascending: false })

      if (msgError) {
        console.error('Load messages error:', msgError)
      }

      // 고유한 사용자 ID 추출
      const uniqueUserIds = [...new Set((allMessages || []).map(m => m.line_user_id))]
      console.log('[LineChatManagement] Unique user IDs from messages:', uniqueUserIds.length)

      // line_users 테이블에서 사용자 정보 조회
      const { data: lineUsers, error } = await supabaseJapan
        .from('line_users')
        .select('*')

      if (error) {
        console.error('Load line_users error:', error)
      }

      console.log('[LineChatManagement] Line users:', lineUsers?.length || 0)

      // line_users 맵 생성
      const userMap = new Map()
      lineUsers?.forEach(u => userMap.set(u.line_user_id, u))

      // 메시지가 있는 모든 사용자로 채팅방 생성
      const roomsWithMessages = await Promise.all(
        uniqueUserIds.map(async (lineUserId) => {
          const user = userMap.get(lineUserId) || { line_user_id: lineUserId }

          // 최신 메시지 조회
          const { data: lastMessage } = await supabaseJapan
            .from('line_messages')
            .select('content, created_at, direction')
            .eq('line_user_id', lineUserId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // 읽지 않은 메시지 수
          const { count: unreadCount } = await supabaseJapan
            .from('line_messages')
            .select('*', { count: 'exact', head: true })
            .eq('line_user_id', lineUserId)
            .eq('direction', 'incoming')
            .eq('is_read', false)

          // 크리에이터 정보 조회
          let creatorInfo = null
          if (user.creator_id) {
            const { data: creator } = await supabaseJapan
              .from('user_profiles')
              .select('name, email')
              .eq('id', user.creator_id)
              .single()
            creatorInfo = creator
          }

          return {
            ...user,
            line_user_id: lineUserId,
            lastMessage: lastMessage?.content || '',
            lastMessageTime: lastMessage?.created_at,
            lastMessageDirection: lastMessage?.direction,
            unreadCount: unreadCount || 0,
            creatorName: creatorInfo?.name || user.display_name,
            creatorEmail: creatorInfo?.email || user.email
          }
        })
      )

      // 최신 메시지 순으로 정렬
      roomsWithMessages.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      })

      setChatRooms(roomsWithMessages)
    } catch (error) {
      console.error('Load chat rooms error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 메시지 로드
  const loadMessages = async (lineUserId) => {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabaseJapan
        .from('line_messages')
        .select('*')
        .eq('line_user_id', lineUserId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error

      setMessages(data || [])

      // 읽음 처리
      await supabaseJapan
        .from('line_messages')
        .update({ is_read: true })
        .eq('line_user_id', lineUserId)
        .eq('direction', 'incoming')

      // 채팅방 목록 업데이트 (읽지 않은 메시지 수 초기화)
      setChatRooms(prev => prev.map(room =>
        room.line_user_id === lineUserId
          ? { ...room, unreadCount: 0 }
          : room
      ))

      scrollToBottom()
    } catch (error) {
      console.error('Load messages error:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  // 메시지 발송
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom?.line_user_id) return

    setSending(true)
    const messageToSend = newMessage
    setNewMessage('')

    try {
      const response = await fetch('/.netlify/functions/line-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: selectedRoom.line_user_id,
          message: messageToSend
        })
      })

      if (response.ok) {
        await loadMessages(selectedRoom.line_user_id)
        // 채팅방 목록 업데이트
        setChatRooms(prev => prev.map(room =>
          room.line_user_id === selectedRoom.line_user_id
            ? { ...room, lastMessage: messageToSend, lastMessageTime: new Date().toISOString(), lastMessageDirection: 'outgoing' }
            : room
        ))
      } else {
        const error = await response.json()
        alert('발송 실패: ' + (error.error || '알 수 없는 오류'))
        setNewMessage(messageToSend)
      }
    } catch (error) {
      console.error('Send message error:', error)
      alert('발송 중 오류가 발생했습니다.')
      setNewMessage(messageToSend)
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // 시간 포맷
  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return '방금'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
    if (diff < 86400000) return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const formatFullTime = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 검색 필터
  const filteredRooms = chatRooms.filter(room => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      room.display_name?.toLowerCase().includes(search) ||
      room.creatorName?.toLowerCase().includes(search) ||
      room.creatorEmail?.toLowerCase().includes(search)
    )
  })

  useEffect(() => {
    loadChatRooms()
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.line_user_id)
    }
  }, [selectedRoom?.line_user_id])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="p-4 md:p-6 md:ml-64">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-green-500" />
              LINE 채팅 관리
            </h1>
            <p className="text-gray-600 mt-1">일본 크리에이터들과의 LINE 대화를 통합 관리합니다.</p>
          </div>

          {/* 메인 컨텐츠 */}
          <Card className="h-[calc(100vh-180px)]">
            <div className="flex h-full">
              {/* 채팅방 목록 */}
              <div className={`w-full md:w-96 border-r flex flex-col ${selectedRoom ? 'hidden md:flex' : 'flex'}`}>
                {/* 검색 & 새로고침 */}
                <div className="p-4 border-b">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="이름, 이메일로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={loadChatRooms} disabled={loading}>
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">총 {filteredRooms.length}개의 채팅방</p>
                </div>

                {/* 채팅방 리스트 */}
                <ScrollArea className="flex-1">
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                      <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                      <p>채팅방이 없습니다</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredRooms.map((room) => (
                        <div
                          key={room.line_user_id}
                          onClick={() => setSelectedRoom(room)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedRoom?.line_user_id === room.line_user_id ? 'bg-green-50 border-l-4 border-green-500' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* 프로필 이미지 */}
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {room.profile_picture_url ? (
                                <img src={room.profile_picture_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-gray-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 truncate">
                                  {room.creatorName || room.display_name || 'Unknown'}
                                </p>
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {formatTime(room.lastMessageTime)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 mt-0.5">
                                {room.linked_at ? (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    연동됨
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                    미연동
                                  </Badge>
                                )}
                                {room.creatorEmail && (
                                  <span className="text-xs text-gray-400 truncate">{room.creatorEmail}</span>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-1">
                                <p className="text-sm text-gray-500 truncate">
                                  {room.lastMessageDirection === 'outgoing' && '나: '}
                                  {room.lastMessage || '메시지 없음'}
                                </p>
                                {room.unreadCount > 0 && (
                                  <Badge className="bg-green-500 text-white text-xs ml-2">
                                    {room.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* 채팅 영역 */}
              <div className={`flex-1 flex flex-col ${selectedRoom ? 'flex' : 'hidden md:flex'}`}>
                {selectedRoom ? (
                  <>
                    {/* 채팅방 헤더 */}
                    <div className="p-4 border-b bg-white flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setSelectedRoom(null)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>

                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {selectedRoom.profile_picture_url ? (
                          <img src={selectedRoom.profile_picture_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {selectedRoom.creatorName || selectedRoom.display_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {selectedRoom.creatorEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {selectedRoom.creatorEmail}
                            </span>
                          )}
                          {selectedRoom.linked_at ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              연동됨
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <XCircle className="w-3 h-3" />
                              미연동
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedRoom.creator_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/admin/all-creators?search=${selectedRoom.creatorEmail}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          프로필
                        </Button>
                      )}
                    </div>

                    {/* 메시지 영역 */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                      {loadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
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
                                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                  msg.direction === 'outgoing'
                                    ? 'bg-green-500 text-white rounded-br-sm'
                                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1 flex items-center gap-1 ${
                                  msg.direction === 'outgoing' ? 'text-green-100' : 'text-gray-400'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  {formatFullTime(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {/* 메시지 입력 */}
                    <div className="p-4 border-t bg-white">
                      <div className="flex gap-2">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="메시지 입력... (한국어 → 일본어 자동 번역)"
                          className="min-h-[60px] max-h-[120px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              sendMessage()
                            }
                          }}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={sending || !newMessage.trim()}
                          className="bg-green-500 hover:bg-green-600 self-end h-[60px] px-6"
                        >
                          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Shift+Enter: 줄바꿈 / Enter: 발송</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-lg">채팅방을 선택하세요</p>
                    <p className="text-sm mt-1">왼쪽 목록에서 대화할 크리에이터를 선택합니다</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
