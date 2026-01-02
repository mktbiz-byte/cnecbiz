const { createClient } = require('@supabase/supabase-js');

/**
 * 기존 캠페인에 company_biz_id, company_phone 백필
 *
 * 사용법:
 * 1. 전체 백필 (BIZ companies 테이블 기준): GET /.netlify/functions/backfill-campaign-company-info
 * 2. 특정 이메일의 모든 캠페인 폰번호 업데이트: POST { "email": "xxx@xxx.com", "phone": "010-1234-5678" }
 * 3. 특정 캠페인 폰번호 업데이트: POST { "campaign_id": "uuid", "phone": "010-1234-5678" }
 * 4. 특정 이메일의 모든 캠페인 biz_id도 함께 업데이트: POST { "email": "xxx@xxx.com", "phone": "010-1234-5678", "company_biz_id": "uuid" }
 */

exports.handler = async (event, context) => {
  console.log('=== 캠페인 기업정보 백필 ===');
  console.log('Method:', event.httpMethod);

  // Supabase 클라이언트 설정
  const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const koreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_URL_BIZ;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY_BIZ || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!koreaUrl || !koreaKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Korea Supabase environment variables' })
    };
  }

  const supabaseKorea = createClient(koreaUrl, koreaKey);
  const supabaseBiz = bizUrl && bizKey ? createClient(bizUrl, bizKey) : null;

  try {
    // POST: 특정 캠페인/이메일 폰번호 업데이트
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { email, phone, campaign_id, company_biz_id } = body;

      if (!phone && !company_biz_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'phone 또는 company_biz_id가 필요합니다' })
        };
      }

      const updateData = {};
      if (phone) updateData.company_phone = phone;
      if (company_biz_id) updateData.company_biz_id = company_biz_id;

      // 특정 캠페인 업데이트
      if (campaign_id) {
        const { data, error } = await supabaseKorea
          .from('campaigns')
          .update(updateData)
          .eq('id', campaign_id)
          .select('id, title, company_email, company_phone, company_biz_id');

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: `캠페인 ${campaign_id} 업데이트 완료`,
            updated: data
          })
        };
      }

      // 특정 이메일의 모든 캠페인 업데이트
      if (email) {
        const { data, error } = await supabaseKorea
          .from('campaigns')
          .update(updateData)
          .eq('company_email', email)
          .select('id, title, company_email, company_phone, company_biz_id');

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: `${email}의 캠페인 ${data?.length || 0}개 업데이트 완료`,
            updated: data
          })
        };
      }

      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'email 또는 campaign_id가 필요합니다' })
      };
    }

    // GET: 전체 백필 (BIZ companies 테이블 기준)
    if (!supabaseBiz) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'BIZ Supabase 환경변수가 없어 전체 백필 불가' })
      };
    }

    // 1. Korea DB에서 company_biz_id가 null인 캠페인 조회
    const { data: campaigns, error: campaignsError } = await supabaseKorea
      .from('campaigns')
      .select('id, company_email, company_id')
      .is('company_biz_id', null)
      .not('company_email', 'is', null);

    if (campaignsError) throw campaignsError;

    console.log(`백필 대상 캠페인: ${campaigns?.length || 0}개`);

    if (!campaigns || campaigns.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '백필 대상 캠페인이 없습니다.',
          updated: 0
        })
      };
    }

    // 2. BIZ DB에서 모든 companies 조회 (phone, notification_phone 모두)
    const { data: companies, error: companiesError } = await supabaseBiz
      .from('companies')
      .select('id, email, phone, notification_phone, user_id');

    if (companiesError) throw companiesError;

    // 이메일/user_id 기반 매핑 (phone이 없으면 notification_phone 사용)
    const companyByEmail = {};
    const companyByUserId = {};

    companies?.forEach(company => {
      const companyWithPhone = {
        ...company,
        phone: company.phone || company.notification_phone
      };
      if (company.email) companyByEmail[company.email.toLowerCase()] = companyWithPhone;
      if (company.user_id) companyByUserId[company.user_id] = companyWithPhone;
    });

    // 3. 각 캠페인 업데이트
    let updatedCount = 0;
    let skippedCount = 0;

    for (const campaign of campaigns) {
      let company = null;

      if (campaign.company_email) {
        company = companyByEmail[campaign.company_email.toLowerCase()];
      }
      if (!company && campaign.company_id) {
        company = companyByUserId[campaign.company_id];
      }

      if (company && company.id) {
        const updateData = { company_biz_id: company.id };
        if (company.phone) updateData.company_phone = company.phone;

        const { error } = await supabaseKorea
          .from('campaigns')
          .update(updateData)
          .eq('id', campaign.id);

        if (!error) {
          updatedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '백필 완료',
        total: campaigns.length,
        updated: updatedCount,
        skipped: skippedCount
      })
    };

  } catch (error) {
    console.error('오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
