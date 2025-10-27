import { getSupabaseClient } from './src/lib/supabaseClients.js'

const checkUSCreators = async () => {
  const usClient = getSupabaseClient('us')
  
  if (!usClient) {
    console.log('❌ US client not found')
    return
  }
  
  const { data, error, count } = await usClient
    .from('user_profiles')
    .select('*', { count: 'exact' })
  
  console.log('US Creators:')
  console.log('Count:', count)
  console.log('Data length:', data?.length)
  console.log('Error:', error)
  console.log('Sample data:', data?.slice(0, 3))
}

checkUSCreators()
