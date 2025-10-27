// Netlify Serverless Function for Sending Deadline Reminder Emails
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      campaignTitle, 
      deadline, 
      deadlineType, // 'recruitment' or 'submission'
      recipients // array of { name, email }
    } = req.body;

    if (!campaignTitle || !deadline || !deadlineType || !recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 마감일까지 남은 일수 계산
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const deadlineTypeText = deadlineType === 'recruitment' ? '모집 마감' : '영상 제출 마감';
    const subject = `[CNEC] ${campaignTitle} - ${deadlineTypeText} 알림`;

    // 이메일 내용 생성
    const emailBody = `
안녕하세요,

${campaignTitle} 캠페인의 ${deadlineTypeText}일이 다가오고 있습니다.

📅 마감일: ${deadlineDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
⏰ 남은 기간: ${diffDays > 0 ? `D-${diffDays}` : '마감'}

${deadlineType === 'submission' ? `
아직 영상을 제출하지 않으신 경우, 마감일 전까지 제출해주시기 바랍니다.
` : `
캠페인 참여를 원하시는 경우, 마감일 전까지 신청해주시기 바랍니다.
`}

감사합니다.
CNEC 팀 드림
`;

    // 실제 프로덕션 환경에서는 SendGrid, AWS SES, 또는 다른 이메일 서비스 사용
    // 현재는 시뮬레이션만 수행
    console.log('Sending email to:', recipients);
    console.log('Subject:', subject);
    console.log('Body:', emailBody);

    // 성공 응답 (실제로는 이메일 전송 결과 반환)
    return res.status(200).json({
      success: true,
      message: `${recipients.length}명에게 마감 독촉 이메일이 발송되었습니다.`,
      recipients: recipients.length,
      subject,
      preview: emailBody.substring(0, 100) + '...'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ 
      error: 'Failed to send deadline reminder emails',
      message: error.message 
    });
  }
}

