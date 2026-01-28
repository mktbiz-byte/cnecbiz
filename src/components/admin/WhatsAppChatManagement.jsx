import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  MessageCircle,
  Send,
  Search,
  RefreshCw,
  User,
  Clock,
  Loader2,
  ChevronLeft,
  Phone,
  Plus,
  X,
  Mail
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function WhatsAppChatManagement() {
  const [chatRooms, setChatRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef(null)

  // 새 대화 시작 모달
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [newPhoneNumber, setNewPhoneNumber] = useState('')
  const [newChatMessage, setNewChatMessage] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)

  // 채팅방 목록 로드
  const loadChatRooms = async () => {
    setLoading(true)
    try {
      const { data: allMessages, error } = await supabaseBiz
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Load messages error:', error)
        setLoading(false)
        return
      }

      // 전화번호별로 그룹화
      const chatMap = new Map()
      allMessages?.forEach(msg => {
        if (!chatMap.has(msg.phone_number)) {
          chatMap.set(msg.phone_number, {
            phone_number: msg.phone_number,
            lastMessage: msg.content || '',
            lastMessageTime: msg.created_at,
            lastMessageDirection: msg.direction,
            senderName: msg.sender_name,
            unreadCount: 0,
            messages: []
          })
        }
        const chat = chatMap.get(msg.phone_number)
        chat.messages.push(msg)
        if (msg.direction === 'incoming' && !msg.read_at) {
          chat.unreadCount++
        }
        // sender_name 업데이트 (가장 최근 이름 사용)
        if (msg.sender_name && !chat.senderName) {
          chat.senderName = msg.sender_name
        }
      })

      // 최신 메시지 순으로 정렬
      const rooms = Array.from(chatMap.values()).sort((a, b) =>
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      )

      setChatRooms(rooms)
    } catch (error) {
      console.error('Load chat rooms error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 메시지 로드
  const loadMessages = async (phoneNumber) => {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabaseBiz
        .from('whatsapp_messages')
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error

      setMessages(data || [])

      // 읽음 처리
      try {
        await supabaseBiz
          .from('whatsapp_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('phone_number', phoneNumber)
          .eq('direction', 'incoming')
          .is('read_at', null)

        setChatRooms(prev => prev.map(room =>
          room.phone_number === phoneNumber
            ? { ...room, unreadCount: 0 }
            : room
        ))
      } catch (e) {
        console.log('read_at update skipped')
      }

      scrollToBottom()
    } catch (error) {
      console.error('Load messages error:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  // 메시지 발송
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom?.phone_number) return

    setSending(true)
    const messageToSend = newMessage
    setNewMessage('')

    try {
      const response = await fetch('/.netlify/functions/send-whatsapp-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedRoom.phone_number,
          message: messageToSend
        })
      })

      const result = await response.json()

      if (result.success) {
        await loadMessages(selectedRoom.phone_number)
        setChatRooms(prev => prev.map(room =>
          room.phone_number === selectedRoom.phone_number
            ? { ...room, lastMessage: messageToSend, lastMessageTime: new Date().toISOString(), lastMessageDirection: 'outgoing' }
            : room
        ))
      } else {
        alert('발송 실패: ' + (result.error || '알 수 없는 오류'))
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

  // 새 대화 시작
  const startNewChat = async () => {
    if (!newPhoneNumber.trim() || !newChatMessage.trim()) return

    setStartingChat(true)
    try {
      const response = await fetch('/.netlify/functions/send-whatsapp-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: newPhoneNumber.trim(),
          message: newChatMessage.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowNewChatModal(false)
        setNewPhoneNumber('')
        setNewChatMessage('')

        // 채팅방 목록 새로고침
        await loadChatRooms()

        // 새로 생성된 채팅방 선택
        const formattedNumber = result.to
        const newRoom = chatRooms.find(r => r.phone_number === formattedNumber) || {
          phone_number: formattedNumber,
          lastMessage: newChatMessage,
          lastMessageTime: new Date().toISOString(),
          lastMessageDirection: 'outgoing',
          unreadCount: 0
        }
        setSelectedRoom(newRoom)
        loadMessages(formattedNumber)
      } else {
        alert('발송 실패: ' + (result.error || result.details || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Start new chat error:', error)
      alert('새 대화 시작 중 오류가 발생했습니다.')
    } finally {
      setStartingChat(false)
    }
  }

  // WhatsApp 등록 안내 SMS 발송
  const sendWhatsAppInviteSms = async () => {
    if (!newPhoneNumber.trim()) {
      alert('전화번호를 입력해주세요.')
      return
    }

    setSendingSms(true)
    try {
      const smsMessage = `[CNEC] WhatsApp으로 편하게 연락받으세요!\n\n아래 단계를 따라주세요:\n1. WhatsApp에서 +1 415 523 8886 추가\n2. "join" 메시지 전송\n\n등록 완료 후 캠페인 안내를 WhatsApp으로 보내드립니다.`

      const response = await fetch('/.netlify/functions/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: newPhoneNumber.trim(),
          message: smsMessage
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('WhatsApp 등록 안내 SMS를 발송했습니다.')
      } else {
        alert('SMS 발송 실패: ' + (result.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Send SMS error:', error)
      alert('SMS 발송 중 오류가 발생했습니다.')
    } finally {
      setSendingSms(false)
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

  // 전화번호 포맷
  const formatPhoneDisplay = (phone) => {
    if (!phone) return ''
    // +821012345678 → +82 10-1234-5678
    if (phone.startsWith('+82')) {
      const num = phone.slice(3)
      if (num.length === 10) {
        return `+82 ${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6)}`
      }
    }
    // +811234567890 → +81 123-456-7890
    if (phone.startsWith('+81')) {
      const num = phone.slice(3)
      if (num.length === 10) {
        return `+81 ${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6)}`
      }
    }
    return phone
  }

  // 검색 필터
  const filteredRooms = chatRooms.filter(room => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      room.phone_number?.toLowerCase().includes(search) ||
      room.senderName?.toLowerCase().includes(search)
    )
  })

  useEffect(() => {
    loadChatRooms()
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.phone_number)
    }
  }, [selectedRoom?.phone_number])

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
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-7 h-7 text-green-500" />
                WhatsApp 채팅
              </h1>
              <p className="text-gray-600 mt-1">Twilio를 통한 WhatsApp 메시지를 관리합니다.</p>
            </div>
            <Button
              onClick={() => setShowNewChatModal(true)}
              className="bg-green-500 hover:bg-green-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 대화 시작
            </Button>
          </div>

          {/* 메인 컨텐츠 */}
          <Card className="h-[calc(100vh-180px)] overflow-hidden">
            <div className="flex h-full">
              {/* 채팅방 목록 */}
              <div className={`w-full md:w-96 border-r flex flex-col ${selectedRoom ? 'hidden md:flex' : 'flex'}`}>
                {/* 검색 & 새로고침 */}
                <div className="p-4 border-b">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="전화번호, 이름으로 검색..."
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
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                      <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                      <p>채팅방이 없습니다</p>
                      <Button
                        variant="link"
                        onClick={() => setShowNewChatModal(true)}
                        className="mt-2 text-green-500"
                      >
                        새 대화 시작하기
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredRooms.map((room) => (
                        <div
                          key={room.phone_number}
                          onClick={() => setSelectedRoom(room)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedRoom?.phone_number === room.phone_number ? 'bg-green-50 border-l-4 border-green-500' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* 프로필 아이콘 */}
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Phone className="w-6 h-6 text-green-600" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 truncate">
                                  {room.senderName || formatPhoneDisplay(room.phone_number)}
                                </p>
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {formatTime(room.lastMessageTime)}
                                </span>
                              </div>

                              {room.senderName && (
                                <p className="text-xs text-gray-400 truncate">
                                  {formatPhoneDisplay(room.phone_number)}
                                </p>
                              )}

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
                </div>
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

                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {selectedRoom.senderName || formatPhoneDisplay(selectedRoom.phone_number)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPhoneDisplay(selectedRoom.phone_number)}
                        </p>
                      </div>
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
                                  {msg.status && msg.direction === 'outgoing' && (
                                    <span className="ml-1">({msg.status})</span>
                                  )}
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
                          placeholder="메시지 입력..."
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
                    <p className="text-lg">채팅방을 선택하거나 새 대화를 시작하세요</p>
                    <Button
                      variant="outline"
                      onClick={() => setShowNewChatModal(true)}
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      새 대화 시작
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 새 대화 시작 모달 */}
      <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-500" />
              새 WhatsApp 대화 시작
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                전화번호 *
              </label>
              <Input
                placeholder="+821012345678 또는 010-1234-5678"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                국가 코드 포함 권장 (예: +82, +81, +1)
              </p>
            </div>

            {/* WhatsApp 등록 안내 SMS */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800 mb-2">
                WhatsApp 미등록 사용자인가요?
              </p>
              <p className="text-xs text-blue-600 mb-3">
                SMS로 WhatsApp 등록 안내를 먼저 보내세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={sendWhatsAppInviteSms}
                disabled={sendingSms || !newPhoneNumber.trim()}
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                {sendingSms ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                WhatsApp 등록 안내 SMS 발송
              </Button>
            </div>

            <div className="border-t pt-4">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                WhatsApp 메시지 (등록된 사용자만)
              </label>
              <Textarea
                placeholder="보낼 메시지를 입력하세요..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sandbox 사용 시 상대방이 먼저 등록해야 메시지 발송 가능합니다.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewChatModal(false)}>
              취소
            </Button>
            <Button
              onClick={startNewChat}
              disabled={startingChat || !newPhoneNumber.trim() || !newChatMessage.trim()}
              className="bg-green-500 hover:bg-green-600"
            >
              {startingChat ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              WhatsApp 메시지 발송
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
