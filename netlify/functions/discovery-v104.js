const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ts: Date.now() }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { mode } = body;

    // ===== mode: stats =====
    if (mode === 'stats') {
      const [totalRes, emailRes, todayRes, fakeRes, koreanRes, enrichedRes] = await Promise.all([
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('is_fake', false),
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('has_email', true).eq('is_fake', false),
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').gte('created_at', new Date().toISOString().split('T')[0]),
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('is_fake', true),
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('is_korean', true),
        supabase.from('oc_creators').select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('profile_enriched', true),
      ]);

      return {
        statusCode: 200, headers: HEADERS,
        body: JSON.stringify({
          total: totalRes.count ?? 0,
          hasEmail: emailRes.count ?? 0,
          today: todayRes.count ?? 0,
          fake: fakeRes.count ?? 0,
          korean: koreanRes.count ?? 0,
          enriched: enrichedRes.count ?? 0,
        })
      };
    }

    // ===== mode: list =====
    if (mode === 'list') {
      const { platform, tier, hasEmail, isFake, isKorean, search, page = 1, limit = 50 } = body;

      let query = supabase
        .from('oc_creators')
        .select('id,username,platform,full_name,display_name,bio,followers,following,post_count,reels_count,avg_views,avg_likes,avg_comments,upload_frequency_days,ad_post_count,ad_ratio,engagement_rate,email,has_email,email_verified,email_source,platform_url,website,tier,tier_score,is_fake,fake_score,is_korean,korean_score,profile_enriched,has_verified_badge,contact_status,top_hashtags,created_at', { count: 'exact' })
        .eq('region', 'korea');

      if (platform && platform !== 'all') query = query.eq('platform', platform);
      if (tier && tier !== 'all') query = query.eq('tier', tier);
      if (hasEmail === 'yes') query = query.eq('has_email', true);
      if (hasEmail === 'verified') query = query.eq('email_verified', true);
      if (hasEmail === 'no') query = query.eq('has_email', false);
      if (isFake === 'clean') query = query.eq('is_fake', false);
      if (isFake === 'fake') query = query.eq('is_fake', true);
      if (isKorean === 'yes') query = query.eq('is_korean', true);
      if (isKorean === 'no') query = query.eq('is_korean', false);
      if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);

      const from = (page - 1) * limit;
      query = query.order('created_at', { ascending: false }).range(from, from + limit - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        statusCode: 200, headers: HEADERS,
        body: JSON.stringify({ data: data || [], total: count ?? 0, page, limit })
      };
    }

    // ===== mode: detail =====
    if (mode === 'detail') {
      const { creatorId } = body;
      if (!creatorId) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'creatorId required' }) };
      }

      const { data: profile, error } = await supabase
        .from('oc_creator_profiles')
        .select('biography,profile_pic_url,business_category,business_email,business_phone,is_korean,korean_score,korean_signals,top_hashtags,recent_captions,reels_count,posts_count_regular,avg_views,avg_likes,avg_comments,upload_frequency_days,ad_post_count,ad_ratio,enriched_at')
        .eq('creator_id', creatorId)
        .order('enriched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        statusCode: 200, headers: HEADERS,
        body: JSON.stringify({ profile: profile || null })
      };
    }

    // ===== mode: export =====
    if (mode === 'export') {
      const { platform, tier, hasEmail, isFake, isKorean, search } = body;

      let query = supabase
        .from('oc_creators')
        .select('platform,username,full_name,display_name,email,email_verified,followers,following,post_count,reels_count,avg_views,avg_comments,upload_frequency_days,ad_post_count,ad_ratio,engagement_rate,tier,tier_score,is_korean,korean_score,bio,website,platform_url,contact_status,created_at')
        .eq('region', 'korea');

      if (platform && platform !== 'all') query = query.eq('platform', platform);
      if (tier && tier !== 'all') query = query.eq('tier', tier);
      if (hasEmail === 'yes') query = query.eq('has_email', true);
      if (hasEmail === 'verified') query = query.eq('email_verified', true);
      if (hasEmail === 'no') query = query.eq('has_email', false);
      if (isFake === 'clean') query = query.eq('is_fake', false);
      if (isFake === 'fake') query = query.eq('is_fake', true);
      if (isKorean === 'yes') query = query.eq('is_korean', true);
      if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);

      query = query.order('tier_score', { ascending: false, nullsFirst: false }).limit(10000);

      const { data, error } = await query;
      if (error) throw error;

      return {
        statusCode: 200, headers: HEADERS,
        body: JSON.stringify({ data: data || [] })
      };
    }

    // ===== mode: distributions =====
    if (mode === 'distributions') {
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
        statusCode: 200, headers: HEADERS,
        body: JSON.stringify({ tierDist, platformDist })
      };
    }

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid mode' }) };
  } catch (err) {
    console.error('[discovery-v104] Error:', err);
    return {
      statusCode: 500, headers: HEADERS,
      body: JSON.stringify({ error: err.message || 'Unknown error' })
    };
  }
};
