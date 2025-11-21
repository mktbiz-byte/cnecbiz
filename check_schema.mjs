import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vluqhvuhykncicgvkosd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXFodnVoeWtuY2ljZ3Zrb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg2MzAsImV4cCI6MjA3Njg0NDYzMH0.ikEqdx6Le54YJUP-NROKg6EmeHJ4TbKkQ76pw29OQG8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// campaigns 테이블의 샘플 데이터 조회
const { data, error } = await supabase
  .from('campaigns')
  .select('campaign_type, package_type')
  .limit(10)

if (error) {
  console.error('Error:', JSON.stringify(error, null, 2))
} else {
  console.log('Sample campaign data:')
  console.log(JSON.stringify(data, null, 2))
  
  // 고유한 campaign_type 값들 추출
  const uniqueTypes = [...new Set(data.map(d => d.campaign_type).filter(Boolean))]
  console.log('\nUnique campaign_type values:', uniqueTypes)
}
