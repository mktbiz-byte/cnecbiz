const nodemailer = require('nodemailer');

/**
 * 외부 가이드 (PDF/URL) 이메일 발송 Function
 *
 * 사용법:
 * POST /.netlify/functions/send-external-guide-email
 * Body: {
 *   campaign_id: "캠페인 ID",
 *   region: "korea" | "japan" | "us",
 *   campaign_title: "캠페인 제목",
 *   brand_name: "브랜드명",
 *   guide_url: "가이드 URL",
 *   guide_title: "가이드 제목 (선택)",
 *   creators: [{ id, name, email }]
 * }
 */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// 지역별 이메일 템플릿
const getEmailTemplate = (region, data) => {
  const { campaignTitle, brandName, guideUrl, guideTitle, creatorName } = data;

  if (region === 'japan') {
    return {
      subject: `【${brandName || 'CNEC'}】撮影ガイドのご案内 - ${campaignTitle}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: 'Hiragino Sans', 'Meiryo', sans-serif; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 30px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px;">📋 撮影ガイド</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">${campaignTitle}</p>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333;">${creatorName}様</p>
      <p style="font-size: 14px; color: #666; line-height: 1.8;">
        「${campaignTitle}」キャンペーンの撮影ガイドをお送りいたします。<br>
        下記のリンクからガイドをご確認の上、撮影をお願いいたします。
      </p>

      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
        <p style="font-size: 14px; color: #666; margin: 0 0 15px;">撮影ガイド</p>
        <a href="${guideUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          ${guideTitle || 'ガイドを確認する'}
        </a>
      </div>

      <p style="font-size: 13px; color: #999; line-height: 1.6;">
        ご不明な点がございましたら、お気軽にお問い合わせください。
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #999; margin: 0;">CNEC BIZ | support@cnecbiz.com</p>
    </div>
  </div>
</body>
</html>`
    };
  }

  if (region === 'us') {
    return {
      subject: `[${brandName || 'CNEC'}] Filming Guide - ${campaignTitle}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 30px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px;">📋 Filming Guide</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">${campaignTitle}</p>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333;">Hi ${creatorName},</p>
      <p style="font-size: 14px; color: #666; line-height: 1.8;">
        Your filming guide for the "${campaignTitle}" campaign is now available.<br>
        Please click the button below to view the guide and start filming.
      </p>

      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
        <p style="font-size: 14px; color: #666; margin: 0 0 15px;">Filming Guide</p>
        <a href="${guideUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          ${guideTitle || 'View Guide'}
        </a>
      </div>

      <p style="font-size: 13px; color: #999; line-height: 1.6;">
        If you have any questions, please don't hesitate to contact us.
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #999; margin: 0;">CNEC BIZ | support@cnecbiz.com</p>
    </div>
  </div>
</body>
</html>`
    };
  }

  // Korea (default)
  return {
    subject: `[${brandName || '크넥'}] 촬영 가이드 안내 - ${campaignTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 30px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px;">📋 촬영 가이드</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">${campaignTitle}</p>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333;">${creatorName}님, 안녕하세요!</p>
      <p style="font-size: 14px; color: #666; line-height: 1.8;">
        "${campaignTitle}" 캠페인의 촬영 가이드를 보내드립니다.<br>
        아래 버튼을 클릭하여 가이드를 확인하시고 촬영을 진행해주세요.
      </p>

      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
        <p style="font-size: 14px; color: #666; margin: 0 0 15px;">촬영 가이드</p>
        <a href="${guideUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          ${guideTitle || '가이드 확인하기'}
        </a>
      </div>

      <p style="font-size: 13px; color: #999; line-height: 1.6;">
        문의사항이 있으시면 언제든지 연락 주세요.
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #999; margin: 0;">크넥 BIZ | support@cnecbiz.com</p>
    </div>
  </div>
</body>
</html>`
  };
};

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
    const { region, campaign_title, brand_name, guide_url, guide_title, creators } = body;

    if (!creators || !Array.isArray(creators) || creators.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No creators provided' })
      };
    }

    if (!guide_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No guide URL provided' })
      };
    }

    const results = {
      total: creators.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const creator of creators) {
      if (!creator.email) {
        results.failed++;
        results.errors.push({ name: creator.name, error: 'No email' });
        continue;
      }

      try {
        const template = getEmailTemplate(region || 'korea', {
          campaignTitle: campaign_title,
          brandName: brand_name,
          guideUrl: guide_url,
          guideTitle: guide_title,
          creatorName: creator.name || 'Creator'
        });

        await transporter.sendMail({
          from: `"CNEC BIZ" <${process.env.GMAIL_USER}>`,
          to: creator.email,
          subject: template.subject,
          html: template.html
        });

        results.success++;
        console.log(`[External Guide Email] Sent to ${creator.email}`);
      } catch (err) {
        results.failed++;
        results.errors.push({ name: creator.name, email: creator.email, error: err.message });
        console.error(`[External Guide Email] Failed to send to ${creator.email}:`, err.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Sent ${results.success}/${results.total} emails`,
        results
      })
    };

  } catch (error) {
    console.error('[External Guide Email] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
