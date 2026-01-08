const nodemailer = require('nodemailer');

/**
 * LINE 친구 추가 요청 이메일 발송 (일본 크리에이터용)
 *
 * POST /.netlify/functions/send-line-invitation-email
 * Body: {
 *   to: "creator@email.com",
 *   creatorName: "크리에이터 이름",
 *   language: "ja" | "ko" | "en" (기본: ja)
 * }
 */

const LINE_FRIEND_URL = 'https://line.me/R/ti/p/@065vdhwf';

// 언어별 이메일 템플릿
const EMAIL_TEMPLATES = {
  ja: {
    subject: '【CNEC BIZ】LINE公式アカウントのご案内',
    html: (creatorName) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #06C755; }
    .logo { font-size: 24px; font-weight: bold; color: #06C755; }
    .content { padding: 30px 0; }
    .line-btn { display: inline-block; background: #06C755; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 20px 0; }
    .line-btn:hover { background: #05a847; }
    .benefits { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .benefits li { margin: 10px 0; }
    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    .qr-section { text-align: center; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CNEC BIZ</div>
    </div>

    <div class="content">
      <p>${creatorName}様</p>

      <p>いつもCNEC BIZをご利用いただきありがとうございます。</p>

      <p>キャンペーンの選定通知、報酬のお支払い、重要なお知らせなどを<br>
      より迅速にお届けするため、<strong>LINE公式アカウント</strong>を開設いたしました。</p>

      <div class="benefits">
        <p><strong>📱 LINE友だち追加のメリット</strong></p>
        <ul>
          <li>✅ キャンペーン選定の即時通知</li>
          <li>✅ 報酬・お支払い完了のお知らせ</li>
          <li>✅ 担当者との直接チャット</li>
          <li>✅ 新規キャンペーン情報の優先案内</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <p><strong>下記ボタンをタップして友だち追加してください</strong></p>
        <a href="${LINE_FRIEND_URL}" class="line-btn">
          LINE友だち追加 →
        </a>
      </div>

      <div class="qr-section">
        <p>または、LINEアプリでQRコードをスキャン</p>
        <img src="https://qr-official.line.me/gs/M_065vdhwf_GW.png" alt="LINE QR Code" width="150" height="150" style="border: 1px solid #ddd; border-radius: 8px;">
      </div>

      <p style="background: #fff3cd; padding: 15px; border-radius: 8px; font-size: 14px;">
        ⚠️ <strong>重要:</strong> 友だち追加後、ご登録のメールアドレスをLINEで送信してください。<br>
        アカウント連携が完了し、各種通知が届くようになります。
      </p>

      <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
    </div>

    <div class="footer">
      <p>CNEC BIZ - クリエイターマーケティングプラットフォーム</p>
      <p>お問い合わせ: mkt_biz@cnec.co.kr</p>
    </div>
  </div>
</body>
</html>
    `
  },
  ko: {
    subject: '【CNEC BIZ】LINE 공식 계정 안내',
    html: (creatorName) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #06C755; }
    .logo { font-size: 24px; font-weight: bold; color: #06C755; }
    .content { padding: 30px 0; }
    .line-btn { display: inline-block; background: #06C755; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 20px 0; }
    .benefits { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CNEC BIZ</div>
    </div>

    <div class="content">
      <p>${creatorName}님 안녕하세요,</p>

      <p>캠페인 선정 알림, 정산 안내 등을 더 빠르게 전달해 드리기 위해<br>
      <strong>LINE 공식 계정</strong>을 개설했습니다.</p>

      <div class="benefits">
        <p><strong>📱 LINE 친구 추가 혜택</strong></p>
        <ul>
          <li>✅ 캠페인 선정 즉시 알림</li>
          <li>✅ 정산 완료 알림</li>
          <li>✅ 담당자와 직접 채팅</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="${LINE_FRIEND_URL}" class="line-btn">LINE 친구 추가 →</a>
      </div>

      <p style="background: #fff3cd; padding: 15px; border-radius: 8px; font-size: 14px;">
        ⚠️ 친구 추가 후, 가입하신 이메일 주소를 LINE으로 보내주세요. 계정이 연동됩니다.
      </p>
    </div>

    <div class="footer">
      <p>CNEC BIZ</p>
    </div>
  </div>
</body>
</html>
    `
  }
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
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { to, creatorName, language = 'ja' } = JSON.parse(event.body);

    if (!to) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '이메일 주소가 필요합니다.' })
      };
    }

    const template = EMAIL_TEMPLATES[language] || EMAIL_TEMPLATES.ja;

    const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailAppPassword) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gmail 설정이 필요합니다.' })
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailAppPassword.trim().replace(/\s/g, '')
      }
    });

    const info = await transporter.sendMail({
      from: `"CNEC BIZ" <${gmailEmail}>`,
      to,
      subject: template.subject,
      html: template.html(creatorName || 'クリエイター')
    });

    console.log('[LINE Invitation Email] Sent to:', to, 'MessageId:', info.messageId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageId: info.messageId,
        to
      })
    };

  } catch (error) {
    console.error('[LINE Invitation Email] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
