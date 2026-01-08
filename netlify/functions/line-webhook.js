const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

/**
 * LINE Webhook - 메시지 수신 및 User ID 저장
 *
 * 환경 변수:
 * - LINE_CHANNEL_SECRET: Channel Secret (서명 검증용)
 * - LINE_CHANNEL_ACCESS_TOKEN: Channel Access Token (메시지 발송용)
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: DB 연결
 * - NAVER_WORKS_* : 네이버 웍스 알림용 (선택)
 */

// Supabase 클라이언트 (일본 DB)
const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_JAPAN_URL || process.env.SUPABASE_JAPAN_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[LINE Webhook] Supabase URL:', url ? url.substring(0, 30) + '...' : 'NOT SET');

  return createClient(url, key);
};

// LINE 서명 검증
function verifySignature(body, signature, channelSecret) {
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// LINE 메시지 발송 (Reply)
async function replyMessage(replyToken, messages, accessToken) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      replyToken,
      messages: Array.isArray(messages) ? messages : [messages]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LINE reply error:', error);
  }
  return response.ok;
}

// 네이버 웍스로 알림 전송
async function notifyNaverWorks(message) {
  try {
    // 내부 함수 호출 대신 직접 fetch
    const response = await fetch(`${process.env.URL || 'https://cnectotal.netlify.app'}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        isAdminNotification: true
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Naver Works notification error:', error);
    return false;
  }
}

// 사용자 프로필 조회
async function getUserProfile(userId, accessToken) {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Get profile error:', error);
  }
  return null;
}

// DB에 메시지 저장
async function saveMessageToDB(supabase, messageData) {
  try {
    // creator_id 조회 (line_user_id로)
    const { data: lineUser } = await supabase
      .from('line_users')
      .select('creator_id')
      .eq('line_user_id', messageData.line_user_id)
      .single();

    const { error } = await supabase
      .from('line_messages')
      .insert({
        line_user_id: messageData.line_user_id,
        creator_id: lineUser?.creator_id || null,
        direction: messageData.direction,
        message_type: messageData.message_type || 'text',
        message_content: messageData.message_content,
        template_type: messageData.template_type || null,
        reply_token: messageData.reply_token || null,
        status: 'delivered'
      });

    if (error) {
      console.error('Save message error:', error);
    }
    return !error;
  } catch (error) {
    console.error('Save message exception:', error);
    return false;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Line-Signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST만 허용
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelSecret || !accessToken) {
    console.error('LINE credentials not configured');
    return { statusCode: 500, headers, body: 'Server configuration error' };
  }

  // 서명 검증
  const signature = event.headers['x-line-signature'];
  if (!signature || !verifySignature(event.body, signature, channelSecret)) {
    console.error('Invalid signature');
    return { statusCode: 401, headers, body: 'Invalid signature' };
  }

  try {
    const body = JSON.parse(event.body);
    const supabase = getSupabase();

    console.log('LINE webhook events:', JSON.stringify(body.events, null, 2));

    for (const webhookEvent of body.events || []) {
      const userId = webhookEvent.source?.userId;
      const eventType = webhookEvent.type;
      const replyToken = webhookEvent.replyToken;

      console.log(`Event type: ${eventType}, User ID: ${userId}`);

      // 1. Follow 이벤트 (친구 추가)
      if (eventType === 'follow' && userId) {
        const profile = await getUserProfile(userId, accessToken);
        const displayName = profile?.displayName || '알 수 없음';

        // DB에 LINE User ID 저장 시도 (기존 크리에이터 매칭)
        // 일단 line_users 테이블에 저장
        const { error: insertError } = await supabase
          .from('line_users')
          .upsert({
            line_user_id: userId,
            display_name: displayName,
            profile_picture_url: profile?.pictureUrl,
            status: 'active',
            followed_at: new Date().toISOString()
          }, { onConflict: 'line_user_id' });

        if (insertError) {
          console.error('DB insert error:', insertError);
        }

        // 환영 메시지
        await replyMessage(replyToken, {
          type: 'text',
          text: `안녕하세요, ${displayName}님! 🎉\nCNEC BIZ 공식 LINE에 오신 것을 환영합니다.\n\n캠페인 선정, 정산 등 중요한 알림을 이 채널로 보내드립니다.\n\n크리에이터 계정과 연동하시려면 가입하신 이메일 주소를 입력해주세요.`
        }, accessToken);

        // 네이버 웍스 알림
        await notifyNaverWorks(`📱 LINE 새 친구 추가\n\n이름: ${displayName}\nUser ID: ${userId}\n시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      }

      // 2. Unfollow 이벤트 (친구 삭제)
      else if (eventType === 'unfollow' && userId) {
        await supabase
          .from('line_users')
          .update({ status: 'unfollowed', unfollowed_at: new Date().toISOString() })
          .eq('line_user_id', userId);
      }

      // 3. Message 이벤트 (메시지 수신)
      else if (eventType === 'message' && webhookEvent.message) {
        const message = webhookEvent.message;

        if (message.type === 'text') {
          const text = message.text.trim();
          const profile = await getUserProfile(userId, accessToken);
          const displayName = profile?.displayName || '알 수 없음';

          // 수신 메시지 DB에 저장
          await saveMessageToDB(supabase, {
            line_user_id: userId,
            direction: 'incoming',
            message_type: 'text',
            message_content: text,
            reply_token: replyToken
          });

          // 이메일 형식 체크 (크리에이터 계정 연동)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(text)) {
            // 크리에이터 테이블에서 이메일로 검색
            const { data: creator, error } = await supabase
              .from('creators')
              .select('id, name, creator_name, email')
              .eq('email', text.toLowerCase())
              .single();

            console.log('Creator search result:', { creator, error, searchEmail: text.toLowerCase() });

            if (creator) {
              const creatorName = creator.name || creator.creator_name || '크리에이터';

              // 크리에이터와 LINE User ID 연동
              await supabase
                .from('creators')
                .update({ line_user_id: userId })
                .eq('id', creator.id);

              // line_users 테이블도 업데이트
              await supabase
                .from('line_users')
                .update({
                  creator_id: creator.id,
                  email: creator.email,
                  linked_at: new Date().toISOString()
                })
                .eq('line_user_id', userId);

              await replyMessage(replyToken, {
                type: 'text',
                text: `✅ 연동 완료!\n\n${creatorName}님의 계정과 LINE이 연동되었습니다.\n앞으로 캠페인 선정, 정산 알림을 LINE으로 받으실 수 있습니다.`
              }, accessToken);

              await notifyNaverWorks(`🔗 LINE 계정 연동\n\n크리에이터: ${creatorName}\n이메일: ${creator.email}\nLINE: ${displayName}`);
            } else {
              await replyMessage(replyToken, {
                type: 'text',
                text: `❌ 해당 이메일로 등록된 크리에이터를 찾을 수 없습니다.\n\n입력하신 이메일: ${text}\n\n다시 확인 후 입력해주세요.`
              }, accessToken);
            }
          } else {
            // 일반 메시지 - 네이버 웍스로 전달
            await notifyNaverWorks(`💬 LINE 메시지 수신\n\n보낸 사람: ${displayName}\nUser ID: ${userId}\n메시지: ${text}\n시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

            await replyMessage(replyToken, {
              type: 'text',
              text: `메시지가 전달되었습니다.\n담당자가 확인 후 연락드리겠습니다. 😊`
            }, accessToken);
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
