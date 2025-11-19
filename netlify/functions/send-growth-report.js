import { createClient } from '@supabase/supabase-js';

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.VITE_SUPABASE_BIZ_ANON_KEY
);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { 
      creatorId, 
      creatorEmail, 
      creatorName,
      channelName,
      platform,
      capiScore,
      capiGrade,
      capiAnalysis,
      sentBy,
      customMessage
    } = JSON.parse(event.body);

    if (!creatorId || !creatorEmail || !capiAnalysis) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Generate HTML email content
    const emailHtml = generateEmailHTML({
      creatorName,
      channelName,
      platform,
      capiScore,
      capiGrade,
      capiAnalysis,
      customMessage
    });

    // Send email using Resend API (or alternative email service)
    const emailResult = await sendEmail({
      to: creatorEmail,
      subject: `[CNEC] ${creatorName}님의 성장 가이드 리포트가 도착했습니다 🚀`,
      html: emailHtml
    });

    if (!emailResult.success) {
      throw new Error('Failed to send email: ' + emailResult.error);
    }

    // Save to report history
    const { data: reportData, error: reportError } = await supabaseBiz
      .from('creator_report_history')
      .insert([{
        creator_id: creatorId,
        creator_email: creatorEmail,
        creator_name: creatorName,
        report_type: 'growth_guide',
        capi_score: capiScore,
        capi_grade: capiGrade,
        capi_analysis: capiAnalysis,
        sent_by: sentBy,
        email_status: 'sent'
      }])
      .select()
      .single();

    if (reportError) {
      console.error('Error saving report history:', reportError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '리포트가 성공적으로 발송되었습니다.',
        reportId: reportData?.id,
        emailId: emailResult.messageId
      })
    };

  } catch (error) {
    console.error('Error sending growth report:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send growth report',
        details: error.message 
      })
    };
  }
};

