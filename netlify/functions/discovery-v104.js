const { getBizClient, CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
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

      return successResponse({
        total: totalRes.count || 0,
        hasEmail: emailRes.count || 0,
        today: todayRes.count || 0,
        fake: fakeRes.count || 0,
      });
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

      return successResponse({ data, total: count, page, limit });
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

      query = query.order('tier_score', { ascending: false }).limit(10000);

      const { data, error } = await query;
      if (error) throw error;

      return successResponse({ data });
    }

    // ===== mode: distributions =====
    if (mode === 'distributions') {
      const tierResults = {};
      for (const t of ['S', 'A', 'B', 'C', 'D']) {
        const { count } = await supabase.from('oc_creators')
          .select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('tier', t).eq('is_fake', false);
        tierResults[t] = count || 0;
      }

      const platformResults = {};
      for (const p of ['instagram', 'youtube', 'tiktok', 'x', 'threads']) {
        const { count } = await supabase.from('oc_creators')
          .select('id', { count: 'exact', head: true })
          .eq('region', 'korea').eq('platform', p).eq('is_fake', false);
        platformResults[p] = count || 0;
      }

      return successResponse({ tierDist: tierResults, platformDist: platformResults });
    }

    return errorResponse(400, 'Invalid mode');
  } catch (err) {
    console.error('[discovery-v104] Error:', err);

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'discovery-v104',
          errorMessage: err.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return errorResponse(500, err.message);
  }
};
