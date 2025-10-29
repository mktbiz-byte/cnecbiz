const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  try {
    const { to } = JSON.parse(event.body);

    if (!to) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '수신자 이메일 주소가 필요합니다.'
        })
      };
    }

    // Supabase에서 Gmail 설정 가져오기
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

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

    // 테스트 이메일 내용
    const mailOptions = {
      from: `"${emailSettings.sender_name}" <${emailSettings.gmail_email}>`,
      to: to,
      subject: '[CNEC BIZ] Gmail SMTP 테스트 이메일',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">CNEC BIZ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">글로벌 인플루언서 마케팅 플랫폼</p>
          </div>
          
          <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">✅ Gmail SMTP 테스트 성공!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              안녕하세요,<br><br>
              Gmail SMTP 설정이 정상적으로 완료되었습니다.<br>
              이제 회원가입, 캠페인 알림 등 모든 이메일이 정상적으로 발송됩니다.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">📧 발송 정보</h3>
              <table style="width: 100%; color: #4b5563; font-size: 14px;">
                <tr>
                  <td style="padding: 5px 0;"><strong>발신자:</strong></td>
                  <td style="padding: 5px 0;">${emailSettings.sender_name}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>발신 이메일:</strong></td>
                  <td style="padding: 5px 0;">${emailSettings.gmail_email}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>수신자:</strong></td>
                  <td style="padding: 5px 0;">${to}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>발송 시각:</strong></td>
                  <td style="padding: 5px 0;">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              이 이메일은 CNEC BIZ 관리자 페이지에서 발송된 테스트 이메일입니다.<br>
              문의사항이 있으시면 <a href="tel:1833-6025" style="color: #667eea; text-decoration: none;">1833-6025</a>로 연락주세요.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© 2025 CNEC BIZ. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
[CNEC BIZ] Gmail SMTP 테스트 이메일

안녕하세요,

Gmail SMTP 설정이 정상적으로 완료되었습니다.
이제 회원가입, 캠페인 알림 등 모든 이메일이 정상적으로 발송됩니다.

발송 정보:
- 발신자: ${emailSettings.sender_name}
- 발신 이메일: ${emailSettings.gmail_email}
- 수신자: ${to}
- 발송 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

이 이메일은 CNEC BIZ 관리자 페이지에서 발송된 테스트 이메일입니다.
문의사항이 있으시면 1833-6025로 연락주세요.

© 2025 CNEC BIZ. All rights reserved.
      `
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('테스트 이메일 발송 성공:', info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: info.messageId,
        to: to
      })
    };

  } catch (error) {
    console.error('테스트 이메일 발송 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

