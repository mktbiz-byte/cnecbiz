import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vluqhvuhykncicgvkosd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXFodnVoeWtuY2ljZ3Zrb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg2MzAsImV4cCI6MjA3Njg0NDYzMH0.ikEqdx6Le54YJUP-NROKg6EmeHJ4TbKkQ76pw29OQG8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 4주 챌린지 캠페인 조회
const { data, error } = await supabase
  .from('campaigns')
  .select('id, title, campaign_type, ai_generated_guide')
  .eq('campaign_type', '4week_challenge')
  .limit(5)

if (error) {
  console.error('Error:', JSON.stringify(error, null, 2))
} else {
  console.log('4주 챌린지 캠페인:')
  data.forEach(c => {
    console.log(`\nID: ${c.id}`)
    console.log(`제목: ${c.title}`)
    console.log(`AI 가이드 존재: ${c.ai_generated_guide ? 'Yes' : 'No'}`)
    if (c.ai_generated_guide) {
      const guidePreview = typeof c.ai_generated_guide === 'string' 
        ? c.ai_generated_guide.substring(0, 100) 
        : JSON.stringify(c.ai_generated_guide).substring(0, 100)
      console.log(`가이드 미리보기: ${guidePreview}...`)
    }
  })
}
