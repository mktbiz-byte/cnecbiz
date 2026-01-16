const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_JAPAN_URL,
      process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY
    );

    // 오늘 마감 캠페인 하나 조회 (모든 컬럼)
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', '9c21ec27-8519-4fc9-86b5-c016d51a32aa')
      .single();

    if (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: error.message }, null, 2)
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        success: true,
        campaignId: campaign.id,
        allColumns: Object.keys(campaign),
        campaignData: campaign
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: error.message }, null, 2)
    };
  }
};
