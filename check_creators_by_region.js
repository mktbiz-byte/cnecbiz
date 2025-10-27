import { getSupabaseClient } from './src/lib/supabaseClients.js'

const checkCreators = async () => {
  const regions = ['korea', 'japan', 'us', 'taiwan']
  
  for (const region of regions) {
    const client = getSupabaseClient(region)
    
    if (!client) {
      console.log(`❌ ${region}: No client`)
      continue
    }
    
    const { data, error, count } = await client
      .from('user_profiles')
      .select('*', { count: 'exact' })
    
    console.log(`\n${region.toUpperCase()}:`)
    console.log('  Count:', count || data?.length || 0)
    console.log('  Error:', error ? error.message : 'None')
    if (data && data.length > 0) {
      console.log('  Sample:', {
        name: data[0].name,
        email: data[0].email,
        instagram: data[0].instagram_url ? 'Yes' : 'No'
      })
    }
  }
}

checkCreators()
