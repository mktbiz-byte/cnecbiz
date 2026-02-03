const { createClient } = require('@supabase/supabase-js');

/**
 * 미국 크리에이터 알림 발송 Function
 *
 * 발송 순서:
 * 1. LINE 메시지 시도
 * 2. LINE 실패 시 → 이메일 발송
 * 3. 이메일 발송 (항상)
 *
 * 사용법:
 * POST /.netlify/functions/send-us-notification
 * Body: {
 *   type: "campaign_selected" | "guide_confirm_request" | "sns_upload_request" | "video_review_request" | "points_awarded"
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

// US Supabase
const getSupabaseUS = () => {
  return createClient(
    process.env.VITE_SUPABASE_US_URL || process.env.SUPABASE_US_URL,
    process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Gemini 번역 (영어)
async function translateToEnglish(text) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey) return text;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Translate the following text to natural American English. Keep emojis and line breaks as is. Output only the translated text:\n\n${text}` }] }],
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

// 메시지 템플릿 (영어)
const MESSAGE_TEMPLATES = {
  // 캠페인 선정 알림
  campaign_selected: (data) => ({
    line: `🎉 Congratulations!\n\n${data.creatorName}, you have been selected for the "${data.campaignName}" campaign!\n\nBrand: ${data.brandName || '-'}\nReward: ${data.reward || 'TBD'}\nDeadline: ${data.deadline || 'To be announced'}\n\nCheck the details at:\n${data.guideUrl || 'https://cnec.us'}\n\nThank you! 🙏`,
    emailSubject: `[CNEC] 🎉 Campaign Selection - ${data.campaignName}`,
    emailHtml: () => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">🎉 Campaign Selection</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">Hi ${data.creatorName}!</p>
<p style="font-size:14px;color:#666;">Congratulations! You have been selected for the "${data.campaignName}" campaign.</p>
<div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;">
<table width="100%">
<tr><td style="color:#666;padding:5px 0;">Brand</td><td style="color:#333;text-align:right;">${data.brandName || '-'}</td></tr>
<tr><td style="color:#666;padding:5px 0;">Reward</td><td style="color:#7c3aed;font-weight:bold;text-align:right;">${data.reward || 'TBD'}</td></tr>
<tr><td style="color:#666;padding:5px 0;">Deadline</td><td style="color:#333;text-align:right;">${data.deadline || 'TBA'}</td></tr>
</table>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.guideUrl || 'https://cnec.us'}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">View Details</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 가이드 확인 요청
  guide_confirm_request: (data) => ({
    line: `📋 Guide Ready\n\n${data.creatorName}, the shooting guide for "${data.campaignName}" is now available.\n\nBrand: ${data.brandName || '-'}\n\nPlease check the guide and start filming.\n${data.guideUrl || 'https://cnec.us/creator/mypage'}`,
    emailSubject: `[CNEC] 📋 Shooting Guide Ready - ${data.campaignName}`,
    emailHtml: () => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">📋 Guide Ready</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">Hi ${data.creatorName}!</p>
<p style="font-size:14px;color:#666;">The shooting guide for "${data.campaignName}" is now available.</p>
<div style="background:#ecfdf5;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #6ee7b7;">
<p style="font-size:18px;font-weight:bold;color:#059669;margin:0 0 15px;">${data.campaignName}</p>
<p style="color:#047857;margin:0;">Brand: ${data.brandName || '-'}</p>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.guideUrl || 'https://cnec.us/creator/mypage'}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">View Guide</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // SNS 업로드 요청
  sns_upload_request: (data) => ({
    line: `📤 SNS Upload Request\n\n${data.creatorName}, your video for "${data.campaignName}" has been approved!\n\nPlease upload to SNS and submit:\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}\n✅ SNS URL\n✅ Ad Code\n✅ Clean Video (without subtitles)\n\nDeadline: ${data.deadline || 'Campaign end date'}\n${data.uploadUrl || 'https://cnec.us/creator/mypage'}`,
    emailSubject: `[CNEC] 📤 SNS Upload Request - ${data.campaignName}`,
    emailHtml: () => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">📤 SNS Upload</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">Hi ${data.creatorName}!</p>
<p style="font-size:14px;color:#666;">Your video has been approved! Please upload to SNS.</p>
<div style="background:#f5f3ff;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #c4b5fd;">
<p style="font-size:18px;font-weight:bold;color:#7c3aed;margin:0 0 15px;">${data.campaignName}</p>
${data.stepInfo ? `<p style="color:#6d28d9;font-weight:bold;margin:0 0 10px;">📌 ${data.stepInfo}</p>` : ''}
<div style="background:#fff;border-radius:6px;padding:15px;margin:15px 0;">
<p style="font-size:14px;color:#374151;margin:0 0 10px;"><strong>Required:</strong></p>
<ul style="margin:0;padding-left:20px;color:#4b5563;">
<li>SNS URL</li>
<li>Ad Code</li>
<li>Clean Video (no subtitles)</li>
</ul>
</div>
<p style="color:#6d28d9;margin:0;"><strong>Deadline: ${data.deadline || 'Campaign end date'}</strong></p>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.uploadUrl || 'https://cnec.us/creator/mypage'}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">Submit</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 영상 수정 요청
  video_review_request: (data) => ({
    line: `📹 Video Revision Request\n\n${data.creatorName}, there's a revision request for your "${data.campaignName}" video.\n\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}Feedback: ${data.feedback || 'Please check the details.'}\n\nPlease revise and resubmit.\n${data.reviewUrl || 'https://cnec.us/creator/mypage'}`,
    emailSubject: `[CNEC] 📹 Video Revision Request - ${data.campaignName}`,
    emailHtml: () => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">📹 Revision Request</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">Hi ${data.creatorName}!</p>
<p style="font-size:14px;color:#666;">There's a revision request for your video.</p>
<div style="background:#fef2f2;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #fca5a5;">
<p style="font-size:18px;font-weight:bold;color:#dc2626;margin:0 0 15px;">${data.campaignName}</p>
${data.stepInfo ? `<p style="color:#991b1b;font-weight:bold;margin:0 0 10px;">📌 ${data.stepInfo}</p>` : ''}
<div style="background:#fff;border-radius:6px;padding:15px;margin:15px 0;">
<p style="font-size:14px;color:#374151;margin:0 0 10px;"><strong>Feedback:</strong></p>
<p style="font-size:14px;color:#6b7280;margin:0;white-space:pre-wrap;">${data.feedback || 'Please check the details.'}</p>
</div>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.reviewUrl || 'https://cnec.us/creator/mypage'}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">Revise & Resubmit</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 포인트 지급 완료
  points_awarded: (data) => ({
    line: `🎁 Reward Paid!\n\n${data.creatorName}, your reward for "${data.campaignName}" has been paid.\n\nAmount: $${data.points?.toLocaleString() || 0}\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}\nCheck your account!`,
    emailSubject: `[CNEC] 🎁 Reward Paid - ${data.campaignName}`,
    emailHtml: () => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#eab308,#ca8a04);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">🎁 Reward Paid</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">Hi ${data.creatorName}!</p>
<p style="font-size:14px;color:#666;">Your campaign reward has been paid!</p>
<div style="background:#fefce8;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #fde047;text-align:center;">
<p style="font-size:16px;color:#854d0e;margin:0 0 10px;">${data.campaignName}</p>
<p style="font-size:32px;font-weight:bold;color:#ca8a04;margin:0;">$${data.points?.toLocaleString() || 0}</p>
${data.stepInfo ? `<p style="color:#92400e;margin:10px 0 0;">📌 ${data.stepInfo}</p>` : ''}
</div>
<div style="text-align:center;margin:30px 0;">
<a href="https://cnec.us/creator/mypage" style="display:inline-block;background:linear-gradient(135deg,#eab308,#ca8a04);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">View Account</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 영상 제출 마감 임박
  video_deadline_reminder: (data) => ({
    line: `⏰ Video Submission Deadline\n\n${data.creatorName}, the deadline for "${data.campaignName}" is approaching.\n\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}Deadline: ${data.deadline}\n\nPlease submit on time!\n${data.submitUrl || 'https://cnec.us/creator/mypage'}`,
    emailSubject: `[CNEC] ⏰ Video Deadline Reminder - ${data.campaignName}`,
    emailHtml: () => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">⏰ Deadline Reminder</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">Hi ${data.creatorName}!</p>
<p style="font-size:14px;color:#666;">The video submission deadline is approaching.</p>
<div style="background:#fffbeb;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #fcd34d;">
<p style="font-size:18px;font-weight:bold;color:#d97706;margin:0 0 15px;">${data.campaignName}</p>
${data.stepInfo ? `<p style="color:#92400e;font-weight:bold;margin:0 0 10px;">📌 ${data.stepInfo}</p>` : ''}
<p style="font-size:16px;color:#92400e;margin:0;"><strong>Deadline: ${data.deadline}</strong></p>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.submitUrl || 'https://cnec.us/creator/mypage'}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">Submit Video</a>
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
    line: data.message || 'You have a notification.',
    emailSubject: data.emailSubject || '[CNEC] Notification',
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

    console.log(`[send-us-notification] Request received: type=${type}, creatorId=${creatorId || 'N/A'}, creatorEmail=${creatorEmail || 'N/A'}`);

    if (!type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'type is required' })
      };
    }

    const supabase = getSupabaseUS();
    let creator = null;

    // 크리에이터 정보 조회
    if (creatorId) {
      console.log(`[send-us-notification] Looking up by creatorId: ${creatorId}`);
      // 먼저 id 컬럼으로 시도
      const { data: c, error: e } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone, line_user_id')
        .eq('id', creatorId)
        .maybeSingle();

      if (c) {
        creator = c;
      } else {
        // id로 못 찾으면 user_id 컬럼으로 재시도
        console.log(`[send-us-notification] id lookup failed, trying user_id column`);
        const { data: c2, error: e2 } = await supabase
          .from('user_profiles')
          .select('id, name, email, phone, line_user_id')
          .eq('user_id', creatorId)
          .maybeSingle();
        creator = c2;
        if (e2) console.log(`[send-us-notification] user_id lookup error: ${e2.message}`);
      }
      if (e) console.log(`[send-us-notification] id lookup error: ${e.message}`);
    } else if (creatorEmail) {
      console.log(`[send-us-notification] Looking up by creatorEmail: ${creatorEmail}`);
      const { data: c, error: e } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone, line_user_id')
        .eq('email', creatorEmail.toLowerCase())
        .single();
      creator = c;
      if (e) console.log(`[send-us-notification] creatorEmail lookup error: ${e.message}`);
    }

    if (!creator) {
      console.log(`[send-us-notification] Creator not found - creatorId: ${creatorId}, creatorEmail: ${creatorEmail}`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Creator not found' })
      };
    }

    console.log(`[send-us-notification] Creator found: ${creator.name}, line_user_id: ${creator.line_user_id || 'NONE'}, email: ${creator.email || 'NONE'}`);

    // 데이터에 크리에이터 이름 추가
    data.creatorName = data.creatorName || creator.name || 'Creator';

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

    // 1. LINE 메시지 시도
    if (creator.line_user_id) {
      results.line.attempted = true;
      const lineResult = await sendLineMessage(creator.line_user_id, messages.line);
      results.line.success = lineResult.success;
      results.line.error = lineResult.error;

      console.log(`[US Notification] LINE result:`, lineResult);
    }

    // 2. SMS 발송 (LINE 미등록 시 또는 항상)
    if (creator.phone && !results.line.success) {
      results.sms.attempted = true;
      try {
        const baseUrl = process.env.URL || 'https://cnecbiz.netlify.app';
        const smsResponse = await fetch(`${baseUrl}/.netlify/functions/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: creator.phone,
            message: messages.line.substring(0, 160)  // SMS는 160자 제한
          })
        });
        const smsResult = await smsResponse.json();
        results.sms.success = smsResult.success || false;
        results.sms.error = smsResult.error;
        console.log(`[US Notification] SMS result:`, smsResult);
      } catch (smsError) {
        results.sms.error = smsError.message;
        console.error(`[US Notification] SMS error:`, smsError.message);
      }
    }

    // 3. 이메일 발송 (항상)
    if (creator.email) {
      results.email.attempted = true;

      const emailHtml = messages.emailHtml();

      const emailResult = await sendEmail(
        creator.email,
        messages.emailSubject,
        emailHtml
      );
      results.email.success = emailResult.success;
      results.email.error = emailResult.error;

      console.log(`[US Notification] Email result:`, emailResult);
    }

    // 결과 요약
    const anySuccess = results.line.success || results.sms.success || results.email.success;

    return {
      statusCode: anySuccess ? 200 : 500,
      headers,
      body: JSON.stringify({
        success: anySuccess,
        message: anySuccess
          ? `Notification sent (LINE: ${results.line.success}, SMS: ${results.sms.success}, Email: ${results.email.success})`
          : 'All notifications failed',
        results,
        creatorId: creator.id
      })
    };

  } catch (error) {
    console.error('[US Notification] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
