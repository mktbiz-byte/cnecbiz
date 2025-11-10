const { createClient } = require('@supabase/supabase-js');

// Supabase Admin 클라이언트
const supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 회사 프로필 업데이트 API
 * POST /update-company-profile
 * 
 * 스키마 캐시 문제를 우회하기 위해 서버 사이드에서 직접 업데이트
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const {
      userId,
      companyName,
      ceoName,
      businessType,
      businessCategory,
      companyPostalCode,
      companyAddress,
      notificationContactPerson,
      notificationEmail,
      notificationPhone,
      taxInvoiceEmail,
      taxInvoiceContactPerson,
      isAgency,
      emailNotificationConsent,
      smsNotificationConsent,
      marketingConsent
    } = JSON.parse(event.body);

    console.log('[update-company-profile] 프로필 업데이트 시작:', userId);

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '사용자 ID가 필요합니다.'
        })
      };
    }

    // 모든 필드를 한 번에 업데이트
    const updateData = {
      company_name: companyName,
      ceo_name: ceoName,
      business_type: businessType,
      business_category: businessCategory,
      company_postal_code: companyPostalCode,
      company_address: companyAddress,
      notification_contact_person: notificationContactPerson,
      notification_email: notificationEmail,
      notification_phone: notificationPhone,
      tax_invoice_email: taxInvoiceEmail,
      tax_invoice_contact_person: taxInvoiceContactPerson,
      is_agency: isAgency,
      email_notification_consent: emailNotificationConsent,
      sms_notification_consent: smsNotificationConsent,
      marketing_consent: marketingConsent,
      consent_date: new Date().toISOString(),
      profile_completed: true,
      profile_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[update-company-profile] 업데이트 데이터:', updateData);

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[update-company-profile] 업데이트 오류:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message
        })
      };
    }

    console.log('[update-company-profile] 업데이트 성공:', data.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data
      })
    };

  } catch (error) {
    console.error('[update-company-profile] 예상치 못한 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
