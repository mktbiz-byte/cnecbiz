/**
 * 크리에이터 개별 마감일 수정 API
 * 관리자가 개별 크리에이터의 마감일을 연장/수정할 수 있음
 *
 * POST /.netlify/functions/update-creator-deadline
 * Body: {
 *   region: 'korea',
 *   applicationId: 'uuid',
 *   customDeadline: '2026-02-05',  // 새 마감일
 *   weekNumber: 2,  // 4주 챌린지의 경우 주차 (선택)
 *   reason: '개인 사정으로 연장'  // 연장 사유 (선택)
 * }
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { region, applicationId, customDeadline, weekNumber, reason } = JSON.parse(event.body || '{}');

    if (!region || !applicationId || !customDeadline) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'region, applicationId, customDeadline are required'
        })
      };
    }

    // 지역별 Supabase 설정
    const regionConfigs = {
      korea: {
        url: process.env.VITE_SUPABASE_KOREA_URL,
        key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY
      },
      japan: {
        url: process.env.VITE_SUPABASE_JAPAN_URL,
        key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY
      },
      us: {
        url: process.env.VITE_SUPABASE_US_URL,
        key: process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY
      },
      biz: {
        url: process.env.VITE_SUPABASE_BIZ_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_BIZ_ANON_KEY
      }
    };

    const config = regionConfigs[region];
    if (!config || !config.url || !config.key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: `Invalid region: ${region}` })
      };
    }

    const supabase = createClient(config.url, config.key);

    // 기존 application 조회
    const { data: app, error: fetchError } = await supabase
      .from('applications')
      .select('id, campaign_id, user_id, custom_deadlines')
      .eq('id', applicationId)
      .single();

    if (fetchError || !app) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Application not found: ' + (fetchError?.message || 'Unknown')
        })
      };
    }

    // custom_deadlines 업데이트 (JSONB 필드)
    // 형식: { "1": "2026-02-05", "2": "2026-02-10", "default": "2026-02-01" }
    const existingDeadlines = app.custom_deadlines || {};
    const key = weekNumber ? String(weekNumber) : 'default';

    const newDeadlines = {
      ...existingDeadlines,
      [key]: customDeadline,
      [`${key}_reason`]: reason || '',
      [`${key}_updated_at`]: new Date().toISOString()
    };

    // 업데이트
    const { error: updateError } = await supabase
      .from('applications')
      .update({ custom_deadlines: newDeadlines })
      .eq('id', applicationId);

    if (updateError) {
      // custom_deadlines 컬럼이 없을 수 있음 - 다른 방법 시도
      console.log('custom_deadlines 업데이트 실패, notes 필드 시도:', updateError.message);

      // notes 필드에 저장 시도
      const { data: appWithNotes } = await supabase
        .from('applications')
        .select('notes')
        .eq('id', applicationId)
        .single();

      const existingNotes = appWithNotes?.notes || '';
      const deadlineNote = `\n[마감일 연장] ${key === 'default' ? '' : key + '주차 '}${customDeadline} (${reason || '사유 미입력'}) - ${new Date().toISOString()}`;

      const { error: notesError } = await supabase
        .from('applications')
        .update({ notes: existingNotes + deadlineNote })
        .eq('id', applicationId);

      if (notesError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to update: ' + notesError.message
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Deadline updated (via notes)',
          applicationId,
          customDeadline,
          weekNumber: key
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Deadline updated successfully',
        applicationId,
        customDeadlines: newDeadlines
      })
    };

  } catch (error) {
    console.error('함수 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
