const { createClient } = require('@supabase/supabase-js');

/**
 * Korea DB에서 clean_video_url 데이터 가져오기
 * 프론트엔드에서 supabaseKorea가 초기화되지 않은 경우 사용
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

  try {
    const { campaign_id } = JSON.parse(event.body);

    if (!campaign_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'campaign_id is required' })
      };
    }

    // Korea Supabase 클라이언트 (Service Role Key 사용)
    const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
    const koreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!koreaUrl || !koreaKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Korea Supabase 환경변수 없음' })
      };
    }

    const supabaseKorea = createClient(koreaUrl, koreaKey);

    // applications 테이블에서 clean_video_url 가져오기
    const { data: applications, error: appError } = await supabaseKorea
      .from('applications')
      .select('id, user_id, applicant_name, clean_video_url, sns_upload_url, partnership_code, status')
      .eq('campaign_id', campaign_id)
      .not('clean_video_url', 'is', null);

    if (appError) {
      console.error('applications query error:', appError);
    }

    // video_submissions 테이블에서도 clean_video_url 가져오기
    const { data: videoSubmissions, error: vsError } = await supabaseKorea
      .from('video_submissions')
      .select('id, user_id, video_number, version, clean_video_url, status, submitted_at')
      .eq('campaign_id', campaign_id)
      .not('clean_video_url', 'is', null);

    if (vsError) {
      console.error('video_submissions query error:', vsError);
    }

    console.log(`[get-clean-video-urls] campaign: ${campaign_id}, applications with clean_video: ${applications?.length || 0}, video_submissions with clean_video: ${videoSubmissions?.length || 0}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        applications: applications || [],
        videoSubmissions: videoSubmissions || []
      })
    };

  } catch (error) {
    console.error('[get-clean-video-urls] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
