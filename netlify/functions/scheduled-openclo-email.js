const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 매일 오전 10시 KST
exports.handler = async (event) => {
  console.log('[scheduled-openclo-email] Starting...')

  try {
    const regions = ['korea', 'japan', 'us']
    const allResults = []

    for (const region of regions) {
      // STEP 1: 가입 여부 재확인
      await checkRegistrations(region)

      // STEP 2: 봇 설정에서 이메일 간격 조회
      const { data: configs } = await supabase
        .from('oc_bot_config')
        .select('email_interval_days, email_template_1, email_template_2, email_template_3')
        .eq('region', region)
        .limit(1)

      const intervalDays = configs?.[0]?.email_interval_days || 3
      const templates = configs?.[0] || {}

      // STEP 3: 발송 대상 추출
      const targets = await getEmailTargets(region, intervalDays)
      console.log(`[${region}] Email targets: ${targets.length}`)

      let sent = 0
      const maxDaily = 100

      for (const target of targets) {
        if (sent >= maxDaily) break

        try {
          const sequence = getNextSequence(target)
          const templateKey = `email_template_${sequence}`
          const template = templates[templateKey] || getDefaultTemplate(sequence, region)

          // Gemini로 개인화 (선택적)
          let subject, body
          try {
            const personalized = await personalizeEmail(target, template, sequence, region)
            subject = personalized.subject
            body = personalized.body
          } catch {
            // Gemini 실패 시 기본 템플릿 사용
            subject = getDefaultSubject(sequence, region)
            body = replaceVariables(template, target)
          }

          // 이메일 발송
          await sendEmail(target.email, subject, body)

          // 기록 업데이트
          const now = new Date().toISOString()
          const updateData = {
            contact_status: `email_${sequence}`
          }
          updateData[`email_${sequence}_sent_at`] = now

          await supabase.from('oc_creators').update(updateData).eq('id', target.id)

          await supabase.from('oc_contact_logs').insert({
            creator_id: target.id,
            type: 'email',
            direction: 'outbound',
            email_sequence: sequence,
            subject,
            content: body.substring(0, 500),
            result: 'sent'
          })

          sent++
          allResults.push({ region, creator: target.username, sequence, status: 'sent' })
        } catch (err) {
          console.error(`[scheduled-openclo-email] ${target.username} error:`, err.message)
          allResults.push({ region, creator: target.username, status: 'failed', error: err.message })
        }

        await sleep(2000) // 스팸 방지 딜레이
      }

      // KPI 업데이트
      if (sent > 0) {
        await updateDailyKPI(region, { emails_sent: sent })
      }

      // STEP 4: 3차 발송 후 7일 무응답 처리
      await handleNoResponse(region, intervalDays)
    }

    console.log('[scheduled-openclo-email] Complete:', allResults.length, 'processed')

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, results: allResults })
    }
  } catch (error) {
    console.error('[scheduled-openclo-email] Fatal error:', error)
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) }
  }
}

async function checkRegistrations(region) {
  // 미가입으로 표시된 크리에이터 중 이메일이 있는 경우 재확인
  const { data: unregistered } = await supabase
    .from('oc_creators')
    .select('id, email')
    .eq('region', region)
    .eq('is_registered', false)
    .not('email', 'is', null)

  if (!unregistered || unregistered.length === 0) return

  for (const creator of unregistered) {
    const { data: authUser } = await supabase.rpc('check_email_exists', { check_email: creator.email }).maybeSingle()

    // companies 테이블에서도 확인
    const { data: company } = await supabase
      .from('companies')
      .select('user_id')
      .eq('email', creator.email)
      .maybeSingle()

    if (company) {
      await supabase.from('oc_creators').update({
        is_registered: true,
        registered_user_id: company.user_id,
        contact_status: 'registered'
      }).eq('id', creator.id)

      await supabase.from('oc_contact_logs').insert({
        creator_id: creator.id,
        type: 'system',
        direction: 'inbound',
        result: 'registered',
        content: '가입 확인 - 이메일 발송 중단'
      })
    }
  }
}

