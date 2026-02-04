const { createClient } = require('@supabase/supabase-js');

/**
 * 일본 캠페인 가이드 발송 Function
 * - LINE 메시지 발송
 * - 이메일 발송
 * - 캠페인 타입별 다중 스텝 지원
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
  if (!geminiApiKey || !text) return text;

  try {
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

// LINE 메시지 발송
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

// 이메일 발송
async function sendEmail(to, subject, html) {
  try {
    const baseUrl = process.env.URL || 'https://cnecbiz.netlify.app';
    const response = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html })
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 이메일 템플릿 생성
function generateEmailTemplate(data) {
  const { campaignName, brandName, creatorName, stepInfo, guideContent, guideUrl, deadline, guideType } = data;

  // PDF/Google Slides URL인지 판단
  const isPdfOrSlides = guideType === 'pdf' || (guideUrl && (
    guideUrl.endsWith('.pdf') ||
    guideUrl.includes('docs.google.com/presentation') ||
    guideUrl.includes('docs.google.com/document') ||
    guideUrl.includes('drive.google.com')
  ));

  const guideButtonLabel = guideUrl
    ? (guideUrl.includes('docs.google.com/presentation') ? 'Google スライドで確認'
      : guideUrl.includes('docs.google.com/document') ? 'Google ドキュメントで確認'
      : guideUrl.includes('drive.google.com') ? 'Google ドライブで確認'
      : guideUrl.endsWith('.pdf') || guideType === 'pdf' ? 'PDF ガイドをダウンロード'
      : '詳細ガイドを確認')
    : '詳細ガイドを確認';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: 'Hiragino Sans', 'Meiryo', sans-serif; }
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
      <h1>📋 撮影ガイド</h1>
      <p>${stepInfo || 'キャンペーンガイド'}</p>
    </div>
    <div class="content">
      <p>${creatorName}様</p>
      <p>「${campaignName}」キャンペーンの撮影ガイドをお送りします。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">キャンペーン名</span>
          <span class="info-value">${campaignName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ブランド</span>
          <span class="info-value">${brandName}</span>
        </div>
        ${deadline ? `
        <div class="info-row">
          <span class="info-label">提出期限</span>
          <span class="info-value" style="color: #dc2626;">${deadline}</span>
        </div>
        ` : ''}
      </div>

      ${guideContent ? `
      <div class="guide-section">
        <p class="guide-title">📝 撮影ガイド内容</p>
        <div style="white-space: pre-line; line-height: 1.8;">${guideContent}</div>
      </div>
      ` : ''}

      ${guideUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        ${isPdfOrSlides ? `
        <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #991b1b; font-weight: bold;">📄 撮影ガイド (PDF/ドキュメント)</p>
          <p style="margin: 0 0 16px; font-size: 13px; color: #6b7280;">以下のボタンからガイドを確認・ダウンロードしてください</p>
          <a href="${guideUrl}" class="btn-pdf" style="color: #fff;">${guideButtonLabel}</a>
        </div>
        ` : `
        <a href="${guideUrl}" class="btn" style="color: #fff;">詳細ガイドを確認</a>
        `}
      </div>
      ` : ''}

      <p style="color: #6b7280; font-size: 14px;">
        ご不明な点がございましたら、お気軽にお問い合わせください。
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
      campaign_type, // 'regular', 'megawari', '4week_challenge'
      step_number, // 1, 2 for megawari; 1-4 for 4week
      participant_ids, // 특정 참가자만 발송 (선택사항)
      guide_content, // 가이드 내용 (텍스트)
      guide_url, // 외부 가이드 URL (선택사항)
      send_line, // LINE 발송 여부
      send_email // 이메일 발송 여부
    } = body;

    if (!campaign_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'campaign_id is required' })
      };
    }

    const supabase = getSupabaseJapan();

    // 캠페인 정보 조회
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

    // 선정된 참가자 조회
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

    // 스텝 정보 설정
    let stepInfo = '';
    let deadline = '';

    if (campaign_type === 'megawari') {
      stepInfo = step_number === 1 ? 'ステップ1 撮影ガイド' : 'ステップ2 撮影ガイド';
      deadline = step_number === 1 ? campaign.step1_deadline : campaign.step2_deadline;
    } else if (campaign_type === '4week_challenge') {
      stepInfo = `第${step_number}週 撮影ガイド`;
      const weekDeadlines = {
        1: campaign.week1_deadline,
        2: campaign.week2_deadline,
        3: campaign.week3_deadline,
        4: campaign.week4_deadline
      };
      deadline = weekDeadlines[step_number];
    } else {
      stepInfo = '撮影ガイド';
      deadline = campaign.video_deadline || campaign.end_date;
    }

    if (deadline) {
      deadline = new Date(deadline).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    const results = {
      total: participants.length,
      line_sent: 0,
      line_failed: 0,
      email_sent: 0,
      email_failed: 0,
      details: []
    };

    // 각 참가자에게 발송
    for (const participant of participants) {
      const creatorName = participant.applicant_name || participant.creator_name || 'クリエイター';
      const detail = {
        participant_id: participant.id,
        creator_name: creatorName,
        line_result: null,
        email_result: null
      };

      // user_profiles에서 line_user_id 조회 (여러 방법으로 시도)
      let lineUserId = participant.line_user_id;

      // 1. user_id로 조회 (id 컬럼 먼저, 실패시 user_id 컬럼)
      if (!lineUserId && participant.user_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('line_user_id')
          .eq('id', participant.user_id)
          .maybeSingle();
        if (profile?.line_user_id) {
          lineUserId = profile.line_user_id;
          console.log(`[deliver-japan-guide] user_id(id컬럼)로 line_user_id 조회 성공: ${creatorName}`);
        } else {
          // id 컬럼으로 못 찾으면 user_id 컬럼으로 재시도
          const { data: profile2 } = await supabase
            .from('user_profiles')
            .select('line_user_id')
            .eq('user_id', participant.user_id)
            .maybeSingle();
          if (profile2?.line_user_id) {
            lineUserId = profile2.line_user_id;
            console.log(`[deliver-japan-guide] user_id(user_id컬럼)로 line_user_id 조회 성공: ${creatorName}`);
          }
        }
      }

      // 2. creator_id로 조회 (id 컬럼 먼저, 실패시 user_id 컬럼)
      if (!lineUserId && participant.creator_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('line_user_id')
          .eq('id', participant.creator_id)
          .maybeSingle();
        if (profile?.line_user_id) {
          lineUserId = profile.line_user_id;
          console.log(`[deliver-japan-guide] creator_id(id컬럼)로 line_user_id 조회 성공: ${creatorName}`);
        } else {
          // id 컬럼으로 못 찾으면 user_id 컬럼으로 재시도
          const { data: profile2 } = await supabase
            .from('user_profiles')
            .select('line_user_id')
            .eq('user_id', participant.creator_id)
            .maybeSingle();
          if (profile2?.line_user_id) {
            lineUserId = profile2.line_user_id;
            console.log(`[deliver-japan-guide] creator_id(user_id컬럼)로 line_user_id 조회 성공: ${creatorName}`);
          }
        }
      }

      // 3. 이메일로 조회
      if (!lineUserId && (participant.email || participant.creator_email || participant.user_email)) {
        const email = participant.email || participant.creator_email || participant.user_email;
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('line_user_id')
          .eq('email', email.toLowerCase())
          .single();
        if (profile?.line_user_id) {
          lineUserId = profile.line_user_id;
          console.log(`[deliver-japan-guide] 이메일로 line_user_id 조회 성공: ${creatorName} (${email})`);
        }
      }

      console.log(`[deliver-japan-guide] 참가자: ${creatorName}, line_user_id: ${lineUserId || 'NONE'}, email: ${participant.email || 'NONE'}`);

      // LINE 메시지 발송
      if (send_line !== false && lineUserId) {
        const lineMessage = `📋 撮影ガイドのお知らせ

${creatorName}様

「${campaign.title}」の${stepInfo}をお送りします。

ブランド：${campaign.brand || '-'}
${deadline ? `提出期限：${deadline}` : ''}

${guide_url ? `詳細ガイド：${guide_url}` : ''}

ご不明な点はお気軽にお問い合わせください。

CNEC BIZ`;

        const lineResult = await sendLineMessage(lineUserId, lineMessage);
        detail.line_result = lineResult;
        console.log(`[deliver-japan-guide] LINE 발송 결과: ${creatorName} - ${lineResult.success ? '성공' : '실패: ' + lineResult.error}`);

        if (lineResult.success) {
          results.line_sent++;
        } else {
          results.line_failed++;
        }
      } else if (send_line !== false && !lineUserId) {
        console.log(`[deliver-japan-guide] LINE 발송 건너뜀 (line_user_id 없음): ${creatorName}`);
      }

      // 이메일 발송
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
          `[CNEC] 📋 ${stepInfo} - ${campaign.title}`,
          emailHtml
        );

        detail.email_result = emailResult;

        if (emailResult.success) {
          results.email_sent++;
        } else {
          results.email_failed++;
        }
      }

      results.details.push(detail);

      // 참가자 상태 업데이트
      const updateData = { guide_delivered: true, guide_delivered_at: new Date().toISOString() };

      if (campaign_type === 'megawari') {
        updateData[`step${step_number}_guide_delivered`] = true;
        updateData[`step${step_number}_guide_delivered_at`] = new Date().toISOString();
      } else if (campaign_type === '4week_challenge') {
        updateData[`week${step_number}_guide_delivered`] = true;
        updateData[`week${step_number}_guide_delivered_at`] = new Date().toISOString();
      }

      await supabase
        .from('applications')
        .update(updateData)
        .eq('id', participant.id);
    }

    // 캠페인 가이드 발송 상태 업데이트
    const campaignUpdateData = {};
    if (campaign_type === 'megawari') {
      campaignUpdateData[`step${step_number}_guide_delivered`] = true;
      campaignUpdateData[`step${step_number}_guide_delivered_at`] = new Date().toISOString();
    } else if (campaign_type === '4week_challenge') {
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `ガイド発送完了: ${results.total}名`,
        results
      })
    };

  } catch (error) {
    console.error('[deliver-japan-guide] Error:', error);
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
