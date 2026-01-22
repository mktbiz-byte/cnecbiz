const { createClient } = require('@supabase/supabase-js');

/**
 * 일본 크리에이터 알림 발송 Function
 *
 * 발송 순서:
 * 1. LINE 메시지 시도
 * 2. LINE 실패 시 (친구 아님) → SMS 발송
 * 3. 이메일 발송 (항상)
 *
 * 사용법:
 * POST /.netlify/functions/send-japan-notification
 * Body: {
 *   type: "line_invitation" | "campaign_selected" | "profile_request" | "general"
 *   creatorId: "크리에이터 ID" 또는
 *   creatorEmail: "이메일"
 *   data: {
 *     creatorName: "이름",
 *     campaignName: "캠페인명",
 *     brandName: "브랜드명",
 *     ... (타입별 데이터)
 *   }
 * }
 */

// Japan Supabase
const getSupabaseJapan = () => {
  return createClient(
    process.env.VITE_SUPABASE_JAPAN_URL || process.env.SUPABASE_JAPAN_URL,
    process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
  );
};

// Gemini 번역
async function translateToJapanese(text) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey) return text;

  try {
    // 번역: 단순, 대량 → gemini-1.5-flash (4K RPM, 무제한 RPD)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `다음 텍스트를 일본어로 자연스럽게 번역해주세요. 이모지와 줄바꿈은 그대로 유지하고, 번역된 텍스트만 출력하세요:\n\n${text}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
      })
    });

    if (!response.ok) return text;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
  } catch {
    return text;
  }
}

// 메시지 템플릿 (한국어 → 자동 번역)
const MESSAGE_TEMPLATES = {
  // LINE 친구 추가 초대
  line_invitation: (data) => ({
    line: `👋 안녕하세요, ${data.creatorName}님!\n\nCNEC BIZ에서 인플루언서 마케팅 캠페인을 진행하고 있습니다.\n\n캠페인 선정, 정산 등 중요한 알림을 LINE으로 보내드리기 위해 친구 추가를 부탁드립니다.\n\n아래 링크를 클릭하여 친구 추가를 해주세요:\n${data.lineAddUrl || 'https://lin.ee/cnec'}\n\n감사합니다! 🙏`,
    sms: `[CNEC] ${data.creatorName}님, 캠페인 알림을 위해 LINE 친구 추가를 부탁드립니다: ${data.lineAddUrl || 'https://lin.ee/cnec'}`,
    emailSubject: `[CNEC] LINE 친구 추가 안내`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#06C755,#00B900);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">CNEC BIZ</h1>
<p style="color:rgba(255,255,255,0.9);margin:10px 0 0;">LINE 友達追加のご案内</p>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<p style="font-size:14px;color:#666;line-height:1.6;">${translated.body}</p>
<div style="text-align:center;margin:30px 0;">
<a href="${data.lineAddUrl || 'https://lin.ee/cnec'}" style="display:inline-block;background:#06C755;color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">LINEで友達追加</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 캠페인 선정 알림
  campaign_selected: (data) => ({
    line: `🎉 축하합니다!\n\n${data.creatorName}님, "${data.campaignName}" 캠페인에 선정되셨습니다!\n\n브랜드: ${data.brandName || '-'}\n보상: ${data.reward || '협의'}\n마감일: ${data.deadline || '추후 안내'}\n\n자세한 내용은 아래 링크에서 확인해주세요:\n${data.guideUrl || 'https://cnec.jp'}\n\n감사합니다! 🙏`,
    sms: `[CNEC] ${data.creatorName}님, "${data.campaignName}" 캠페인에 선정되셨습니다! 상세: ${data.guideUrl || 'https://cnec.jp'}`,
    emailSubject: `[CNEC] 🎉 캠페인 선정 안내 - ${data.campaignName}`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">🎉 キャンペーン選定</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;">
<p style="font-size:18px;font-weight:bold;color:#7c3aed;margin:0 0 15px;">${data.campaignName}</p>
<table width="100%">
<tr><td style="color:#666;padding:5px 0;">ブランド</td><td style="color:#333;text-align:right;">${data.brandName || '-'}</td></tr>
<tr><td style="color:#666;padding:5px 0;">報酬</td><td style="color:#7c3aed;font-weight:bold;text-align:right;">${data.reward || '協議'}</td></tr>
<tr><td style="color:#666;padding:5px 0;">締切</td><td style="color:#333;text-align:right;">${data.deadline || '追って連絡'}</td></tr>
</table>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.guideUrl || 'https://cnec.jp'}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">詳細を確認</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 프로필 등록 요청
  profile_request: (data) => ({
    line: `📝 프로필 등록 요청\n\n${data.creatorName}님, CNEC BIZ에서 프로필 등록을 요청드립니다.\n\n프로필 등록 후 다양한 캠페인에 참여하실 수 있습니다.\n\n아래 링크에서 등록해주세요:\n${data.profileUrl || 'https://cnec.jp/register'}\n\n감사합니다! 🙏`,
    sms: `[CNEC] ${data.creatorName}님, 프로필 등록 후 캠페인에 참여하세요: ${data.profileUrl || 'https://cnec.jp/register'}`,
    emailSubject: `[CNEC] 프로필 등록 안내`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">CNEC BIZ</h1>
<p style="color:rgba(255,255,255,0.9);margin:10px 0 0;">プロフィール登録のご案内</p>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<p style="font-size:14px;color:#666;line-height:1.6;">${translated.body}</p>
<div style="text-align:center;margin:30px 0;">
<a href="${data.profileUrl || 'https://cnec.jp/register'}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">プロフィールを登録</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 일반 알림
  general: (data) => ({
    line: data.message || '알림이 있습니다.',
    sms: data.message || '알림이 있습니다.',
    emailSubject: data.emailSubject || '[CNEC] 알림',
    emailHtml: () => data.emailHtml || `<p>${data.message}</p>`
  })
};

// LINE 메시지 발송
async function sendLineMessage(lineUserId, message) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken || !lineUserId) {
    return { success: false, error: 'LINE not configured or no user ID' };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text: message }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[LINE] Error: ${response.status} - ${errorText}`);

      // 친구가 아닌 경우 또는 차단된 경우
      if (response.status === 400 || response.status === 403) {
        return { success: false, error: 'NOT_FRIEND', details: errorText };
      }
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error('[LINE] Exception:', error);
    return { success: false, error: error.message };
  }
}

// SMS 발송
async function sendSms(phoneNumber, message) {
  try {
    const baseUrl = process.env.URL || 'https://cnecbiz.netlify.app';
    const response = await fetch(`${baseUrl}/.netlify/functions/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phoneNumber, message })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[SMS] Error:', error);
    return { success: false, error: error.message };
  }
}

