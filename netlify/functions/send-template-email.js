const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 이메일 템플릿을 사용하여 이메일 발송
 * 
 * @param {string} templateKey - 템플릿 키 (예: 'signup_welcome', 'campaign_created')
 * @param {string} to - 수신자 이메일
 * @param {object} variables - 템플릿 변수 (예: { company_name: '회사명', campaign_title: '캠페인명' })
 */
exports.handler = async (event) => {
  try {
    const { templateKey, to, variables } = JSON.parse(event.body);

    if (!templateKey || !to) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '템플릿 키와 수신자 이메일이 필요합니다.'
        })
      };
    }

    // 이메일 템플릿 가져오기
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('[send-template-email] Template not found:', templateKey, templateError);
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: '템플릿을 찾을 수 없습니다.'
        })
      };
    }

    // Gmail 설정 가져오기
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsError || !emailSettings) {
      console.error('[send-template-email] Email settings error:', settingsError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: '이메일 설정을 불러올 수 없습니다.'
        })
      };
    }

    // 템플릿 변수 치환
    let subject = template.subject;
    let body = template.body;

    if (variables) {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, variables[key]);
        body = body.replace(regex, variables[key]);
      });
    }

    // Nodemailer 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailSettings.gmail_email,
        pass: emailSettings.gmail_app_password
      }
    });

    // 이메일 발송
    const mailOptions = {
      from: `"${emailSettings.sender_name}" <${emailSettings.gmail_email}>`,
      to: to,
      subject: subject,
      html: body
    };

    await transporter.sendMail(mailOptions);

    console.log('[send-template-email] Email sent successfully:', {
      templateKey,
      to,
      subject
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '이메일이 성공적으로 발송되었습니다.'
      })
    };

  } catch (error) {
    console.error('[send-template-email] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

