const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('환경변수:', {
  url: supabaseUrl ? '✅' : '❌',
  key: supabaseServiceKey ? '✅ (길이: ' + supabaseServiceKey.length + ')' : '❌'
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('환경변수가 없습니다!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select('id, briefs, trade_balance, matched_request_id')
    .is('matched_request_id', null)
    .limit(5);

  console.log('\n조회 결과:', data ? data.length + '건' : '없음');
  if (error) console.log('오류:', error);
  if (data && data.length > 0) {
    data.forEach((d, i) => console.log(`  ${i+1}. ${d.briefs}: ${d.trade_balance}원`));
  }
})();
