const { createClient } = require('@supabase/supabase-js');

/**
 * 미국 크리에이터 알림 발송 Function
 *
 * 발송 순서:
 * 1. WhatsApp 메시지 시도 (전화번호 있을 때)
 * 2. WhatsApp 실패 시 → SMS 발송
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
  const url = process.env.VITE_SUPABASE_US_URL;
  const key = process.env.SUPABASE_US_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[send-us-notification] US DB 환경변수 누락');
    throw new Error('US DB 환경변수 미설정 (VITE_SUPABASE_US_URL / SUPABASE_US_SERVICE_ROLE_KEY)');
  }
  return createClient(url, key);
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
    line: `📋 Guide Ready\n\n${data.creatorName}, the shooting guide for "${data.campaignName}" is now available.\n\nBrand: ${data.brandName || '-'}\n\nPlease check your My Page to view the guide and start filming.`,
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
<p style="font-size:16px;color:#333;text-align:center;margin:30px 0;font-weight:bold;">Please check your My Page for details.</p>
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

// Twilio Content Template 매핑 (send-whatsapp.js와 동일한 승인된 템플릿)
// WhatsApp Business API는 24시간 대화창 밖에서 freeform Body 전송 불가 → Content Template 필수
const WHATSAPP_TEMPLATE_MAP = {
  campaign_selected: {
    contentSid: 'HXf1ecf5df2af11281cce89dbcb767a701', // creator_selected_v2
    buildVars: (data) => ({ '1': data.creatorName || 'Creator', '2': data.guideUrl || 'https://cnec.us/creator/mypage' })
  },
  guide_confirm_request: {
    contentSid: 'HX75d0a17c1c2002a0df8916afbc502206', // selection_guide_delivery_v2
    buildVars: (data) => ({ '1': data.creatorName || 'Creator', '2': data.guideUrl || 'https://cnec.us/creator/mypage' })
  },
  video_review_request: {
    contentSid: 'HX847391a9a9c3ea2fa415e64626c494ac', // modification_request_v2
    buildVars: (data) => ({
      '1': data.creatorName || 'Creator',
      '2': data.campaignName || '-',
      '3': data.feedback || 'Please check the details.',
      '4': data.deadline || 'ASAP',
      '5': data.reviewUrl || 'https://cnec.us/creator/mypage'
    })
  },
  points_awarded: {
    contentSid: 'HX7e9d152dfe2d323473300d8b068fe877', // points_awarded_v2
    buildVars: (data) => ({
      '1': data.creatorName || 'Creator',
      '2': `$${data.points?.toLocaleString() || '0'}`,
      '3': data.campaignName || 'Campaign reward',
      '4': new Date().toLocaleDateString('en-US'),
      '5': `$${data.totalPoints?.toLocaleString() || data.points?.toLocaleString() || '0'}`,
      '6': 'https://cnec.us/creator/mypage'
    })
  },
  sns_upload_request: {
    contentSid: 'HXd0fa21fcd4b8717dad532d890e8f0919', // verification_complete_v2
    buildVars: (data) => ({
      '1': data.creatorName || 'Creator',
      '2': data.campaignName || '-',
      '3': data.deadline || 'Campaign end date',
      '4': data.uploadUrl || 'https://cnec.us/creator/mypage'
    })
  }
  // video_deadline_reminder: 매칭 템플릿 없음 → 이메일만 발송
};

// WhatsApp Content Template 발송 (Twilio API)
async function sendWhatsAppMessage(phoneNumber, notificationType, data) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+13203078933';

  if (!accountSid || !authToken || !phoneNumber) {
    return { success: false, error: 'WhatsApp not configured or no phone number' };
  }

  // 해당 알림 타입에 매핑된 Content Template 확인
  const templateConfig = WHATSAPP_TEMPLATE_MAP[notificationType];
  if (!templateConfig) {
    console.log(`[WhatsApp] No template mapping for type: ${notificationType}, skipping WhatsApp`);
    return { success: false, error: `No WhatsApp template for type: ${notificationType}` };
  }

  try {
    // 전화번호 포맷 (E.164)
    let formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10 && /^\d+$/.test(formattedPhone)) {
        formattedPhone = '+1' + formattedPhone;
      } else if (formattedPhone.startsWith('1') && formattedPhone.length === 11) {
        formattedPhone = '+' + formattedPhone;
      }
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
    const contentVariables = templateConfig.buildVars(data);

    const formData = new URLSearchParams();
    formData.append('From', formattedFrom);
    formData.append('To', `whatsapp:${formattedPhone}`);
    formData.append('ContentSid', templateConfig.contentSid);
    formData.append('ContentVariables', JSON.stringify(contentVariables));

    console.log(`[WhatsApp] Sending template ${templateConfig.contentSid} to ${formattedPhone}, vars:`, contentVariables);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const result = await response.json();

    if (!response.ok) {
      console.log(`[WhatsApp] Error: ${response.status} - ${JSON.stringify(result)}`);
      return { success: false, error: result.message || JSON.stringify(result), code: result.code };
    }

    console.log(`[WhatsApp] Template message sent. SID: ${result.sid}`);

    // DB에 메시지 저장
    try {
      const supabase = createClient(
        process.env.VITE_SUPABASE_BIZ_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabase.from('whatsapp_messages').insert({
        phone_number: formattedPhone,
        direction: 'outgoing',
        content: `[Template: ${notificationType}] ${JSON.stringify(contentVariables)}`,
        twilio_sid: result.sid,
        status: result.status
      });
    } catch (dbErr) {
      console.warn('[WhatsApp] DB save failed:', dbErr.message);
    }

    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('[WhatsApp] Exception:', error);
    return { success: false, error: error.message };
  }
}

// 이메일 발송
async function sendEmail(to, subject, html) {
  try {
    const baseUrl = process.env.URL || 'https://cnecbiz.com';
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
    const { type, creatorId, creatorEmail, creatorPhone, data = {} } = body;

    console.log(`[send-us-notification] Request received: type=${type}, creatorId=${creatorId || 'N/A'}, creatorEmail=${creatorEmail || 'N/A'}, creatorPhone=${creatorPhone || 'N/A'}`);

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
        .select('id, name, email, phone')
        .eq('id', creatorId)
        .maybeSingle();

      if (c) {
        creator = c;
      } else {
        // id로 못 찾으면 user_id 컬럼으로 재시도
        console.log(`[send-us-notification] id lookup failed, trying user_id column`);
        const { data: c2, error: e2 } = await supabase
          .from('user_profiles')
          .select('id, name, email, phone')
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
        .select('id, name, email, phone')
        .eq('email', creatorEmail.toLowerCase())
        .single();
      creator = c;
      if (e) console.log(`[send-us-notification] creatorEmail lookup error: ${e.message}`);
    }

    if (!creator) {
      // DB에서 못 찾은 경우: 요청에서 전달받은 정보로 대체
      if (creatorEmail || creatorPhone) {
        console.log(`[send-us-notification] DB lookup failed, using request data: email=${creatorEmail}, phone=${creatorPhone}`);
        creator = {
          name: data.creatorName || 'Creator',
          email: creatorEmail,
          phone: creatorPhone
        };
      } else {
        console.log(`[send-us-notification] Creator not found - creatorId: ${creatorId}, creatorEmail: ${creatorEmail}`);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Creator not found' })
        };
      }
    }

    // 요청에서 전달받은 phone이 있으면 DB 값 보완
    if (creatorPhone && !creator.phone) {
      creator.phone = creatorPhone;
    }

    console.log(`[send-us-notification] Creator info: ${creator.name}, phone: ${creator.phone || 'NONE'}, email: ${creator.email || 'NONE'}`);

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
      whatsapp: { attempted: false, success: false },
      sms: { attempted: false, success: false },
      email: { attempted: false, success: false }
    };

    // 1. WhatsApp Content Template 발송 (전화번호 있을 때)
    if (creator.phone) {
      results.whatsapp.attempted = true;
      const whatsappResult = await sendWhatsAppMessage(creator.phone, type, data);
      results.whatsapp.success = whatsappResult.success;
      results.whatsapp.error = whatsappResult.error;

      console.log(`[US Notification] WhatsApp result:`, whatsappResult);
    }

    // 2. SMS 발송 (WhatsApp 실패 시)
    if (creator.phone && !results.whatsapp.success) {
      results.sms.attempted = true;
      try {
        const baseUrl = process.env.URL || 'https://cnecbiz.com';
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
    const anySuccess = results.whatsapp.success || results.sms.success || results.email.success;

    return {
      statusCode: anySuccess ? 200 : 500,
      headers,
      body: JSON.stringify({
        success: anySuccess,
        message: anySuccess
          ? `Notification sent (WhatsApp: ${results.whatsapp.success}, SMS: ${results.sms.success}, Email: ${results.email.success})`
          : 'All notifications failed',
        results,
        creatorId: creator.id
      })
    };

  } catch (error) {
    console.error('[US Notification] Error:', error);

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'send-us-notification',
          errorMessage: error.message,
          context: { type: body?.type, creatorId: body?.creatorId }
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
