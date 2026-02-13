const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  try {
    const { to, subject, html, text, attachments } = JSON.parse(event.body);

    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '수신자, 제목, 내용은 필수입니다.'
        })
      };
    }

    // 환경변수에서 Gmail 설정 가져오기
    const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const senderName = process.env.GMAIL_SENDER_NAME || 'CNECBIZ';

    console.log('[send-email] Gmail Email:', gmailEmail);
    console.log('[send-email] Password exists:', !!gmailAppPassword);
    console.log('[send-email] Password length:', gmailAppPassword ? gmailAppPassword.length : 0);

    if (!gmailAppPassword) {
      console.error('[send-email] GMAIL_APP_PASSWORD 환경변수가 설정되지 않았습니다.');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Gmail 설정이 완료되지 않았습니다.'
        })
      };
    }

    // 공백 제거 및 정리
    const cleanPassword = gmailAppPassword.trim().replace(/\s/g, '');
    console.log('[send-email] Clean password length:', cleanPassword.length);

    // Gmail SMTP 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: cleanPassword
      }
    });

    // 첨부파일 처리 (base64 → Buffer 변환)
    const mailAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.content && att.filename) {
          mailAttachments.push({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
            contentType: att.contentType || 'application/octet-stream'
          });
        }
      }
    }

    // 이메일 발송
    const mailOptions = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
      ...(mailAttachments.length > 0 && { attachments: mailAttachments })
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('이메일 발송 성공:', info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: info.messageId,
        to: to
      })
    };

  } catch (error) {
    console.error('이메일 발송 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