function generateEmailHTML(data) {
  const {
    creatorName,
    channelName,
    platform,
    capiScore,
    capiGrade,
    capiAnalysis,
    customMessage
  } = data;

  const gradeDescriptions = {
    'S': '최상위 바이럴 크리에이터',
    'A': '프리미엄 인플루언서',
    'B': '안정적 성과 기대',
    'C': '보통',
    'D': '저조',
    'F': '매우 저조'
  };

  const gradeColors = {
    'S': '#9333ea',
    'A': '#3b82f6',
    'B': '#10b981',
    'C': '#f59e0b',
    'D': '#ef4444',
    'F': '#991b1b'
  };

  const contentScore = capiAnalysis.total_content_score || 0;
  const activityScore = capiScore - contentScore;

  const strengths = capiAnalysis.strengths || [];
  const weaknesses = capiAnalysis.weaknesses || [];

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CNEC 크리에이터 성장 가이드 리포트</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .score-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-left: 5px solid ${gradeColors[capiGrade] || '#667eea'};
      padding: 25px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .score-box h2 {
      margin: 0 0 15px 0;
      font-size: 20px;
      color: #333;
    }
    .grade-display {
      font-size: 48px;
      font-weight: bold;
      color: ${gradeColors[capiGrade] || '#667eea'};
      margin: 10px 0;
    }
    .score-details {
      font-size: 16px;
      line-height: 1.8;
    }
    .section {
      margin: 30px 0;
    }
    .section h3 {
      font-size: 20px;
      color: #333;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
    }
    .section h3::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 20px;
      background: #667eea;
      margin-right: 10px;
    }
    .strength-item, .weakness-item {
      background: #f8f9fa;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    .weakness-item {
      border-left-color: #f59e0b;
    }
    .item-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 8px;
      color: #333;
    }
    .item-description {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
    }
    .improvement-list {
      margin: 10px 0;
      padding-left: 20px;
    }
    .improvement-list li {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      margin: 20px 0;
      font-weight: bold;
      text-align: center;
    }
    .button:hover {
      opacity: 0.9;
    }
    .cta-section {
      background: #f0f9ff;
      padding: 25px;
      border-radius: 8px;
      margin: 30px 0;
      text-align: center;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
      border-top: 1px solid #e0e0e0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .custom-message {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 CNEC 크리에이터 성장 가이드 리포트</h1>
      <p>AI 기반 CAPI 분석 결과를 확인하세요</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        안녕하세요, <strong>${creatorName}</strong>님!
      </div>
      
      <p>
        CNEC에서 <strong>${channelName}</strong> 채널을 분석하여 성장 가이드 리포트를 준비했습니다.
        이 리포트는 AI 기반 CAPI(Content-Activity Performance Index) 분석을 통해 
        채널의 강점과 개선 포인트를 객관적으로 평가한 결과입니다.
      </p>
      
      ${customMessage ? `
      <div class="custom-message">
        <strong>💬 담당자 메시지</strong><br>
        ${customMessage}
      </div>
      ` : ''}
      
      <div class="score-box">
        <h2>📊 CAPI 종합 평가</h2>
        <div class="grade-display">${capiScore}점 (${capiGrade}급)</div>
        <div class="score-details">
          <strong>콘텐츠 제작 역량:</strong> ${contentScore}/70점<br>
          <strong>계정 활성도:</strong> ${activityScore}/30점<br>
          <strong>등급:</strong> ${capiGrade}급 (${gradeDescriptions[capiGrade] || ''})
        </div>
      </div>
      
      <div class="section">
        <h3>💪 주요 강점</h3>
        ${strengths.slice(0, 3).map(strength => `
          <div class="strength-item">
            <div class="item-title">${strength.title} (${strength.score}점)</div>
            <div class="item-description">${strength.description}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h3>🎯 개선 포인트</h3>
        ${weaknesses.slice(0, 2).map(weakness => `
          <div class="weakness-item">
            <div class="item-title">${weakness.title} (${weakness.score}점)</div>
            <div class="item-description">
              <strong>현재 상태:</strong> ${weakness.current}
            </div>
            <div class="item-description">
              <strong>개선 방안:</strong>
              <ul class="improvement-list">
                ${weakness.improvements.map(imp => `<li>${imp}</li>`).join('')}
              </ul>
            </div>
            <div class="item-description">
              <strong>예상 효과:</strong> ${weakness.expected_impact}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h3>📈 다음 단계</h3>
        <p>
          ${capiAnalysis.overall_assessment || '지속적인 콘텐츠 개선을 통해 더 높은 등급을 달성할 수 있습니다.'}
        </p>
      </div>
      
      <div class="cta-section">
        <h3 style="margin-top: 0;">💼 협업 기회</h3>
        <p>
          현재 <strong>${capiGrade}급</strong> 크리에이터로 평가되었으며,<br>
          다양한 브랜드 캠페인에 참여할 수 있는 자격을 갖추셨습니다.
        </p>
        <a href="https://cnec-kr.netlify.app" class="button">
          🚀 CNEC 플랫폼에서 캠페인 확인하기
        </a>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        이 리포트에 대한 문의사항이 있으시면 이 이메일에 회신해주세요.<br>
        CNEC 팀이 성심껏 도와드리겠습니다.
      </p>
    </div>
    
    <div class="footer">
      <p>
        이 리포트는 CNEC 담당자가 발송한 것입니다.<br>
        AI 기반 CAPI 분석 • 발송 일시: ${new Date().toLocaleString('ko-KR')}
      </p>
      <p style="margin-top: 15px;">
        © 2025 CNEC. All rights reserved.<br>
        <a href="https://cnectotal.netlify.app">cnectotal.netlify.app</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

async function sendEmail({ to, subject, html }) {
  // Using Resend API
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send');
    return { 
      success: true, 
      messageId: 'test-' + Date.now(),
      note: 'Email sending skipped (no API key)' 
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CNEC <noreply@cnectotal.com>',
        to: [to],
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email');
    }

    const result = await response.json();
    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}
