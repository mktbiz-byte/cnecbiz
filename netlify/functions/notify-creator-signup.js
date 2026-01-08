const { createClient } = require('@supabase/supabase-js');

/**
 * 크리에이터 가입 완료 알림 (LINE + 네이버 웍스)
 *
 * Supabase Database Webhook에서 호출:
 * URL: https://cnectotal.netlify.app/.netlify/functions/notify-creator-signup
 * Method: POST
 * Body: { type: 'INSERT', table: 'creators', record: {...}, schema: 'public' }
 *
 * 또는 직접 호출:
 * Body: { creatorId, region }
 */

// 리전별 Supabase 클라이언트
function getSupabaseClient(region) {
  const configs = {
    japan: {
      url: process.env.VITE_SUPABASE_JAPAN_URL,
      key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
    },
    korea: {
      url: process.env.VITE_SUPABASE_KOREA_URL,
      key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
    },
    us: {
      url: process.env.VITE_SUPABASE_US_URL,
      key: process.env.SUPABASE_US_SERVICE_ROLE_KEY
    },
    taiwan: {
      url: process.env.VITE_SUPABASE_TAIWAN_URL,
      key: process.env.SUPABASE_TAIWAN_SERVICE_ROLE_KEY
    },
    biz: {
      url: process.env.VITE_SUPABASE_BIZ_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  };

  const config = configs[region] || configs.japan;
  if (!config.url || !config.key) return null;
  return createClient(config.url, config.key);
}

// LINE 메시지 발송
async function sendLineNotification(creatorId, creatorName, lineUserId) {
  // lineUserId가 있으면 직접 발송, 없으면 creatorId로 조회
  const body = lineUserId
    ? { userId: lineUserId, templateType: 'signup_complete', templateData: { creatorName } }
    : { creatorId, templateType: 'signup_complete', templateData: { creatorName } };

  try {
    const response = await fetch(`${process.env.URL || 'https://cnectotal.netlify.app'}/.netlify/functions/send-line-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.ok;
  } catch (error) {
    console.error('[notify-creator-signup] LINE notification error:', error);
    return false;
  }
}

// 네이버 웍스 알림
async function sendNaverWorksNotification(creator, region) {
  const message = `🎉 새 크리에이터 가입 (${region?.toUpperCase() || 'JP'})

이름: ${creator.creator_name || creator.name || '미입력'}
이메일: ${creator.email || '미입력'}
채널: ${creator.channel_name || creator.youtube_channel_name || '-'}
구독자: ${(creator.subscribers || creator.youtube_subscribers || 0).toLocaleString()}명
LINE 연동: ${creator.line_user_id ? '✅' : '❌'}

가입일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

  try {
    const response = await fetch(`${process.env.URL || 'https://cnectotal.netlify.app'}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, isAdminNotification: true })
    });
    return response.ok;
  } catch (error) {
    console.error('[notify-creator-signup] Naver Works error:', error);
    return false;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    let creator = null;
    let region = 'japan';

    // Supabase Webhook 형식
    if (body.type === 'INSERT' && body.table === 'creators' && body.record) {
      creator = body.record;
      // schema나 추가 정보로 리전 판단 (커스텀 필드 사용 가능)
      region = body.region || 'japan';
      console.log('[notify-creator-signup] Webhook trigger:', creator.id);
    }
    // 직접 호출 형식
    else if (body.creatorId) {
      region = body.region || 'japan';
      const supabase = getSupabaseClient(region);

      if (supabase) {
        const { data } = await supabase
          .from('creators')
          .select('*')
          .eq('id', body.creatorId)
          .single();
        creator = data;
      }
      console.log('[notify-creator-signup] Direct call:', body.creatorId);
    }

    if (!creator) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Creator not found' })
      };
    }

    const creatorName = creator.creator_name || creator.name || '크리에이터';
    const results = {
      line: false,
      naverWorks: false
    };

    // 1. LINE 알림 (line_user_id가 있는 경우만)
    if (creator.line_user_id) {
      results.line = await sendLineNotification(creator.id, creatorName, creator.line_user_id);
      console.log('[notify-creator-signup] LINE sent:', results.line);
    } else {
      console.log('[notify-creator-signup] No LINE user ID, skipping LINE notification');
    }

    // 2. 네이버 웍스 관리자 알림
    results.naverWorks = await sendNaverWorksNotification(creator, region);
    console.log('[notify-creator-signup] Naver Works sent:', results.naverWorks);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        creatorId: creator.id,
        creatorName,
        notifications: results
      })
    };

  } catch (error) {
    console.error('[notify-creator-signup] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
