const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  try {
    const { to, subject, html, text } = JSON.parse(event.body);

    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '수신자, 제목, 내용은 필수입니다.'
        })
      };
    }

    // Supabase에서 Gmail 설정 가져오기
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .single();

    if (settingsError || !emailSettings) {
      console.error('Email 설정 조회 오류:', settingsError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Email 설정이 등록되지 않았습니다. 관리자 페이지에서 Gmail SMTP 설정을 완료해주세요.'
        })
      };
    }

    // Gmail SMTP 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailSettings.gmail_email,
        pass: emailSettings.gmail_app_password.replace(/\s/g, '') // 공백 제거
      }
    });

    // 이메일 발송
    const mailOptions = {
      from: `"${emailSettings.sender_name}" <${emailSettings.gmail_email}>`,
      to: to,
      subject: subject,
      text: text,
      html: html
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

