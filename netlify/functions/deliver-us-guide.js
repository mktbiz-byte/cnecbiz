const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

/**
 * US Campaign Guide Delivery Function
 * - LINE message delivery
 * - Email delivery (with PDF attachment support)
 * - Multi-step support for different campaign types
 */

// US Supabase
const getSupabaseUS = () => {
  return createClient(
    process.env.VITE_SUPABASE_US_URL || process.env.VITE_SUPABASE_US_URL,
    process.env.SUPABASE_US_SERVICE_ROLE_KEY
  );
};

// Gemini translation
async function translateToEnglish(text) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey || !text) return text;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Translate the following text to natural English. Keep emojis and line breaks as is, only output the translated text:\n\n${text}` }] }],
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

// LINE message delivery
async function sendLineMessage(lineUserId, message) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken || !lineUserId) return { success: false, error: 'LINE not configured' };

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
      const error = await response.text();
      return { success: false, error };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Fetch PDF from URL
async function fetchPdfBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[deliver-us-guide] PDF fetch error:', error.message);
    return null;
  }
}

// Email delivery (with PDF attachment support)
async function sendEmail(to, subject, html, attachments = []) {
  try {
    const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const senderName = process.env.GMAIL_SENDER_NAME || 'CNECBIZ';

    if (!gmailAppPassword) {
      return { success: false, error: 'Gmail not configured' };
    }

    const cleanPassword = gmailAppPassword.trim().replace(/\s/g, '');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailEmail, pass: cleanPassword }
    });

    const mailOptions = {
      from: `"${senderName}" <${gmailEmail}>`,
      to,
      subject,
      html,
      ...(attachments.length > 0 && { attachments })
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Email template generation
function generateEmailTemplate(data) {
  const { campaignName, brandName, creatorName, stepInfo, guideContent, guideUrl, deadline, guideType } = data;

  // PDF/Google Slides URL detection (same as Japan version)
  const isPdfOrSlides = guideType === 'pdf' || (guideUrl && (
    guideUrl.endsWith('.pdf') ||
    guideUrl.includes('docs.google.com/presentation') ||
    guideUrl.includes('docs.google.com/document') ||
    guideUrl.includes('drive.google.com')
  ));

  const guideButtonLabel = guideUrl
    ? (guideUrl.includes('docs.google.com/presentation') ? 'View on Google Slides'
      : guideUrl.includes('docs.google.com/document') ? 'View on Google Docs'
      : guideUrl.includes('drive.google.com') ? 'View on Google Drive'
      : guideUrl.endsWith('.pdf') || guideType === 'pdf' ? 'Download PDF Guide'
      : 'View Detailed Guide')
    : 'View Detailed Guide';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 30px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
    .content { padding: 30px; }
    .info-box { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; }
    .info-value { color: #111827; font-weight: 500; }
    .guide-section { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .guide-title { color: #166534; font-weight: bold; margin: 0 0 15px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; }
    .btn-pdf { display: inline-block; background: linear-gradient(135deg, #dc2626, #ef4444); color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee; }
    .footer p { font-size: 12px; color: #999; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Filming Guide</h1>
      <p>${stepInfo || 'Campaign Guide'}</p>
    </div>
    <div class="content">
      <p>Dear ${creatorName},</p>
      <p>Here is the filming guide for the "${campaignName}" campaign.</p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Campaign Name</span>
          <span class="info-value">${campaignName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Brand</span>
          <span class="info-value">${brandName}</span>
        </div>
        ${deadline ? `
        <div class="info-row">
          <span class="info-label">Deadline</span>
          <span class="info-value" style="color: #dc2626;">${deadline}</span>
        </div>
        ` : ''}
      </div>

      ${guideContent ? `
      <div class="guide-section">
        <p class="guide-title">Filming Guide Content</p>
        <div style="white-space: pre-line; line-height: 1.8;">${guideContent}</div>
      </div>
      ` : ''}

      ${guideUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        ${isPdfOrSlides ? `
        <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #991b1b; font-weight: bold;">📄 Filming Guide (PDF/Document)</p>
          <p style="margin: 0 0 16px; font-size: 13px; color: #6b7280;">Click the button below to view or download the guide</p>
          <a href="${guideUrl}" class="btn-pdf" style="color: #fff;">${guideButtonLabel}</a>
        </div>
        ` : `
        <a href="${guideUrl}" class="btn" style="color: #fff;">View Detailed Guide</a>
        `}
      </div>
      ` : ''}

      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions, please feel free to contact us.
      </p>
    </div>
    <div class="footer">
      <p>CNEC BIZ | support@cnecbiz.com</p>
    </div>
  </div>
