import { supabaseBiz } from './src/lib/supabaseClients.js'

const checkRLS = async () => {
  console.log('Checking points_transactions table...')
  
  // 1. 로그인 확인
  const { data: { user } } = await supabaseBiz.auth.getUser()
  console.log('Current user:', user?.email)
  
  // 2. 회사 정보 확인
  const { data: company } = await supabaseBiz
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  console.log('Company:', company)
  
  // 3. points_transactions 테이블 접근 테스트
  const { data, error } = await supabaseBiz
    .from('points_transactions')
    .insert([{
      company_id: company.id,
      amount: -100,
      type: 'test',
      description: 'RLS 테스트'
    }])
    .select()
  
  console.log('Insert result:', data)
  console.log('Insert error:', error)
  
  // 4. 테스트 데이터 삭제
  if (data && data[0]) {
    await supabaseBiz
      .from('points_transactions')
      .delete()
      .eq('id', data[0].id)
    console.log('Test data deleted')
  }
}

checkRLS().catch(console.error)
