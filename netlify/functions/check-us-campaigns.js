const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_US_URL,
      process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY
    );

    // 미국 active 캠페인 하나 조회 (모든 컬럼)
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .in('status', ['active', 'approved'])
      .limit(1);

    if (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: error.message }, null, 2)
      };
    }

    const campaign = campaigns && campaigns.length > 0 ? campaigns[0] : null;

    if (!campaign) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ message: 'No active campaigns found' }, null, 2)
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        success: true,
        campaignId: campaign.id,
        allColumns: Object.keys(campaign),
        hasCompanyId: 'company_id' in campaign,
        hasCompanyEmail: 'company_email' in campaign,
        companyIdValue: campaign.company_id || null,
        companyEmailValue: campaign.company_email || null,
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
