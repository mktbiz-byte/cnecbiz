const { createClient } = require('@supabase/supabase-js');

/**
 * WhatsApp 메시지 조회/관리 API
 *
 * GET /.netlify/functions/whatsapp-messages?phoneNumber=+821012345678
 *   - 특정 번호의 대화 내역 조회
 *
 * GET /.netlify/functions/whatsapp-messages?list=chats
 *   - 모든 채팅방(전화번호) 목록 조회
 *
 * PATCH /.netlify/functions/whatsapp-messages
 *   - 메시지 읽음 처리
 */

// Supabase 클라이언트 (BIZ DB)
const getSupabase = () => {
  return createClient(
    process.env.VITE_SUPABASE_BIZ_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const supabase = getSupabase();

  try {
    // GET: 메시지 조회
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};

      // 채팅방 목록 조회
      if (params.list === 'chats') {
        const { data: messages, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // 전화번호별로 그룹화
        const chatMap = new Map();
        messages?.forEach(msg => {
          if (!chatMap.has(msg.phone_number)) {
            chatMap.set(msg.phone_number, {
              phone_number: msg.phone_number,
              last_message: msg.content,
              last_message_time: msg.created_at,
              last_direction: msg.direction,
              sender_name: msg.sender_name,
              unread_count: 0,
              messages: []
            });
          }
          const chat = chatMap.get(msg.phone_number);
          chat.messages.push(msg);
          if (msg.direction === 'incoming' && !msg.read_at) {
            chat.unread_count++;
          }
        });

        // 최신 메시지 순으로 정렬
        const chats = Array.from(chatMap.values()).sort((a, b) =>
          new Date(b.last_message_time) - new Date(a.last_message_time)
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, chats })
        };
      }

      // 특정 번호의 대화 내역 조회
      if (params.phoneNumber) {
        const { data: messages, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('phone_number', params.phoneNumber)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, messages })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'phoneNumber 또는 list=chats 파라미터가 필요합니다.' })
      };
    }

    // POST: 메시지 발송 (send-whatsapp-message로 포워딩)
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);

      // send-whatsapp-message 함수 호출
      const response = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-whatsapp-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(result)
      };
    }

    // PATCH: 읽음 처리
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body);
      const { phoneNumber, messageIds } = body;

      if (phoneNumber) {
        // 특정 번호의 모든 수신 메시지 읽음 처리
        const { error } = await supabase
          .from('whatsapp_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('phone_number', phoneNumber)
          .eq('direction', 'incoming')
          .is('read_at', null);

        if (error) throw error;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      if (messageIds && Array.isArray(messageIds)) {
        // 특정 메시지들 읽음 처리
        const { error } = await supabase
          .from('whatsapp_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', messageIds);

        if (error) throw error;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'phoneNumber 또는 messageIds가 필요합니다.' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };

  } catch (error) {
    console.error('[WhatsApp Messages] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
