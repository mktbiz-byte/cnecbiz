const { createClient } = require('@supabase/supabase-js');

/**
 * DB 스키마 확인 함수 - user_profiles, applications 테이블 구조를 각 리전별로 확인
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const results = {};

  // Region configs
  const regions = [
    {
      name: 'korea',
      url: process.env.VITE_SUPABASE_KOREA_URL,
      key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
    },
    {
      name: 'japan',
      url: process.env.VITE_SUPABASE_JAPAN_URL,
      key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
    },
    {
      name: 'us',
      url: process.env.VITE_SUPABASE_US_URL,
      key: process.env.SUPABASE_US_SERVICE_ROLE_KEY
    },
    {
      name: 'biz',
      url: process.env.VITE_SUPABASE_BIZ_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  ];

  for (const region of regions) {
    if (!region.url || !region.key) {
      results[region.name] = { error: 'Missing env vars', hasUrl: !!region.url, hasKey: !!region.key };
      continue;
    }

    try {
      const supabase = createClient(region.url, region.key);
      const regionResult = {};

      // 1. Check user_profiles table columns
      try {
        const { data: upColumns, error: upErr } = await supabase.rpc('exec_sql', {
          sql: `SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'user_profiles' AND table_schema = 'public'
                ORDER BY ordinal_position`
        });

        if (upErr) {
          // Fallback: Try direct query to get column names from a sample row
          const { data: sampleRow, error: sampleErr } = await supabase
            .from('user_profiles')
            .select('*')
            .limit(1);

          if (sampleErr) {
            regionResult.user_profiles = { error: sampleErr.message, code: sampleErr.code };
          } else if (sampleRow && sampleRow.length > 0) {
            regionResult.user_profiles = {
              columns: Object.keys(sampleRow[0]),
              sample: sampleRow[0]
            };
          } else {
            // Table exists but empty - try to get columns from empty select
            regionResult.user_profiles = { columns: [], note: 'Table exists but empty' };
          }
        } else {
          regionResult.user_profiles = { columns_detail: upColumns };
        }
      } catch (e) {
        regionResult.user_profiles = { exception: e.message };
      }

      // 2. Check applications table columns
      try {
        const { data: appSample, error: appErr } = await supabase
          .from('applications')
          .select('*')
          .limit(1);

        if (appErr) {
          // Try campaign_applications
          const { data: caData, error: caErr } = await supabase
            .from('campaign_applications')
            .select('*')
            .limit(1);

          regionResult.applications = { error: appErr.message, code: appErr.code };
          if (caData && caData.length > 0) {
            regionResult.campaign_applications = {
              columns: Object.keys(caData[0]),
              sample: caData[0]
            };
          } else if (caErr) {
            regionResult.campaign_applications = { error: caErr.message };
          }
        } else {
          regionResult.applications = {
            columns: appSample && appSample.length > 0 ? Object.keys(appSample[0]) : [],
            sample: appSample && appSample.length > 0 ? appSample[0] : null
          };

          // Also check campaign_applications
          const { data: caData, error: caErr } = await supabase
            .from('campaign_applications')
            .select('*')
            .limit(1);
          if (!caErr && caData) {
            regionResult.campaign_applications = {
              columns: caData.length > 0 ? Object.keys(caData[0]) : [],
              sample: caData.length > 0 ? caData[0] : null
            };
          }
        }
      } catch (e) {
        regionResult.applications = { exception: e.message };
      }

      // 3. Check how user_id links to user_profiles
      try {
        // Get a sample application with user_id
        const { data: appWithUser, error: awuErr } = await supabase
          .from('applications')
          .select('user_id, campaign_id, status')
          .not('user_id', 'is', null)
          .limit(3);

        if (!awuErr && appWithUser && appWithUser.length > 0) {
          const testUserId = appWithUser[0].user_id;

          // Try looking up by id
          const { data: byId, error: byIdErr } = await supabase
            .from('user_profiles')
            .select('id, user_id, name, email')
            .eq('id', testUserId)
            .maybeSingle();

          // Try looking up by user_id
          const { data: byUserId, error: byUserIdErr } = await supabase
            .from('user_profiles')
            .select('id, user_id, name, email')
            .eq('user_id', testUserId)
            .maybeSingle();

          regionResult.user_lookup_test = {
            test_user_id: testUserId,
            found_by_id: byId ? { id: byId.id, user_id: byId.user_id, name: byId.name } : null,
            found_by_id_error: byIdErr?.message || null,
            found_by_user_id: byUserId ? { id: byUserId.id, user_id: byUserId.user_id, name: byUserId.name } : null,
            found_by_user_id_error: byUserIdErr?.message || null
          };
        } else {
          // Try campaign_applications
          const { data: caWithUser, error: caErr } = await supabase
            .from('campaign_applications')
            .select('user_id, campaign_id, status')
            .not('user_id', 'is', null)
            .limit(3);

          if (!caErr && caWithUser && caWithUser.length > 0) {
            const testUserId = caWithUser[0].user_id;

            const { data: byId } = await supabase
              .from('user_profiles')
              .select('id, user_id, name, email')
              .eq('id', testUserId)
              .maybeSingle();

            const { data: byUserId } = await supabase
              .from('user_profiles')
              .select('id, user_id, name, email')
              .eq('user_id', testUserId)
              .maybeSingle();

            regionResult.user_lookup_test = {
              source: 'campaign_applications',
              test_user_id: testUserId,
              found_by_id: byId ? { id: byId.id, user_id: byId.user_id, name: byId.name } : null,
              found_by_user_id: byUserId ? { id: byUserId.id, user_id: byUserId.user_id, name: byUserId.name } : null
            };
          } else {
            regionResult.user_lookup_test = { note: 'No applications found to test' };
          }
        }
      } catch (e) {
        regionResult.user_lookup_test = { exception: e.message };
      }

      // 4. Count rows
      try {
        const { count: upCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
        regionResult.user_profiles_count = upCount;
      } catch (e) {}

      try {
        const { count: appCount } = await supabase.from('applications').select('*', { count: 'exact', head: true });
        regionResult.applications_count = appCount;
      } catch (e) {}

      try {
        const { count: caCount } = await supabase.from('campaign_applications').select('*', { count: 'exact', head: true });
        regionResult.campaign_applications_count = caCount;
      } catch (e) {}

      results[region.name] = regionResult;
    } catch (e) {
      results[region.name] = { error: e.message };
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, results }, null, 2)
  };
};
