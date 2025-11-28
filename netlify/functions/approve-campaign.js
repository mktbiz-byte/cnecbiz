/**
 * 캠페인 승인 API (관리자용)
 * 캠페인 상태를 'active'로 변경하고 기업에게 알림 발송
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 생성 함수
function getSupabaseClient(region) {
  let supabaseUrl, supabaseKey

  switch (region) {
    case 'korea':
      supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
      supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
      break
    case 'japan':
      supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
      supabaseKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      break
    case 'us':
      supabaseUrl = process.env.VITE_SUPABASE_US_URL
      supabaseKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
      break
    default:
      supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Biz DB 클라이언트
const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const { campaignId, region = 'korea', adminNote } = JSON.parse(event.body)

    console.log('[approve-campaign] Request:', { campaignId, region })

    // 입력 검증
    if (!campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인 ID가 필요합니다.'
        })
      }
    }

    // 지역별 Supabase 클라이언트 선택
    const supabaseRegion = getSupabaseClient(region)

    // 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await supabaseRegion
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('[approve-campaign] Campaign not found:', campaignError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인을 찾을 수 없습니다.'
        })
      }
    }

    console.log('[approve-campaign] Campaign found:', campaign.title)

    // 회사 정보 조회 (Biz DB에서)
    const { data: company, error: companyError } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', campaign.user_id)
      .single()

    if (companyError || !company) {
      console.error('[approve-campaign] Company not found:', companyError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '회사 정보를 찾을 수 없습니다.'
        })
      }
    }

    console.log('[approve-campaign] Company found:', company.company_name)

    // 캠페인 상태 업데이트
    const { error: updateError } = await supabaseRegion
      .from('campaigns')
      .update({
        status: 'active',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        admin_note: adminNote || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('[approve-campaign] Update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인 승인 중 오류가 발생했습니다.'
        })
      }
    }

    console.log('[approve-campaign] Campaign approved successfully')

    // 알림 발송 (카카오톡 + 이메일)
    try {
      const alimtalkApiKey = process.env.ALIMTALK_API_KEY
      const alimtalkUserId = process.env.ALIMTALK_USER_ID
      const alimtalkSenderKey = process.env.ALIMTALK_SENDER_KEY
      
      // 알림톡 템플릿 코드
      const templateCode = '025100001005' // [CNEC] 신청하신 캠페인 승인 완료
      
      // 날짜 포맷팅
      const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
      }

      const variables = {
        '회사명': company.company_name || '고객사',
        '캠페인명': campaign.title || campaign.campaign_name || '캠페인',
        '시작일': formatDate(campaign.recruitment_start_date || campaign.start_date),
        '마감일': formatDate(campaign.recruitment_deadline || campaign.end_date),
        '모집인원': (campaign.total_slots || campaign.target_creators || 0).toString()
      }

      console.log('[approve-campaign] Sending notification with variables:', variables)

      // 알림톡 전송
      if (alimtalkApiKey && alimtalkUserId && alimtalkSenderKey && company.phone) {
        console.log('[approve-campaign] Sending Alimtalk to:', company.phone)
        
        // 메시지 본문 (변수 직접 치환)
        const message = `[CNEC] 신청하신 캠페인 승인 완료

#{회사명}님, 신청하신 캠페인이 승인되어 크리에이터 모집이 시작되었습니다.

캠페인: #{캠페인명}
모집 기간: #{시작일} ~ #{마감일}
모집 인원: #{모집인원}명

관리자 페이지에서 진행 상황을 확인하실 수 있습니다.

문의: 1833-6025`
        
        const alimtalkParams = {
          apikey: alimtalkApiKey,
          userid: alimtalkUserId,
          senderkey: alimtalkSenderKey,
          tpl_code: templateCode,
          sender: '18336025',
          receiver_1: company.phone.replace(/-/g, ''),
          subject_1: '[CNEC] 신청하신 캠페인 승인 완료',
          message_1: message,
          button_1: JSON.stringify({
            button: [{
              name: '관리자 페이지',
              linkType: 'WL',
              linkTypeName: '웹링크',
              linkMo: 'https://cnectotal.netlify.app/company/campaigns',
              linkPc: 'https://cnectotal.netlify.app/company/campaigns'
            }]
          }),
          emtitle_1: '회사명',
          emoption_1: variables['회사명'],
          emtitle_2: '캠페인명',
          emoption_2: variables['캠페인명'],
          emtitle_3: '시작일',
          emoption_3: variables['시작일'],
          emtitle_4: '마감일',
          emoption_4: variables['마감일'],
          emtitle_5: '모집인원',
          emoption_5: variables['모집인원']
        }
        
        console.log('[approve-campaign] Alimtalk params:', JSON.stringify(alimtalkParams, null, 2))
        
        const alimtalkResponse = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams(alimtalkParams).toString()
        })

        const alimtalkResult = await alimtalkResponse.json()
        console.log('[approve-campaign] Alimtalk response:', JSON.stringify(alimtalkResult, null, 2))
        
        if (alimtalkResult.code !== 0) {
          console.error('[approve-campaign] Alimtalk failed:', alimtalkResult.message)
        }
      } else {
        console.log('[approve-campaign] Alimtalk credentials missing:', {
          hasApiKey: !!alimtalkApiKey,
          hasUserId: !!alimtalkUserId,
          hasSenderKey: !!alimtalkSenderKey,
          hasPhone: !!company.phone,
          phone: company.phone
        })
      }

      // 이메일 전송
      if (company.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #4F46E5; margin-bottom: 20px;">[CNEC] 신청하신 캠페인 승인 완료</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #333;">
                ${variables['회사명']}님, 신청하신 캠페인이 승인되어 크리에이터 모집이 시작되었습니다.
              </p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>캠페인:</strong> ${variables['캠페인명']}</p>
                <p style="margin: 10px 0;"><strong>모집 기간:</strong> ${variables['시작일']} ~ ${variables['마감일']}</p>
                <p style="margin: 10px 0;"><strong>모집 인원:</strong> ${variables['모집인원']}명</p>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                관리자 페이지에서 진행 상황을 확인하실 수 있습니다.
              </p>
              <a href="https://cnectotal.netlify.app/company/campaigns" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                관리자 페이지 바로가기
              </a>
              <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                문의: 1833-6025
              </p>
            </div>
          </div>
        `

        const gmailUser = process.env.GMAIL_USER
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

        if (gmailUser && gmailAppPassword) {
          const nodemailer = require('nodemailer')
          
          const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
              user: gmailUser,
              pass: gmailAppPassword
            }
          })

          await transporter.sendMail({
            from: `"CNEC" <${gmailUser}>`,
            to: company.email,
            subject: '[CNEC] 신청하신 캠페인 승인 완료',
            html: emailHtml
          })

          console.log('[approve-campaign] Email sent successfully')
        } else {
          console.log('[approve-campaign] Gmail credentials missing')
        }
      }

      console.log('[approve-campaign] Notification sent successfully')
    } catch (notifError) {
      console.error('[approve-campaign] Notification error:', notifError)
      // 알림 발송 실패해도 승인은 완료
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '캠페인이 승인되었습니다.'
      })
    }

  } catch (error) {
    console.error('[approve-campaign] Server error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error.message
      })
    }
  }
}
