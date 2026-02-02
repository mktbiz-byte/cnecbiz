import { createClient } from '@supabase/supabase-js'

const supabaseBiz = createClient(
  'https://hbymozdhjseqebpomjsp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieW1vemRoanNlcWVicG9tanNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjA5NTgsImV4cCI6MjA3NjYzNjk1OH0.T7Dn0oYWTqoJTDDgWLGMEJzwFpMXNXtGgvQVB6aWCkI'
)

const supabaseKorea = createClient(
  'https://vluqhvuhykncicgvkosd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXFodnVoeWtuY2ljZ3Zrb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg2MzAsImV4cCI6MjA3Njg0NDYzMH0.ikEqdx6Le54YJUP-NROKg6EmeHJ4TbKkQ76pw29OQG8'
)

async function check() {
  // BIZ DB에서 TAE743 캠페인 찾기
  console.log('=== BIZ DB 체크 ===')
  const { data: bizCampaigns, error: bizError } = await supabaseBiz
    .from('campaigns')
    .select('id, title, campaign_type')
    .ilike('title', '%TAE743%')

  if (bizError) console.log('BIZ 에러:', bizError.message)
  console.log('BIZ 캠페인:', bizCampaigns?.length || 0, '개')
  bizCampaigns?.forEach(c => console.log(`- ID: ${c.id}, title: ${c.title}, type: ${c.campaign_type}`))

  // Korea DB에서 TAE743 캠페인 찾기
  console.log('\n=== KOREA DB 체크 ===')
  const { data: koreaCampaigns, error: koreaError } = await supabaseKorea
    .from('campaigns')
    .select('id, title, campaign_type')
    .ilike('title', '%TAE743%')

  if (koreaError) console.log('Korea 에러:', koreaError.message)
  console.log('Korea 캠페인:', koreaCampaigns?.length || 0, '개')
  koreaCampaigns?.forEach(c => console.log(`- ID: ${c.id}, title: ${c.title}, type: ${c.campaign_type}`))

  // 4주 챌린지 타입 캠페인 확인
  console.log('\n=== 4주 챌린지 캠페인 (BIZ) ===')
  const { data: fourWeekBiz } = await supabaseBiz
    .from('campaigns')
    .select('id, title, campaign_type')
    .eq('campaign_type', '4week_challenge')
    .limit(5)

  fourWeekBiz?.forEach(c => console.log(`- ID: ${c.id}, title: ${c.title}`))

  console.log('\n=== 4주 챌린지 캠페인 (Korea) ===')
  const { data: fourWeekKorea } = await supabaseKorea
    .from('campaigns')
    .select('id, title, campaign_type')
    .eq('campaign_type', '4week_challenge')
    .limit(5)

  fourWeekKorea?.forEach(c => console.log(`- ID: ${c.id}, title: ${c.title}`))

  // video_submissions 테이블 구조 확인
  console.log('\n=== video_submissions 테이블 구조 (BIZ) ===')
  const { data: bizSubs, error: bizSubError } = await supabaseBiz
    .from('video_submissions')
    .select('*')
    .limit(1)

  if (bizSubError) {
    console.log('BIZ video_submissions 에러:', bizSubError.message)
  } else if (bizSubs && bizSubs.length > 0) {
    console.log('컬럼 목록:', Object.keys(bizSubs[0]).join(', '))
  }

  console.log('\n=== video_submissions 테이블 구조 (Korea) ===')
  const { data: koreaSubs, error: koreaSubError } = await supabaseKorea
    .from('video_submissions')
    .select('*')
    .limit(1)

  if (koreaSubError) {
    console.log('Korea video_submissions 에러:', koreaSubError.message)
  } else if (koreaSubs && koreaSubs.length > 0) {
    console.log('컬럼 목록:', Object.keys(koreaSubs[0]).join(', '))
  }

  // 4주 챌린지 캠페인의 video_submissions 상세
  if (fourWeekBiz && fourWeekBiz.length > 0) {
    const campId = fourWeekBiz[0].id
    console.log(`\n=== ${fourWeekBiz[0].title}의 video_submissions (BIZ) ===`)

    const { data: subs } = await supabaseBiz
      .from('video_submissions')
      .select('*')
      .eq('campaign_id', campId)
      .limit(10)

    console.log('총 개수:', subs?.length || 0)
    subs?.forEach(s => {
      console.log(`- user: ${s.user_id?.substring(0,8)}..., status: ${s.status}, week_number: ${s.week_number}, video_number: ${s.video_number}, step: ${s.step}`)
    })
  }

  if (fourWeekKorea && fourWeekKorea.length > 0) {
    const campId = fourWeekKorea[0].id
    console.log(`\n=== ${fourWeekKorea[0].title}의 video_submissions (Korea) ===`)

    const { data: subs } = await supabaseKorea
      .from('video_submissions')
      .select('*')
      .eq('campaign_id', campId)
      .limit(10)

    console.log('총 개수:', subs?.length || 0)
    subs?.forEach(s => {
      console.log(`- user: ${s.user_id?.substring(0,8)}..., status: ${s.status}, week_number: ${s.week_number}, video_number: ${s.video_number}, step: ${s.step}`)
    })
  }
}

check().catch(console.error)
