import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('=== 크리에이터 관리 테이블 확인 ===\n');
  
  const tables = [
    'our_channels',
    'affiliated_creators',
    'channel_statistics',
    'channel_videos',
    'ai_reports'
  ];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ ${table}: 존재하지 않음 (${error.message})`);
    } else {
      console.log(`✅ ${table}: 존재함`);
    }
  }
}

checkTables().catch(console.error);