</body>
</html>
  `;
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
    const {
      campaign_id,
      campaign_type, // 'regular', '4week_challenge'
      step_number, // 1-4 for 4week
      participant_ids, // specific participants only (optional)
      guide_content, // guide content (text)
      guide_url, // external guide URL (optional)
      send_line, // LINE delivery enabled
      send_email // Email delivery enabled
    } = body;

    if (!campaign_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'campaign_id is required' })
      };
    }

    const supabase = getSupabaseUS();

    // Fetch campaign info
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Campaign not found' })
      };
    }

    // Fetch selected participants
    let participantsQuery = supabase
      .from('applications')
      .select('*')
      .eq('campaign_id', campaign_id)
      .in('status', ['selected', 'approved', 'virtual_selected', 'filming']);

    if (participant_ids && participant_ids.length > 0) {
      participantsQuery = participantsQuery.in('id', participant_ids);
    }

    const { data: participants, error: participantsError } = await participantsQuery;

    if (participantsError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch participants' })
      };
    }

    if (!participants || participants.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No participants found' })
      };
    }

    // Set step info
    let stepInfo = '';
    let deadline = '';

    if (campaign_type === '4week_challenge') {
      stepInfo = `Week ${step_number} Filming Guide`;
      const weekDeadlines = {
        1: campaign.week1_deadline,
        2: campaign.week2_deadline,
        3: campaign.week3_deadline,
        4: campaign.week4_deadline
      };
      deadline = weekDeadlines[step_number];
    } else {
      stepInfo = 'Filming Guide';
      deadline = campaign.video_deadline || campaign.end_date;
    }

    if (deadline) {
      deadline = new Date(deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Pre-fetch PDF if guide is a PDF file
    const isPdf = guide_url && (
      guide_url.endsWith('.pdf') ||
      guide_url.includes('.pdf?') ||
      (campaign && campaign.guide_type === 'pdf')
    );
    let pdfAttachments = [];
    if (isPdf && guide_url) {
      console.log('[deliver-us-guide] PDF guide detected, downloading:', guide_url);
      const pdfBuffer = await fetchPdfBuffer(guide_url);
      if (pdfBuffer) {
        const urlPath = guide_url.split('?')[0];
        const urlParts = urlPath.split('/');
        let fileName = decodeURIComponent(urlParts[urlParts.length - 1]) || 'guide.pdf';
        if (!fileName.endsWith('.pdf')) fileName += '.pdf';
        pdfAttachments = [{
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }];
        console.log(`[deliver-us-guide] PDF downloaded: ${fileName} (${pdfBuffer.length} bytes)`);
      } else {
        console.warn('[deliver-us-guide] PDF download failed, sending with URL link only');
      }
    }

    const results = {
      total: participants.length,
      line_sent: 0,
      line_failed: 0,
      email_sent: 0,
      email_failed: 0,
      details: []
    };

    // Send to each participant
    for (const participant of participants) {
      const creatorName = participant.applicant_name || participant.creator_name || 'Creator';
      const detail = {
        participant_id: participant.id,
        creator_name: creatorName,
        line_result: null,
        email_result: null
      };

      // Lookup line_user_id from user_profiles (multiple methods)
      let lineUserId = participant.line_user_id;

      // 1. Lookup by user_id
      if (!lineUserId && participant.user_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('line_user_id')
          .eq('id', participant.user_id)
          .single();
        if (profile?.line_user_id) {
          lineUserId = profile.line_user_id;
          console.log(`[deliver-us-guide] Found line_user_id via user_id: ${creatorName}`);
        }
      }

      // 2. Lookup by creator_id
      if (!lineUserId && participant.creator_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('line_user_id')
          .eq('id', participant.creator_id)
          .single();
        if (profile?.line_user_id) {
          lineUserId = profile.line_user_id;
          console.log(`[deliver-us-guide] Found line_user_id via creator_id: ${creatorName}`);
        }
      }

      // 3. Lookup by email
      if (!lineUserId && (participant.email || participant.creator_email || participant.user_email)) {
        const email = participant.email || participant.creator_email || participant.user_email;
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('line_user_id')
          .eq('email', email.toLowerCase())
          .single();
        if (profile?.line_user_id) {
          lineUserId = profile.line_user_id;
          console.log(`[deliver-us-guide] Found line_user_id via email: ${creatorName} (${email})`);
        }
      }

      console.log(`[deliver-us-guide] Participant: ${creatorName}, line_user_id: ${lineUserId || 'NONE'}, email: ${participant.email || 'NONE'}`);

      // LINE message delivery
      if (send_line !== false && lineUserId) {
        const lineMessage = `Filming Guide Notification

