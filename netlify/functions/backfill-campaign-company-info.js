const { createClient } = require('@supabase/supabase-js');

/**
 * 기존 캠페인에 company_biz_id, company_phone 백필
 *
 * 사용법: GET /.netlify/functions/backfill-campaign-company-info
 */

exports.handler = async (event, context) => {
  console.log('=== 캠페인 기업정보 백필 시작 ===');

  // Supabase 클라이언트 설정
  const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const koreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_URL_BIZ;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY_BIZ || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!koreaUrl || !koreaKey || !bizUrl || !bizKey) {
    console.error('환경변수 누락');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables' })
    };
  }

  const supabaseKorea = createClient(koreaUrl, koreaKey);
  const supabaseBiz = createClient(bizUrl, bizKey);

  try {
    // 1. Korea DB에서 company_biz_id가 null인 캠페인 조회
    const { data: campaigns, error: campaignsError } = await supabaseKorea
      .from('campaigns')
      .select('id, company_email, company_id')
      .is('company_biz_id', null)
      .not('company_email', 'is', null);

    if (campaignsError) {
      console.error('캠페인 조회 오류:', campaignsError);
      throw campaignsError;
    }

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

    // 2. BIZ DB에서 모든 companies 조회
    const { data: companies, error: companiesError } = await supabaseBiz
      .from('companies')
      .select('id, email, phone, user_id');

    if (companiesError) {
      console.error('기업 정보 조회 오류:', companiesError);
      throw companiesError;
    }

    console.log(`BIZ DB companies: ${companies?.length || 0}개`);

    // 이메일 기반 매핑 생성
    const companyByEmail = {};
    const companyByUserId = {};

    companies?.forEach(company => {
      if (company.email) {
        companyByEmail[company.email.toLowerCase()] = company;
      }
      if (company.user_id) {
        companyByUserId[company.user_id] = company;
      }
    });

    // 3. 각 캠페인 업데이트
    let updatedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const campaign of campaigns) {
      // 이메일로 먼저 찾고, 없으면 user_id로 찾기
      let company = null;

      if (campaign.company_email) {
        company = companyByEmail[campaign.company_email.toLowerCase()];
      }

      if (!company && campaign.company_id) {
        company = companyByUserId[campaign.company_id];
      }

      if (company) {
        const updateData = {};

        if (company.id) {
          updateData.company_biz_id = company.id;
        }
        if (company.phone) {
          updateData.company_phone = company.phone;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabaseKorea
            .from('campaigns')
            .update(updateData)
            .eq('id', campaign.id);

          if (updateError) {
            console.error(`캠페인 ${campaign.id} 업데이트 실패:`, updateError);
            results.push({ id: campaign.id, status: 'error', error: updateError.message });
          } else {
            console.log(`캠페인 ${campaign.id} 업데이트 완료: biz_id=${company.id}, phone=${company.phone}`);
            results.push({ id: campaign.id, status: 'updated', company_biz_id: company.id, company_phone: company.phone });
            updatedCount++;
          }
        } else {
          results.push({ id: campaign.id, status: 'skipped', reason: 'no data to update' });
          skippedCount++;
        }
      } else {
        console.log(`캠페인 ${campaign.id}: 매칭되는 기업 정보 없음 (email: ${campaign.company_email})`);
        results.push({ id: campaign.id, status: 'skipped', reason: 'no matching company', email: campaign.company_email });
        skippedCount++;
      }
    }

    console.log(`=== 백필 완료: 업데이트 ${updatedCount}개, 스킵 ${skippedCount}개 ===`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '백필 완료',
        total: campaigns.length,
        updated: updatedCount,
        skipped: skippedCount,
        results: results.slice(0, 50) // 처음 50개 결과만 반환
      }, null, 2)
    };

  } catch (error) {
    console.error('백필 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
