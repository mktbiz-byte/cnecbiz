const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  try {
    // body 파싱 안전 처리 (null, base64 인코딩 대응)
    let rawBody = event.body;
    if (!rawBody) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '요청 본문이 비어있습니다.' })
      };
    }
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
    }
    let parsed;
    try {
      parsed = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('[send-email] JSON 파싱 실패:', parseErr.message, 'body:', rawBody.substring(0, 200));
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: `JSON 파싱 실패: ${parseErr.message}` })
      };
    }
    const { to, subject, html, text, attachments } = parsed;

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

    // 이메일 발송 (Gmail 454/451 임시 에러 시 최대 2회 재시도)
    const mailOptions = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
      ...(mailAttachments.length > 0 && { attachments: mailAttachments })
    };

    let info;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        info = await transporter.sendMail(mailOptions);
        break;
      } catch (sendErr) {
        lastError = sendErr;
        const code = sendErr.responseCode || sendErr.code || '';
        const isTemporary = [454, 451, '454', '451'].includes(code) ||
          /too many connections|rate limit|try again/i.test(sendErr.message);
        if (isTemporary && attempt < 2) {
          const delay = (attempt + 1) * 2000;
          console.warn(`[send-email] Gmail 임시 에러 (${code}), ${delay}ms 후 재시도 (${attempt + 1}/2)`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw sendErr;
      }
    }

    console.log('이메일 발송 성공:', info.messageId);

    // 성공 로그
    try {
      await supabase.from('notification_send_logs').insert({
        channel: 'email', status: 'success', function_name: 'send-email',
        recipient: to, message_preview: subject ? subject.substring(0, 200) : null
      });
    } catch (e) { /* skip */ }

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

    // 실패 로그
    let failTo, failSubject;
    try {
      const parsed = JSON.parse(event.body || '{}');
      failTo = parsed.to;
      failSubject = parsed.subject;
    } catch (e) { /* body parse failed */ }
    try {
      await supabase.from('notification_send_logs').insert({
        channel: 'email', status: 'failed', function_name: 'send-email',
        recipient: failTo, message_preview: failSubject ? failSubject.substring(0, 200) : null,
        error_message: error.message
      });
    } catch (e) { /* skip */ }

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'send-email (이메일 발송)',
          errorMessage: error.message,
          context: { 수신자: failTo, 제목: failSubject }
        })
      });
    } catch (e) { console.error('[send-email] Error alert failed:', e.message); }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