Dear ${creatorName},

Here is the ${stepInfo} for "${campaign.title}".

Brand: ${campaign.brand || '-'}
${deadline ? `Deadline: ${deadline}` : ''}

${guide_url ? `Detailed Guide: ${guide_url}` : ''}

If you have any questions, please feel free to contact us.

CNEC BIZ`;

        const lineResult = await sendLineMessage(lineUserId, lineMessage);
        detail.line_result = lineResult;
        console.log(`[deliver-us-guide] LINE delivery result: ${creatorName} - ${lineResult.success ? 'Success' : 'Failed: ' + lineResult.error}`);

        if (lineResult.success) {
          results.line_sent++;
        } else {
          results.line_failed++;
        }
      } else if (send_line !== false && !lineUserId) {
        console.log(`[deliver-us-guide] LINE delivery skipped (no line_user_id): ${creatorName}`);
      }

      // Email delivery
      if (send_email !== false && participant.email) {
        const emailHtml = generateEmailTemplate({
          campaignName: campaign.title,
          brandName: campaign.brand,
          creatorName,
          stepInfo,
          guideContent: guide_content,
          guideUrl: guide_url,
          deadline,
          guideType: campaign.guide_type
        });

        const emailResult = await sendEmail(
          participant.email,
          `[CNEC] ${stepInfo} - ${campaign.title}`,
          emailHtml,
          pdfAttachments
        );

        detail.email_result = emailResult;

        if (emailResult.success) {
          results.email_sent++;
        } else {
          results.email_failed++;
        }
      }

      results.details.push(detail);

      // Update participant status
      const updateData = { guide_delivered: true, guide_delivered_at: new Date().toISOString() };

      if (campaign_type === '4week_challenge') {
        updateData[`week${step_number}_guide_delivered`] = true;
        updateData[`week${step_number}_guide_delivered_at`] = new Date().toISOString();
      }

      await supabase
        .from('applications')
        .update(updateData)
        .eq('id', participant.id);
    }

    // Update campaign guide delivery status
    const campaignUpdateData = {};
    if (campaign_type === '4week_challenge') {
      campaignUpdateData[`week${step_number}_guide_delivered`] = true;
      campaignUpdateData[`week${step_number}_guide_delivered_at`] = new Date().toISOString();
    } else {
      campaignUpdateData.guide_delivered = true;
      campaignUpdateData.guide_delivered_at = new Date().toISOString();
    }

    await supabase
      .from('campaigns')
      .update(campaignUpdateData)
      .eq('id', campaign_id);

    // 네이버 웍스 관리자 알림 (가이드 전달 완료)
    try {
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const nwMessage = `🇺🇸 📋 가이드 전달 완료 (미국)\n\n• 캠페인: ${campaign.title || '캠페인'}\n• 브랜드: ${campaign.brand || '-'}\n• 발송 대상: ${results.total}명\n• LINE 성공/실패: ${results.line_sent}/${results.line_failed}\n• 이메일 성공/실패: ${results.email_sent}/${results.email_failed}\n• 시간: ${koreanTime}`;

      const nwRes = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: nwMessage
        })
      });
      const nwResult = await nwRes.json();
      console.log('[deliver-us-guide] 네이버 웍스 알림:', nwResult.success ? '성공' : '실패');
    } catch (nwErr) {
      console.error('[deliver-us-guide] 네이버 웍스 알림 오류:', nwErr.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Guide delivery complete: ${results.total} participants`,
        results
      })
    };

  } catch (error) {
    console.error('[deliver-us-guide] Error:', error);

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'deliver-us-guide',
          errorMessage: error.message,
          context: { campaign_id: JSON.parse(event.body || '{}').campaign_id }
        })
      });
    } catch (e) { console.error('[deliver-us-guide] Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
