/**
 * 캠페인 상세 정보 수정 API (관리자/기업 사용)
 *
 * 프론트엔드 anon key로는 리전 DB(Korea/Japan 등) campaigns 테이블 UPDATE가
 * RLS에 의해 차단될 수 있어, service_role_key를 사용하는 서버사이드 API로 처리.
 *
 * body: { campaignId, region, updates, adminEmail }
 *   - campaignId: 캠페인 UUID
 *   - region: 'korea' | 'japan' | 'us' | 'taiwan' | 'biz'
 *   - updates: { key: value } 형태의 수정할 필드들
 *   - adminEmail: 요청자 이메일 (권한 체크용)
 */

const { getBizClient, getRegionClient, CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

// 수정 가능한 필드 화이트리스트
const ALLOWED_FIELDS = [
  // 일정
  'application_deadline', 'start_date', 'end_date',
  'content_submission_deadline', 'sns_upload_deadline',
  'video_deadline', 'sns_deadline',
  // 4주 챌린지 마감일
  'week1_deadline', 'week2_deadline', 'week3_deadline', 'week4_deadline',
  'week1_sns_deadline', 'week2_sns_deadline', 'week3_sns_deadline', 'week4_sns_deadline',
  // 올리브영 마감일
  'step1_deadline', 'step2_deadline',
  'step1_sns_deadline', 'step2_sns_deadline',
  // 캠페인 내용
  'requirements', 'creator_guide', 'description',
  // 상품 정보
  'product_name', 'product_description', 'product_link',
  'product_features', 'product_key_points',
  // 기타 수정 가능 필드
  'additional_details', 'additional_shooting_requests',
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const { campaignId, region, updates, adminEmail } = JSON.parse(event.body);

    if (!campaignId || !region || !updates || typeof updates !== 'object') {
      return errorResponse(400, '필수 파라미터가 누락되었습니다: campaignId, region, updates');
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(400, '수정할 내용이 없습니다.');
    }

    // 권한 체크: admin_users 테이블에서 확인
    const supabaseBiz = getBizClient();

    if (adminEmail) {
      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('id, role')
        .eq('email', adminEmail)
        .maybeSingle();

      if (!adminData) {
        // 관리자가 아니면 캠페인 소유자인지 확인
        const client = getRegionClient(region);
        const { data: campaign } = await client
          .from('campaigns')
          .select('company_email')
          .eq('id', campaignId)
          .single();

        if (!campaign) {
          return errorResponse(404, '캠페인을 찾을 수 없습니다.');
        }

        const isOwner = campaign.company_email === adminEmail;

        if (!isOwner) {
          return errorResponse(403, '이 캠페인을 수정할 권한이 없습니다.');
        }
      }
    }

    // 허용된 필드만 필터링
    const sanitizedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (ALLOWED_FIELDS.includes(key)) {
        sanitizedUpdates[key] = value;
      } else {
        console.warn(`[update-campaign-details] Blocked field: ${key}`);
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return errorResponse(400, '수정 가능한 필드가 없습니다.');
    }

    // 리전 DB에서 캠페인 업데이트 (service role key 사용)
    const client = getRegionClient(region);
    const { data, error } = await client
      .from('campaigns')
      .update(sanitizedUpdates)
      .eq('id', campaignId)
      .select('id')
      .single();

    if (error) {
      console.error('[update-campaign-details] Update error:', error);
      throw new Error(`캠페인 수정 실패: ${error.message}`);
    }

    if (!data) {
      return errorResponse(404, '캠페인을 찾을 수 없거나 수정되지 않았습니다.');
    }

    console.log(`[update-campaign-details] Campaign ${campaignId} updated in ${region}:`, Object.keys(sanitizedUpdates));

    return successResponse({
      success: true,
      message: '캠페인이 수정되었습니다.',
      updatedFields: Object.keys(sanitizedUpdates)
    });

  } catch (error) {
    console.error('[update-campaign-details] Error:', error);

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'update-campaign-details',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return errorResponse(500, error.message);
  }
};
