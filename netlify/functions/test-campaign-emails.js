const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  try {
    const { testEmail } = JSON.parse(event.body);

    if (!testEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '테스트 이메일 주소가 필요합니다.'
        })
      };
    }

    // 환경변수에서 Gmail 설정 가져오기
    const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const senderName = process.env.GMAIL_SENDER_NAME || 'cnec';

    console.log('[test-campaign-emails] Gmail email:', gmailEmail);
    console.log('[test-campaign-emails] Sender name:', senderName);
    console.log('[test-campaign-emails] Test email:', testEmail);

    if (!gmailAppPassword) {
      console.error('[test-campaign-emails] GMAIL_APP_PASSWORD 환경변수가 설정되지 않았습니다.');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Gmail 설정이 완료되지 않았습니다.'
        })
      };
    }

    // Gmail SMTP 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailAppPassword.replace(/\s/g, '') // 공백 제거
      }
    });

    const results = [];

    // 1. 기획형 캠페인 테스트 메일
    const planningEmail = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: testEmail,
      subject: '[CNEC] 기획형 캠페인 신청 완료',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">[CNEC] 기획형 캠페인 신청 완료</h2>
          <p><strong>테스트 회사</strong>님, 기획형 캠페인 신청이 접수되었습니다.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>캠페인:</strong> 기획형 테스트 캠페인</p>
            <p style="margin: 10px 0;"><strong>캠페인 타입:</strong> 기획형</p>
            <p style="margin: 10px 0;"><strong>금액:</strong> <span style="font-size: 18px; color: #4CAF50;">5,500,000원</span></p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">입금 계좌</h3>
            <p style="margin: 5px 0;">IBK기업은행 047-122753-04-011</p>
            <p style="margin: 5px 0;">예금주: 주식회사 하우파파</p>
          </div>
          
          <p style="color: #666;">입금 확인 후 캠페인이 시작됩니다.</p>
          <p style="color: #666;">문의: <strong>1833-6025</strong></p>
        </div>
      `
    };

    try {
      const info1 = await transporter.sendMail(planningEmail);
      results.push({ type: '기획형', success: true, messageId: info1.messageId });
      console.log('기획형 이메일 발송 성공:', info1.messageId);
    } catch (error) {
      results.push({ type: '기획형', success: false, error: error.message });
      console.error('기획형 이메일 발송 실패:', error);
    }

    // 2. 올리브영 캠페인 테스트 메일
    const oliveyoungEmail = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: testEmail,
      subject: '[CNEC] 올리브영 캠페인 신청 완료',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">[CNEC] 올리브영 캠페인 신청 완료</h2>
          <p><strong>테스트 회사</strong>님, 올리브영 캠페인 신청이 접수되었습니다.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>캠페인:</strong> 올리브영 세일 테스트</p>
            <p style="margin: 10px 0;"><strong>캠페인 타입:</strong> 올리브영 세일</p>
            <p style="margin: 10px 0;"><strong>콘텐츠 타입:</strong> 🏪 매장방문</p>
            <p style="margin: 10px 0;"><strong>금액:</strong> <span style="font-size: 18px; color: #4CAF50;">2,200,000원</span></p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">입금 계좌</h3>
            <p style="margin: 5px 0;">IBK기업은행 047-122753-04-011</p>
            <p style="margin: 5px 0;">예금주: 주식회사 하우파파</p>
          </div>
          
          <p style="color: #666;">입금 확인 후 캠페인이 시작됩니다.</p>
          <p style="color: #666;">문의: <strong>1833-6025</strong></p>
        </div>
      `
    };

    try {
      const info2 = await transporter.sendMail(oliveyoungEmail);
      results.push({ type: '올리브영', success: true, messageId: info2.messageId });
      console.log('올리브영 이메일 발송 성공:', info2.messageId);
    } catch (error) {
      results.push({ type: '올리브영', success: false, error: error.message });
      console.error('올리브영 이메일 발송 실패:', error);
    }

    // 3. 4주 챌린지 캠페인 테스트 메일
    const fourWeekEmail = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: testEmail,
      subject: '[CNEC] 4주 챌린지 캠페인 신청 완료',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">[CNEC] 4주 챌린지 캠페인 신청 완료</h2>
          <p><strong>테스트 회사</strong>님, 4주 챌린지 캠페인 신청이 접수되었습니다.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>캠페인:</strong> 4주 챌린지 테스트</p>
            <p style="margin: 10px 0;"><strong>캠페인 타입:</strong> 4주 챌린지</p>
            <p style="margin: 10px 0;"><strong>금액:</strong> <span style="font-size: 18px; color: #4CAF50;">3,300,000원</span></p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">입금 계좌</h3>
            <p style="margin: 5px 0;">IBK기업은행 047-122753-04-011</p>
            <p style="margin: 5px 0;">예금주: 주식회사 하우파파</p>
          </div>
          
          <p style="color: #666;">입금 확인 후 캠페인이 시작됩니다.</p>
          <p style="color: #666;">문의: <strong>1833-6025</strong></p>
        </div>
      `
    };

    try {
      const info3 = await transporter.sendMail(fourWeekEmail);
      results.push({ type: '4주 챌린지', success: true, messageId: info3.messageId });
      console.log('4주 챌린지 이메일 발송 성공:', info3.messageId);
    } catch (error) {
      results.push({ type: '4주 챌린지', success: false, error: error.message });
      console.error('4주 챌린지 이메일 발송 실패:', error);
    }

    // 4. 일본 캠페인 테스트 메일
    const japanEmail = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: testEmail,
      subject: '[CNEC] 일본 캠페인 신청 완료',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">[CNEC] 일본 캠페인 신청 완료</h2>
          <p><strong>テスト会社</strong>님, 일본 캠페인 신청이 접수되었습니다.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>캠페인:</strong> 일본 테스트 캠페인</p>
            <p style="margin: 10px 0;"><strong>캠페인 타입:</strong> 일본</p>
            <p style="margin: 10px 0;"><strong>금액:</strong> <span style="font-size: 18px; color: #4CAF50;">4,400,000원</span></p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">입금 계좌</h3>
            <p style="margin: 5px 0;">IBK기업은행 047-122753-04-011</p>
            <p style="margin: 5px 0;">예금주: 주식회사 하우파파</p>
          </div>
          
          <p style="color: #666;">입금 확인 후 캠페인이 시작됩니다.</p>
          <p style="color: #666;">文の問い合わせ: <strong>1833-6025</strong></p>
        </div>
      `
    };

    try {
      const info4 = await transporter.sendMail(japanEmail);
      results.push({ type: '일본', success: true, messageId: info4.messageId });
      console.log('일본 이메일 발송 성공:', info4.messageId);
    } catch (error) {
      results.push({ type: '일본', success: false, error: error.message });
      console.error('일본 이메일 발송 실패:', error);
    }

    // 5. 미국 캠페인 테스트 메일
    const usaEmail = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: testEmail,
      subject: '[CNEC] USA Campaign Application Completed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">[CNEC] USA Campaign Application Completed</h2>
          <p><strong>Test Company</strong>, your USA campaign application has been received.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Campaign:</strong> USA Test Campaign</p>
            <p style="margin: 10px 0;"><strong>Campaign Type:</strong> USA</p>
            <p style="margin: 10px 0;"><strong>Amount:</strong> <span style="font-size: 18px; color: #4CAF50;">$4,000</span></p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">Bank Account</h3>
            <p style="margin: 5px 0;">IBK Bank 047-122753-04-011</p>
            <p style="margin: 5px 0;">Account Holder: Howpapa Inc.</p>
          </div>
          
          <p style="color: #666;">Your campaign will start after payment confirmation.</p>
          <p style="color: #666;">Contact: <strong>1833-6025</strong></p>
        </div>
      `
    };

    try {
      const info5 = await transporter.sendMail(usaEmail);
      results.push({ type: '미국', success: true, messageId: info5.messageId });
      console.log('미국 이메일 발송 성공:', info5.messageId);
    } catch (error) {
      results.push({ type: '미국', success: false, error: error.message });
      console.error('미국 이메일 발송 실패:', error);
    }

    const allSuccess = results.every(r => r.success);

    return {
      statusCode: allSuccess ? 200 : 207,
      body: JSON.stringify({
        success: allSuccess,
        results: results,
        summary: `${results.filter(r => r.success).length}/${results.length} 이메일 발송 성공`
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
