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

// 네이버 웍스로 LINE 메시지 알림 전송 (전용 채널)
const LINE_MESSAGE_CHANNEL_ID = '75c24874-e370-afd5-9da3-72918ba15a3c';

async function notifyNaverWorks(message) {
  try {
    const response = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        channelId: LINE_MESSAGE_CHANNEL_ID,
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

    const insertData = {
      line_user_id: messageData.line_user_id,
      direction: messageData.direction,
      message_type: messageData.message_type || 'text',
      content: messageData.content
    };

    // line_message_id가 있으면 추가 (중복 방지용)
    if (messageData.line_message_id) {
      insertData.line_message_id = messageData.line_message_id;
    }

    const { error } = await supabase
      .from('line_messages')
      .insert(insertData);

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

      // LINE 재전송 체크 - 이미 처리된 이벤트는 스킵
      const isRedelivery = webhookEvent.deliveryContext?.isRedelivery;
      if (isRedelivery) {
        console.log(`[LINE Webhook] 재전송 이벤트 스킵 - eventId: ${webhookEvent.webhookEventId}`);
        continue;
      }

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
            status: 'active',
            followed_at: new Date().toISOString()
          }, { onConflict: 'line_user_id' });

        if (insertError) {
          console.error('DB insert error:', insertError);
        }

        // 환영 메시지 (일본어)
        await replyMessage(replyToken, {
          type: 'text',
          text: `${displayName}様、こんにちは！🎉\nCNEC BIZ公式LINEへようこそ。\n\nキャンペーン選定、報酬お支払いなどの重要なお知らせをこちらからお届けします。\n\nクリエイターアカウントと連携するには、ご登録のメールアドレスを入力してください。`
        }, accessToken);

        // 새 친구 추가 알림 제거 (불필요)
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
        const messageId = message.id; // LINE 메시지 고유 ID

        // 중복 처리 방지: 이미 처리된 메시지인지 확인
        const { data: existingMsg } = await supabase
          .from('line_messages')
          .select('id')
          .eq('line_message_id', messageId)
          .single();

        if (existingMsg) {
          console.log(`[LINE Webhook] 이미 처리된 메시지 - messageId: ${messageId}`);
          continue; // 다음 이벤트로 건너뛰기
        }

        if (message.type === 'text') {
          const text = message.text.trim();
          const profile = await getUserProfile(userId, accessToken);
          const displayName = profile?.displayName || '알 수 없음';

          // 수신 메시지 DB에 저장 (line_message_id 포함)
          await saveMessageToDB(supabase, {
            line_user_id: userId,
            line_message_id: messageId,
            direction: 'incoming',
            message_type: 'text',
            content: text,
            reply_token: replyToken
          });

          // 이메일 형식 체크 (크리에이터 계정 연동)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(text)) {
            // user_profiles 테이블에서 이메일로 검색 (일본 DB)
            const { data: creator, error } = await supabase
              .from('user_profiles')
              .select('id, user_id, name, email')
              .eq('email', text.toLowerCase())
              .single();

            console.log('User profile search result:', { creator, error, searchEmail: text.toLowerCase() });

            if (creator) {
              const creatorName = creator.name || '크리에이터';

              // user_profiles 테이블에 line_user_id 저장
              await supabase
                .from('user_profiles')
                .update({ line_user_id: userId })
                .eq('id', creator.id);

              // line_users 테이블 업데이트
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
                text: `✅ 連携完了！\n\n${creatorName}様のアカウントとLINEが連携されました。\n今後、キャンペーン選定や報酬お支払いのお知らせをLINEでお届けします。`
              }, accessToken);

              // 연동 완료 네이버 웍스 알림
              const linkNotification = `🔗 LINE 계정 연동 완료\n\n` +
                `👤 크리에이터: ${creatorName}\n` +
                `📧 이메일: ${creator.email}\n` +
                `💬 LINE 이름: ${displayName}\n` +
                `🕐 연동 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
              await notifyNaverWorks(linkNotification);
            } else {
              await replyMessage(replyToken, {
                type: 'text',
                text: `❌ このメールアドレスで登録されたクリエイターが見つかりません。\n\n入力されたメール: ${text}\n\n再度ご確認の上、入力してください。`
              }, accessToken);
            }
          } else {
            // 일반 메시지 - 연동된 크리에이터 정보 조회
            const { data: linkedCreator } = await supabase
              .from('user_profiles')
              .select('name, email')
              .eq('line_user_id', userId)
              .single();

            // 네이버 웍스 알림 메시지 구성
            let notificationMessage = `💬 LINE 메시지 수신\n\n`;

            if (linkedCreator) {
              // 연동된 크리에이터인 경우 - 등록 정보 표시
              notificationMessage += `📋 등록 정보\n`;
              notificationMessage += `• 이름: ${linkedCreator.name || '미입력'}\n`;
              notificationMessage += `• 이메일: ${linkedCreator.email}\n`;
              notificationMessage += `• LINE 이름: ${displayName}\n\n`;
            } else {
              // 미연동 사용자인 경우
              notificationMessage += `⚠️ 미연동 사용자\n`;
              notificationMessage += `• LINE 이름: ${displayName}\n`;
              notificationMessage += `• User ID: ${userId.substring(0, 15)}...\n\n`;
            }

            notificationMessage += `💬 메시지: ${text}\n`;
            notificationMessage += `🕐 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

            await notifyNaverWorks(notificationMessage);

            await replyMessage(replyToken, {
              type: 'text',
              text: `メッセージを受け付けました。\n担当者が確認後、ご連絡いたします。😊`
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