// 이메일 발송
async function sendEmail(to, subject, html) {
  try {
    const baseUrl = process.env.URL || 'https://cnecbiz.netlify.app';
    const response = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html })
    });

    const result = await response.json();
    return { success: response.ok, ...result };
  } catch (error) {
    console.error('[Email] Error:', error);
    return { success: false, error: error.message };
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { type, creatorId, creatorEmail, data = {} } = body;

    if (!type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'type is required' })
      };
    }

    const supabase = getSupabaseJapan();
    let creator = null;

    // 크리에이터 정보 조회
    if (creatorId) {
      const { data: c } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone, line_user_id')
        .eq('id', creatorId)
        .single();
      creator = c;
    } else if (creatorEmail) {
      const { data: c } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone, line_user_id')
        .eq('email', creatorEmail.toLowerCase())
        .single();
      creator = c;
    }

    if (!creator) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Creator not found' })
      };
    }

    // 데이터에 크리에이터 이름 추가
    data.creatorName = data.creatorName || creator.name || '크리에이터';

    // 템플릿 생성
    const template = MESSAGE_TEMPLATES[type];
    if (!template) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: `Unknown notification type: ${type}` })
      };
    }

    const messages = template(data);
    const results = {
      line: { attempted: false, success: false },
      sms: { attempted: false, success: false },
      email: { attempted: false, success: false }
    };

    // 1. LINE 메시지 시도 (일본어 번역)
    if (creator.line_user_id) {
      results.line.attempted = true;
      const translatedLineMessage = await translateToJapanese(messages.line);
      const lineResult = await sendLineMessage(creator.line_user_id, translatedLineMessage);
      results.line.success = lineResult.success;
      results.line.error = lineResult.error;

      console.log(`[Japan Notification] LINE result:`, lineResult);
    }

    // 2. LINE 실패 또는 친구 아님 → SMS 발송
    if (!results.line.success && creator.phone) {
      results.sms.attempted = true;
      const translatedSmsMessage = await translateToJapanese(messages.sms);
      const smsResult = await sendSms(creator.phone, translatedSmsMessage);
      results.sms.success = smsResult.success;
      results.sms.error = smsResult.error;

      console.log(`[Japan Notification] SMS result:`, smsResult);
    }

    // 3. 이메일 발송 (항상)
    if (creator.email) {
      results.email.attempted = true;

      // 이메일 내용 번역
      const translatedGreeting = await translateToJapanese(`안녕하세요, ${data.creatorName}님!`);
      const translatedBody = await translateToJapanese(messages.line.split('\n').slice(2, -2).join('\n'));

      const emailHtml = messages.emailHtml({
        greeting: translatedGreeting,
        body: translatedBody
      });

      const emailResult = await sendEmail(
        creator.email,
        messages.emailSubject,
        emailHtml
      );
      results.email.success = emailResult.success;
      results.email.error = emailResult.error;

      console.log(`[Japan Notification] Email result:`, emailResult);
    }

    // 결과 요약
    const anySuccess = results.line.success || results.sms.success || results.email.success;

    return {
      statusCode: anySuccess ? 200 : 500,
      headers,
      body: JSON.stringify({
        success: anySuccess,
        message: anySuccess
          ? `알림 발송 완료 (LINE: ${results.line.success}, SMS: ${results.sms.success}, Email: ${results.email.success})`
          : '모든 알림 발송 실패',
        results,
        creatorId: creator.id
      })
    };

  } catch (error) {
    console.error('[Japan Notification] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
