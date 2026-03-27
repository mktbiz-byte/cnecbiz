let getBizClient, CORS_HEADERS, handleOptions, successResponse, errorResponse;

try {
  const lib = require('./lib/supabase');
  getBizClient = lib.getBizClient;
  CORS_HEADERS = lib.CORS_HEADERS;
  handleOptions = lib.handleOptions;
  successResponse = lib.successResponse;
  errorResponse = lib.errorResponse;
} catch (e) {
  console.error('[discovery-v104] Failed to load lib/supabase:', e.message);
}

const HEADERS = CORS_HEADERS || {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  // OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions ? handleOptions() : { statusCode: 204, headers: HEADERS, body: '' };
  }

  // GET → health check
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ts: Date.now() }) };
  }

  try {
    if (!getBizClient) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'lib/supabase load failed' }) };
    }

    const supabase = getBizClient();
    const body = JSON.parse(event.body || '{}');
    const { mode } = body;

    // ===== mode: stats =====
    if (mode === 'stats') {
      const [totalRes, emailRes, todayRes, fakeRes] = await Promise.all([
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('is_fake', false),
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('has_email', true).eq('is_fake', false),
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').gte('created_at', new Date().toISOString().split('T')[0]),
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('is_fake', true),
      ]);

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          total: totalRes.count ?? 0,
          hasEmail: emailRes.count ?? 0,
          today: todayRes.count ?? 0,
          fake: fakeRes.count ?? 0,
        })
      };
    }

    // ===== mode: list =====
    if (mode === 'list') {
      const { platform, tier, hasEmail, isFake, search, page = 1, limit = 50 } = body;

      let query = supabase
        .from('oc_creators')
        .select('id,username,platform,full_name,display_name,bio,followers,following,post_count,email,has_email,email_verified,email_verify_status,email_source,platform_url,website,tier,tier_score,is_fake,fake_score,fake_type,engagement_rate,kbeauty_score,contact_status,country,created_at', { count: 'exact' })
        .eq('region', 'korea');

      if (platform && platform !== 'all') query = query.eq('platform', platform);
      if (tier && tier !== 'all') query = query.eq('tier', tier);
      if (hasEmail === 'yes') query = query.eq('has_email', true);
      if (hasEmail === 'verified') query = query.eq('email_verified', true);
      if (hasEmail === 'no') query = query.eq('has_email', false);
      if (isFake === 'clean') query = query.eq('is_fake', false);
      if (isFake === 'fake') query = query.eq('is_fake', true);
      if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ data: data || [], total: count ?? 0, page, limit })
      };
    }

    // ===== mode: export =====
    if (mode === 'export') {
      const { platform, tier, hasEmail, isFake, search } = body;

      let query = supabase
        .from('oc_creators')
        .select('platform,username,full_name,display_name,email,email_verified,email_verify_status,followers,following,post_count,tier,tier_score,bio,website,platform_url,engagement_rate,is_fake,fake_type,contact_status,created_at')
        .eq('region', 'korea');

      if (platform && platform !== 'all') query = query.eq('platform', platform);
      if (tier && tier !== 'all') query = query.eq('tier', tier);
      if (hasEmail === 'yes') query = query.eq('has_email', true);
      if (hasEmail === 'verified') query = query.eq('email_verified', true);
      if (hasEmail === 'no') query = query.eq('has_email', false);
      if (isFake === 'clean') query = query.eq('is_fake', false);
      if (isFake === 'fake') query = query.eq('is_fake', true);
      if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);

      query = query.order('tier_score', { ascending: false, nullsFirst: false }).limit(10000);

      const { data, error } = await query;
      if (error) throw error;

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ data: data || [] })
      };
    }

    // ===== mode: distributions =====
    if (mode === 'distributions') {
      // 병렬로 모든 tier+platform 카운트 실행
      const tiers = ['S', 'A', 'B', 'C', 'D'];
      const platforms = ['instagram', 'youtube', 'tiktok', 'x', 'threads'];

      const allQueries = await Promise.all([
        ...tiers.map(t =>
          supabase.from('oc_creators').select('id', { count: 'exact', head: true })
            .eq('region', 'korea').eq('tier', t).eq('is_fake', false)
            .then(r => ({ type: 'tier', key: t, count: r.count ?? 0 }))
            .catch(() => ({ type: 'tier', key: t, count: 0 }))
        ),
        ...platforms.map(p =>
          supabase.from('oc_creators').select('id', { count: 'exact', head: true })
            .eq('region', 'korea').eq('platform', p).eq('is_fake', false)
            .then(r => ({ type: 'platform', key: p, count: r.count ?? 0 }))
            .catch(() => ({ type: 'platform', key: p, count: 0 }))
        ),
      ]);

      const tierDist = {};
      const platformDist = {};
      for (const q of allQueries) {
        if (q.type === 'tier') tierDist[q.key] = q.count;
        else platformDist[q.key] = q.count;
      }

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ tierDist, platformDist })
      };
    }

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid mode' }) };
  } catch (err) {
    console.error('[discovery-v104] Error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message || 'Unknown error' })
    };
  }
};
