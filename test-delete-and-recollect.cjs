/**
 * Supabase bank_transactions 테이블 데이터 삭제 및 재수집 테스트
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAndRecollect() {
  console.log('🗑️  기존 데이터 삭제 중...');
  
  const { error: deleteError } = await supabaseAdmin
    .from('bank_transactions')
    .delete()
    .gte('trade_date', '20251104');
  
  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError);
    return;
  }
  
  console.log('✅ 삭제 완료!');
  console.log('🔄 scheduled-collect-transactions 함수를 수동으로 실행해주세요.');
  console.log('   URL: https://cnectotal.netlify.app/.netlify/functions/scheduled-collect-transactions');
}

deleteAndRecollect();
