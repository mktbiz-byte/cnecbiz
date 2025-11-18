/**
 * Email Service
 * 이메일 발송 서비스
 */

import { supabaseBiz } from '../lib/supabaseClients'

/**
 * 캠페인 선정 완료 이메일 발송
 * @param {Object} params
 * @param {string} params.creatorName - 크리에이터 이름
 * @param {string} params.creatorEmail - 수신 이메일
 * @param {string} params.campaignName - 캠페인명
 */
export async function sendCampaignSelectionEmail({ 
  creatorName, 
  creatorEmail, 
  campaignName 
}) {
  try {
    // Supabase Edge Function을 통한 이메일 발송
    // 또는 외부 이메일 서비스 API 사용 (SendGrid, AWS SES 등)
    
    const emailContent = {
      to: creatorEmail,
      subject: '[CNEC] 지원하신 캠페인 선정 완료',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
            [CNEC] 지원하신 캠페인 선정 완료
          </h2>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            <strong>${creatorName}</strong>님, 축하합니다! 지원하신 캠페인에 선정되셨습니다.
          </p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #333;">
              <strong>캠페인:</strong> ${campaignName}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #555; line-height: 1.6;">
            크리에이터 대시보드에서 캠페인 준비사항을 체크해 주세요.<br>
            촬영 가이드는 2~3일 이내 전달될 예정입니다.
          </p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ 중요:</strong> 사전 촬영 시 가이드 미준수로 재촬영될 수 있으니 가이드가 도착하면 촬영 시작해 주세요.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="font-size: 14px; color: #777; margin: 5px 0;">
              문의: 1833-6025
            </p>
            <p style="font-size: 12px; color: #999; margin: 5px 0;">
              본 메일은 발신 전용입니다. 문의사항은 고객센터로 연락 주세요.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://cnec-kr.netlify.app/my-page" 
               style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              대시보드 바로가기
            </a>
          </div>
        </div>
      `,
      text: `[CNEC] 지원하신 캠페인 선정 완료

${creatorName}님, 축하합니다! 지원하신 캠페인에 선정되셨습니다.

캠페인: ${campaignName}

크리에이터 대시보드에서 캠페인 준비사항을 체크해 주세요.
촬영 가이드는 2~3일 이내 전달될 예정입니다.

사전 촬영 시 가이드 미준수로 재촬영될 수 있으니 가이드가 도착하면 촬영 시작해 주세요.

문의: 1833-6025`
    }

    // Supabase Edge Function 호출 (실제 구현 필요)
    // 또는 직접 이메일 서비스 API 호출
    
    // 임시: 콘솔 로그
    console.log('Email would be sent:', emailContent)
    
    // 실제 구현 예시 (SendGrid 사용 시):
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: creatorEmail }]
        }],
        from: { email: 'noreply@cnec.co.kr', name: 'CNEC' },
        subject: emailContent.subject,
        content: [
          { type: 'text/plain', value: emailContent.text },
          { type: 'text/html', value: emailContent.html }
        ]
      })
    })
    
    if (response.ok) {
      return { success: true, message: '이메일이 발송되었습니다.' }
    } else {
      const error = await response.json()
      return { success: false, error: error.errors?.[0]?.message || 'Unknown error' }
    }
    */
    
    // 임시 반환 (실제 구현 전까지)
    return { 
      success: true, 
      message: '이메일 발송 준비 완료 (실제 발송은 이메일 서비스 설정 후 가능)',
      preview: emailContent
    }
    
  } catch (error) {
    console.error('Error sending email:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * 캠페인 가이드 전달 이메일 발송
 * @param {Object} params
 * @param {string} params.creatorName - 크리에이터 이름
 * @param {string} params.creatorEmail - 수신 이메일
 * @param {string} params.campaignName - 캠페인명
 * @param {string} params.guideUrl - 가이드 URL
 */
export async function sendCampaignGuideEmail({ 
  creatorName, 
  creatorEmail, 
  campaignName,
  guideUrl
}) {
  try {
    const emailContent = {
      to: creatorEmail,
      subject: `[CNEC] ${campaignName} 촬영 가이드 전달`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
            촬영 가이드 전달
          </h2>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            <strong>${creatorName}</strong>님, 안녕하세요.
          </p>
          
          <p style="font-size: 14px; color: #555; line-height: 1.6;">
            <strong>${campaignName}</strong> 캠페인의 촬영 가이드가 준비되었습니다.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${guideUrl}" 
               style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              촬영 가이드 확인하기
            </a>
          </div>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ 주의사항:</strong> 가이드를 꼼꼼히 확인하신 후 촬영을 시작해 주세요.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="font-size: 14px; color: #777; margin: 5px 0;">
              문의: 1833-6025
            </p>
          </div>
        </div>
      `
    }

    console.log('Guide email would be sent:', emailContent)
    
    return { 
      success: true, 
      message: '가이드 이메일 발송 준비 완료',
      preview: emailContent
    }
    
  } catch (error) {
    console.error('Error sending guide email:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}