async function getEmailTargets(region, intervalDays) {
  const now = new Date()
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000

  // 1차 대상: 미발송
  const { data: firstTargets } = await supabase
    .from('oc_creators')
    .select('*')
    .eq('region', region)
    .eq('status', 'approved')
    .eq('is_registered', false)
    .not('email', 'is', null)
    .eq('contact_status', 'none')
    .limit(50)

  // 2차 대상: 1차 발송 후 interval 경과
  const cutoff1 = new Date(now.getTime() - intervalMs).toISOString()
  const { data: secondTargets } = await supabase
    .from('oc_creators')
    .select('*')
    .eq('region', region)
    .eq('status', 'approved')
    .eq('is_registered', false)
    .not('email', 'is', null)
    .eq('contact_status', 'email_1')
    .lt('email_1_sent_at', cutoff1)
    .limit(50)

  // 3차 대상: 2차 발송 후 interval 경과
  const { data: thirdTargets } = await supabase
    .from('oc_creators')
    .select('*')
    .eq('region', region)
    .eq('status', 'approved')
    .eq('is_registered', false)
    .not('email', 'is', null)
    .eq('contact_status', 'email_2')
    .lt('email_2_sent_at', cutoff1)
    .limit(50)

  return [...(firstTargets || []), ...(secondTargets || []), ...(thirdTargets || [])]
}

function getNextSequence(creator) {
  if (creator.contact_status === 'none') return 1
  if (creator.contact_status === 'email_1') return 2
  if (creator.contact_status === 'email_2') return 3
  return 1
}

async function personalizeEmail(creator, template, sequence, region) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('No GEMINI_API_KEY')

  const langMap = { korea: '한국어', japan: '日本語', us: 'English' }
  const toneMap = { 1: '친절한 소개', 2: '리마인더 + 구체적 혜택', 3: '마지막 기회 + 특별 오퍼' }

  const prompt = `다음 크리에이터에게 보낼 ${sequence}차 이메일을 작성해. 언어: ${langMap[region]}
톤: ${toneMap[sequence]}

크리에이터 정보:
- 이름: ${creator.full_name || creator.username}
- 플랫폼: ${creator.platform}
- 팔로워: ${creator.followers}
- 카테고리: ${(creator.category || []).join(', ')}

기본 템플릿: ${template}

JSON으로 응답: {"subject": "이메일 제목", "body": "이메일 본문 (HTML)"}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
      })
    }
  )

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  return JSON.parse(text)
}

function replaceVariables(template, creator) {
  return template
    .replace(/\{\{creator_name\}\}/g, creator.full_name || creator.username)
    .replace(/\{\{platform\}\}/g, creator.platform)
    .replace(/\{\{category\}\}/g, (creator.category || []).join(', '))
    .replace(/\{\{followers\}\}/g, String(creator.followers))
}

function getDefaultSubject(sequence, region) {
  const subjects = {
    korea: { 1: '크넥(CNEC) 크리에이터 협업 제안', 2: '크넥에서 보내드린 협업 제안 확인하셨나요?', 3: '크넥 마지막 안내 - 특별 혜택' },
    japan: { 1: 'CNEC クリエイターコラボのご提案', 2: 'CNEC コラボ提案のリマインダー', 3: 'CNEC 最後のご案内' },
    us: { 1: 'CNEC Creator Collaboration Opportunity', 2: 'Following up on CNEC collaboration', 3: 'Last chance - CNEC special offer' }
  }
  return subjects[region]?.[sequence] || subjects.korea[sequence]
}

function getDefaultTemplate(sequence, region) {
  return `안녕하세요! 크넥(CNEC)에서 연락드립니다. (${sequence}차)`
}

async function sendEmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })

  await transporter.sendMail({
    from: `"크넥 CNEC" <${process.env.GMAIL_USER || process.env.GMAIL_EMAIL}>`,
    to,
    subject,
    html
  })
}

async function handleNoResponse(region, intervalDays) {
  const cutoff = new Date(Date.now() - (intervalDays + 7) * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('oc_creators')
    .update({ contact_status: 'no_response' })
    .eq('region', region)
    .eq('contact_status', 'email_3')
    .lt('email_3_sent_at', cutoff)
    .eq('is_registered', false)
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

async function updateDailyKPI(region, updates) {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase.from('oc_daily_kpi').select('*').eq('date', today).eq('region', region).maybeSingle()
  if (existing) {
    await supabase.from('oc_daily_kpi').update({
      emails_sent: (existing.emails_sent || 0) + (updates.emails_sent || 0)
    }).eq('id', existing.id)
  } else {
    await supabase.from('oc_daily_kpi').insert({ date: today, region, ...updates })
  }
}

module.exports.config = { schedule: '0 1 * * *' }
