export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, html } = req.body

  try {
    // Netlify Functions에서 이메일 전송
    // 실제 구현은 SendGrid, AWS SES 등을 사용
    
    // 임시로 콘솔에 로그
    console.log('Email to send:', { to, subject, html })
    
    // 성공 응답
    res.status(200).json({ success: true, message: 'Email sent successfully' })
  } catch (error) {
    console.error('Email sending error:', error)
    res.status(500).json({ error: 'Failed to send email' })
  }
}
