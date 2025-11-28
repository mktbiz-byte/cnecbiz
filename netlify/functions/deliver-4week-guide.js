/**
 * 4주 챌린지 가이드 전달 + 알림톡/이메일 발송
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNotification, generateEmailHtml } = require('./send-notification-helper')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const { campaignId, weekNumber, region = 'korea' } = JSON.parse(event.body)

    if (!campaignId || !weekNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'campaignId and weekNumber are required' })
      }
    }

    // Supabase 클라이언트 초기화
    const supabaseUrl = region === 'korea' 
      ? process.env.VITE_SUPABASE_URL_KOREA
      : region === 'japan'
      ? process.env.VITE_SUPABASE_URL_JAPAN
      : process.env.VITE_SUPABASE_URL_US

    const supabaseKey = region === 'korea'
      ? process.env.VITE_SUPABASE_ANON_KEY_KOREA
      : region === 'japan'
      ? process.env.VITE_SUPABASE_ANON_KEY_JAPAN
      : process.env.VITE_SUPABASE_ANON_KEY_US

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 캠페인 정보 가져오기
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found')
    }

    // 2. 주차별 가이드 및 마감일 가져오기
    const weekGuide = campaign.challenge_weekly_guides?.[`week${weekNumber}`]
    const weekDeadline = campaign[`week${weekNumber}_deadline`]

    if (!weekGuide) {
      throw new Error(`Week ${weekNumber} guide not found`)
    }

    // 3. 선정된 참여자 목록 가져오기
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select(`
        id,
        user_id,
        user_profiles!inner(
          name,
          email,
          phone
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'selected')

    if (participantsError) {
      throw new Error('Failed to fetch participants: ' + participantsError.message)
    }

    if (!participants || participants.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'No participants to notify',
          successCount: 0,
          errorCount: 0
        })
      }
    }

    // 4. 각 참여자에게 알림 발송
    let successCount = 0
    let errorCount = 0
    const errors = []

    for (const participant of participants) {
      try {
        const profile = participant.user_profiles
        
        // 알림톡 + 이메일 발송
        await sendNotification({
          receiverNum: profile.phone,
          receiverEmail: profile.email,
          receiverName: profile.name,
          templateCode: '025100001012', // 가이드 전달 템플릿 (크리에이터용)
          variables: {
            '크리에이터명': profile.name,
            '캠페인명': `${campaign.title} (${weekNumber}주차)`,
            '제출기한': weekDeadline ? new Date(weekDeadline).toLocaleDateString('ko-KR') : '미정'
          },
          emailSubject: `[CNEC] ${campaign.title} ${weekNumber}주차 촬영 가이드 전달`,
          emailHtml: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CNEC</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">글로벌 인플루언서 마케팅 플랫폼</p>
              </div>
              
              <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1f2937; margin-top: 0;">📸 ${weekNumber}주차 촬영 가이드 전달</h2>
                
                <p style="color: #4b5563; line-height: 1.6;">
                  안녕하세요, ${profile.name}님!<br><br>
                  <strong>${campaign.title}</strong> 캠페인의 <strong>${weekNumber}주차 촬영 가이드</strong>가 전달되었습니다.
                </p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">📋 캠페인 정보</h3>
                  <ul style="color: #4b5563; line-height: 1.8; margin: 0; padding-left: 20px; list-style: none;">
                    <li style="margin-bottom: 10px;"><strong>캠페인:</strong> ${campaign.title}</li>
                    <li style="margin-bottom: 10px;"><strong>주차:</strong> <span style="color: #667eea; font-weight: bold;">${weekNumber}주차</span></li>
                    <li><strong>제출 기한:</strong> <span style="color: #ef4444; font-weight: bold;">${weekDeadline ? new Date(weekDeadline).toLocaleDateString('ko-KR') : '미정'}</span></li>
                  </ul>
                </div>
                
                <p style="color: #4b5563; line-height: 1.6;">
                  대시보드에서 상세 가이드를 확인하시고, 기한 내에 영상을 제출해 주세요.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://cnec-kr.netlify.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">가이드 확인하기</a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  문의사항이 있으시면 <a href="tel:1833-6025" style="color: #667eea; text-decoration: none;">1833-6025</a>로 연락주세요.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>© 2025 CNEC. All rights reserved.</p>
              </div>
            </div>
          `
        })

        // 참여자 테이블 업데이트 (가이드 전달 기록)
        await supabase
          .from('participants')
          .update({
            [`week${weekNumber}_guide_delivered`]: true,
            [`week${weekNumber}_guide_delivered_at`]: new Date().toISOString()
          })
          .eq('id', participant.id)

        successCount++
      } catch (error) {
        console.error(`Error sending notification to ${profile.name}:`, error)
        errorCount++
        errors.push({
          participant: profile.name,
          error: error.message
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      })
    }

  } catch (error) {
    console.error('Error in deliver-4week-guide:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
