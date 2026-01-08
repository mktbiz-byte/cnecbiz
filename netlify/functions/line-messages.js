const { createClient } = require('@supabase/supabase-js');

/**
 * LINE 메시지 조회/관리 API (관리자용)
 *
 * GET: 메시지 목록 조회
 * POST: 메시지 발송 (관리자가 직접 발송)
 * PATCH: 메시지 읽음 처리
 */

const getSupabase = () => {
  return createClient(
    process.env.VITE_SUPABASE_JAPAN_URL || process.env.SUPABASE_JAPAN_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
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
    // GET: 메시지 목록 조회
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const { creatorId, lineUserId, direction, unreadOnly, limit = 50, offset = 0 } = params;

      let query = supabase
        .from('line_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }
      if (lineUserId) {
        query = query.eq('line_user_id', lineUserId);
      }
      if (direction) {
        query = query.eq('direction', direction);
      }
      if (unreadOnly === 'true') {
        query = query.eq('direction', 'incoming').is('read_at', null);
      }

      const { data: messages, error, count } = await query;

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ messages, total: count })
      };
    }

    // POST: 관리자가 직접 메시지 발송
    if (event.httpMethod === 'POST') {
      const { lineUserId, message, creatorId } = JSON.parse(event.body);

      if (!lineUserId && !creatorId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'lineUserId 또는 creatorId가 필요합니다.' })
        };
      }

      // 발송 API 호출
      const sendResponse = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-line-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: lineUserId,
          creatorId,
          message,
          translate: true,
          targetLanguage: 'ja'
        })
      });

      const sendResult = await sendResponse.json();

      if (!sendResponse.ok) {
        return {
          statusCode: sendResponse.status,
          headers,
          body: JSON.stringify(sendResult)
        };
      }

      // 발송 메시지 DB에 저장
      const targetUserId = lineUserId || (await supabase
        .from('user_profiles')
        .select('line_user_id')
        .eq('id', creatorId)
        .single()).data?.line_user_id;

      if (targetUserId) {
        await supabase
          .from('line_messages')
          .insert({
            line_user_id: targetUserId,
            creator_id: creatorId || null,
            direction: 'outgoing',
            message_type: 'text',
            message_content: message,
            status: 'delivered'
          });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, ...sendResult })
      };
    }

    // PATCH: 메시지 읽음 처리
    if (event.httpMethod === 'PATCH') {
      const { messageIds, lineUserId } = JSON.parse(event.body);

      if (messageIds && messageIds.length > 0) {
        // 특정 메시지들 읽음 처리
        await supabase
          .from('line_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', messageIds);
      } else if (lineUserId) {
        // 특정 사용자의 모든 메시지 읽음 처리
        await supabase
          .from('line_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('line_user_id', lineUserId)
          .eq('direction', 'incoming')
          .is('read_at', null);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };

  } catch (error) {
    console.error('LINE messages API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
