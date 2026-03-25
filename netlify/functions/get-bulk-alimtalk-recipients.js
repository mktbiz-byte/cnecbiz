/**
 * 단체 알림톡 수신자 목록 조회 API
 * Korea DB user_profiles + BIZ DB featured_creators에서 전화번호 보유 크리에이터를 가져옴
 * 전화번호 기준 중복 제거
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
);

function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.length < 10 || cleaned.length > 11) return null;
  return cleaned;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const phoneMap = new Map();

    // 1. Korea DB user_profiles (메인 소스 - 1000+명)
    let koreaCount = 0;
    try {
      // Supabase는 기본 1000건 제한 → 페이징
      let allProfiles = [];
      let page = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data, error } = await supabaseKorea
          .from('user_profiles')
          .select('id, name, phone, email, sms_consent')
          .not('phone', 'is', null)
          .neq('phone', '')
          .eq('sms_consent', true)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
          console.warn('[get-recipients] Korea DB error:', error.message);
          break;
        }
        if (!data || data.length === 0) break;
        allProfiles = allProfiles.concat(data);
        if (data.length < PAGE_SIZE) break;
        page++;
      }

      for (const p of allProfiles) {
        const phone = normalizePhone(p.phone);
        if (!phone) continue;
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, {
            phone,
            name: p.name || '',
            email: p.email || '',
            source: 'Korea DB'
          });
          koreaCount++;
        }
      }
      console.log(`[get-recipients] Korea DB: ${koreaCount}명`);
    } catch (e) {
      console.error('[get-recipients] Korea DB 조회 실패:', e.message);
    }

    // 2. BIZ DB featured_creators (보충)
    let bizCount = 0;
    try {
      const { data: featured, error } = await supabaseBiz
        .from('featured_creators')
        .select('id, name, phone, email');

      if (!error && featured) {
        for (const f of featured) {
          const phone = normalizePhone(f.phone);
          if (!phone) continue;
          if (!phoneMap.has(phone)) {
            phoneMap.set(phone, {
              phone,
              name: f.name || '',
              email: f.email || '',
              source: 'BIZ DB'
            });
            bizCount++;
          }
        }
      }
      console.log(`[get-recipients] BIZ DB 추가: ${bizCount}명`);
    } catch (e) {
      console.error('[get-recipients] BIZ DB 조회 실패:', e.message);
    }

    const recipients = Array.from(phoneMap.values());

    console.log(`[get-recipients] 최종: ${recipients.length}명 (Korea ${koreaCount} + BIZ ${bizCount})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        recipients,
        stats: {
          total: recipients.length,
          koreaDb: koreaCount,
          bizDb: bizCount
        }
      })
    };
  } catch (error) {
    console.error('[get-recipients] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
