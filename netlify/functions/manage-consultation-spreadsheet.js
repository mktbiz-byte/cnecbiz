const { getBizClient } = require('./lib/supabase');
const { CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const supabase = getBizClient();

    // GET: 스프레드시트 목록 또는 특정 시트 데이터
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};

      if (params.spreadsheet_id) {
        // 특정 시트의 행 데이터 조회
        const { data: rows, error } = await supabase
          .from('consultation_spreadsheet_rows')
          .select('*')
          .eq('spreadsheet_id', params.spreadsheet_id)
          .order('sort_order', { ascending: true });
        if (error) throw error;

        return successResponse({ success: true, rows: rows || [] });
      }

      // 스프레드시트 목록 조회
      const { data: sheets, error } = await supabase
        .from('consultation_spreadsheets')
        .select('*, consultation_spreadsheet_rows(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const formatted = (sheets || []).map(s => ({
        ...s,
        row_count: s.consultation_spreadsheet_rows?.[0]?.count || 0,
        consultation_spreadsheet_rows: undefined
      }));

      return successResponse({ success: true, sheets: formatted });
    }

    // POST: 다양한 액션
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action } = body;

      // 새 스프레드시트 생성
      if (action === 'create_sheet') {
        const { name, description } = body;
        if (!name) return errorResponse(400, '시트 이름은 필수입니다');

        const { data, error } = await supabase
          .from('consultation_spreadsheets')
          .insert({ name, description: description || '' })
          .select()
          .single();
        if (error) throw error;

        return successResponse({ success: true, sheet: data });
      }

      // 스프레드시트 이름 수정
      if (action === 'update_sheet') {
        const { sheet_id, name, description } = body;
        if (!sheet_id) return errorResponse(400, 'sheet_id 필수');

        const { error } = await supabase
          .from('consultation_spreadsheets')
          .update({ name, description, updated_at: new Date().toISOString() })
          .eq('id', sheet_id);
        if (error) throw error;

        return successResponse({ success: true });
      }

      // 스프레드시트 삭제
      if (action === 'delete_sheet') {
        const { sheet_id } = body;
        if (!sheet_id) return errorResponse(400, 'sheet_id 필수');

        const { error } = await supabase
          .from('consultation_spreadsheets')
          .delete()
          .eq('id', sheet_id);
        if (error) throw error;

        return successResponse({ success: true });
      }

      // 행 추가
      if (action === 'add_row') {
        const { spreadsheet_id, row_data } = body;
        if (!spreadsheet_id) return errorResponse(400, 'spreadsheet_id 필수');

        // 최대 sort_order 조회
        const { data: maxRow } = await supabase
          .from('consultation_spreadsheet_rows')
          .select('sort_order')
          .eq('spreadsheet_id', spreadsheet_id)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextOrder = (maxRow?.sort_order || 0) + 1;

        const { data, error } = await supabase
          .from('consultation_spreadsheet_rows')
          .insert({
            spreadsheet_id,
            sort_order: nextOrder,
            ...row_data
          })
          .select()
          .single();
        if (error) throw error;

        return successResponse({ success: true, row: data });
      }

      // 행 수정 (인라인 편집)
      if (action === 'update_row') {
        const { row_id, updates } = body;
        if (!row_id) return errorResponse(400, 'row_id 필수');

        const { error } = await supabase
          .from('consultation_spreadsheet_rows')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', row_id);
        if (error) throw error;

        return successResponse({ success: true });
      }

      // 행 삭제
      if (action === 'delete_row') {
        const { row_id } = body;
        if (!row_id) return errorResponse(400, 'row_id 필수');

        const { error } = await supabase
          .from('consultation_spreadsheet_rows')
          .delete()
          .eq('id', row_id);
        if (error) throw error;

        return successResponse({ success: true });
      }

      // 여러 행 일괄 수정
      if (action === 'bulk_update') {
        const { updates } = body;
        if (!updates || !Array.isArray(updates)) return errorResponse(400, 'updates 배열 필수');

        for (const { row_id, data } of updates) {
          const { error } = await supabase
            .from('consultation_spreadsheet_rows')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', row_id);
          if (error) throw error;
        }

        return successResponse({ success: true });
      }

      return errorResponse(400, `알 수 없는 action: ${action}`);
    }

    return errorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('[manage-consultation-spreadsheet] Error:', error);

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'manage-consultation-spreadsheet',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return errorResponse(500, error.message);
  }
};
