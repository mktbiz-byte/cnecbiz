const { createClient } = require('@supabase/supabase-js');

/**
 * WhatsApp Content Template 발송 Function
 *
 * Twilio Content Template API를 사용하여 승인된 템플릿 메시지를 발송합니다.
 * 단일 발송 및 캠페인 일괄 발송을 지원합니다.
 *
 * POST /.netlify/functions/send-whatsapp
 *
 * 단일 발송:
 * {
 *   mode: "single",
 *   creatorId: "uuid",
 *   phoneNumber: "+1XXXXXXXXXX",     // creatorId 없을 때 직접 지정
 *   creatorName: "이름",
 *   templateName: "creator_selected_v2",
 *   variables: { "1": "이름", "2": "https://..." },
 *   sentBy: "admin@email.com"
 * }
 *
 * 캠페인 일괄 발송:
 * {
 *   mode: "campaign",
 *   campaignId: "uuid",
 *   templateName: "selection_guide_delivery_v2",
 *   variableDefaults: { "2": "https://guide-link" },
 *   sentBy: "admin@email.com"
 * }
 */

const TEMPLATE_MAP = {
  account_deactivation_v2: {
    sid: 'HXc5771c898b430f65427d0572798236af',
    label: '계정 비활성화',
    variables: ['이름', '날짜', '링크']
  },
  account_registration_v2: {
    sid: 'HXf067244f4180faa23ee3334cb018f340',
    label: '계정 등록 완료',
    variables: ['이름', '이메일', '날짜', '링크']
  },
  payment_received_v2: {
    sid: 'HX782a0cea7653b5d59425b6d21a38b5c0',
    label: '결제 확인',
    variables: ['이름', '금액', '통화', '거래ID', '날짜', '영수증링크']
  },
  points_awarded_v2: {
    sid: 'HX7e9d152dfe2d323473300d8b068fe877',
    label: '포인트 지급',
    variables: ['이름', '포인트', '이유', '날짜', '총포인트', '링크']
  },
  verification_complete_v2: {
    sid: 'HXd0fa21fcd4b8717dad532d890e8f0919',
    label: '검증 완료',
    variables: ['이름', '콘텐츠제목', '날짜', '링크']
  },
  modification_request_v2: {
    sid: 'HX847391a9a9c3ea2fa415e64626c494ac',
    label: '수정 요청',
    variables: ['이름', '콘텐츠제목', '수정내용', '마감일', '링크']
  },
  selection_guide_delivery_v2: {
    sid: 'HX75d0a17c1c2002a0df8916afbc502206',
    label: '선정 + 가이드 전달',
    variables: ['이름', '가이드링크']
  },
  creator_selected_v2: {
    sid: 'HXf1ecf5df2af11281cce89dbcb767a701',
    label: '크리에이터 선정',
    variables: ['이름', '대시보드링크']
  }
};

const getSupabase = () => {
  return createClient(
    process.env.VITE_SUPABASE_BIZ_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

const getSupabaseUS = () => {
  return createClient(
    process.env.VITE_SUPABASE_US_URL || process.env.VITE_SUPABASE_US_URL,
    process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// 전화번호를 E.164 포맷으로 변환
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+')) return cleaned;

  // 한국
  if (cleaned.startsWith('010') || cleaned.startsWith('011')) {
    return '+82' + cleaned.substring(1);
  }
  // 일본
  if (cleaned.startsWith('090') || cleaned.startsWith('080') || cleaned.startsWith('070')) {
    return '+81' + cleaned.substring(1);
  }
  // 미국 (10자리)
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return '+1' + cleaned;
  }
  // 미국 (1로 시작하는 11자리)
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return '+' + cleaned;
  }

  if (/^\d+$/.test(cleaned)) {
    return '+' + cleaned;
  }

  return cleaned;
}

// Twilio Content Template 발송
async function sendTemplateMessage(toNumber, contentSid, contentVariables, accountSid, authToken, fromNumber) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

  const statusCallbackUrl = (process.env.URL || 'https://cnecbiz.com') + '/.netlify/functions/whatsapp-status-callback';

  const formData = new URLSearchParams();
  formData.append('From', formattedFrom);
  formData.append('To', `whatsapp:${toNumber}`);
  formData.append('ContentSid', contentSid);
  formData.append('ContentVariables', JSON.stringify(contentVariables));
  formData.append('StatusCallback', statusCallbackUrl);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }

  return data;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET: 템플릿 목록 반환
  if (event.httpMethod === 'GET') {
    const templates = Object.entries(TEMPLATE_MAP).map(([key, val]) => ({
      name: key,
      sid: val.sid,
      label: val.label,
      variables: val.variables
    }));
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, templates })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+13203078933';

  if (!accountSid || !authToken) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Twilio credentials not configured' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { mode = 'single', templateName, sentBy } = body;

  // 템플릿 확인
  const template = TEMPLATE_MAP[templateName];
  if (!template) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `Unknown template: ${templateName}`,
        availableTemplates: Object.keys(TEMPLATE_MAP)
      })
    };
  }

  const supabase = getSupabase();
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    // ======== SINGLE MODE ========
    if (mode === 'single') {
      const { creatorId, phoneNumber, creatorName, variables = {} } = body;

      let phone = phoneNumber;
      let name = creatorName || 'Creator';

      // creatorId로 전화번호 조회
      if (creatorId && !phone) {
        const supabaseUS = getSupabaseUS();
        const { data: creator } = await supabaseUS
          .from('user_profiles')
          .select('name, phone, phone_number, email')
          .eq('id', creatorId)
          .maybeSingle();

        if (creator) {
          phone = creator.phone || creator.phone_number;
          name = creator.name || name;
        }

        // BIZ DB fallback
        if (!phone) {
          const { data: bizCreator } = await supabase
            .from('creators')
            .select('name, phone, phone_number, email')
            .eq('id', creatorId)
            .maybeSingle();
          if (bizCreator) {
            phone = bizCreator.phone || bizCreator.phone_number;
            name = bizCreator.name || name;
          }
        }
      }

      if (!phone) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '전화번호를 찾을 수 없습니다.' })
        };
      }

      const formattedPhone = formatPhoneNumber(phone);
      if (!formattedPhone) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '올바른 전화번호 형식이 아닙니다.' })
        };
      }

      // 변수에 이름 자동 채우기
      if (!variables['1']) variables['1'] = name;

      console.log(`[send-whatsapp] Single send: ${templateName} → ${formattedPhone}`);

      const result = await sendTemplateMessage(
        formattedPhone, template.sid, variables, accountSid, authToken, fromNumber
      );

      // whatsapp_logs 저장
      await supabase.from('whatsapp_logs').insert({
        phone_number: formattedPhone,
        template_name: templateName,
        template_sid: template.sid,
        variables,
        twilio_sid: result.sid,
        status: result.status || 'queued',
        creator_id: creatorId || null,
        creator_name: name,
        sent_by: sentBy || null,
        batch_id: batchId
      }).then(({ error }) => {
        if (error) console.warn('[send-whatsapp] Log save failed:', error.message);
      });

      // notification_send_logs 통합 로그
      try {
        await supabase.from('notification_send_logs').insert({
          channel: 'whatsapp',
          status: 'success',
          function_name: 'send-whatsapp',
          recipient: formattedPhone,
          message_preview: `[${template.label}] ${name} (${templateName})`.substring(0, 200),
          metadata: { twilio_sid: result.sid, template_name: templateName, batch_id: batchId }
        });
      } catch (e) { /* skip */ }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          messageSid: result.sid,
          status: result.status,
          to: formattedPhone,
          templateName
        })
      };
    }

    // ======== CAMPAIGN MODE ========
    if (mode === 'campaign') {
      const { campaignId, variableDefaults = {} } = body;

      if (!campaignId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'campaignId is required' })
        };
      }

      // 캠페인에서 선정된 크리에이터 조회
      // applications 테이블에서 status = 'selected' 인 크리에이터 조회
      const supabaseUS = getSupabaseUS();

      // US DB에서 먼저 조회
      let applications = [];
      const { data: usApps } = await supabaseUS
        .from('applications')
        .select('id, creator_id, creator_name, creator_phone, creator_email, status')
        .eq('campaign_id', campaignId)
        .eq('status', 'selected');

      if (usApps && usApps.length > 0) {
        applications = usApps;
      } else {
        // BIZ DB fallback
        const { data: bizApps } = await supabase
          .from('applications')
          .select('id, creator_id, creator_name, creator_phone, creator_email, status')
          .eq('campaign_id', campaignId)
          .eq('status', 'selected');
        applications = bizApps || [];
      }

      if (applications.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '선정된 크리에이터가 없습니다.' })
        };
      }

      // 캠페인 정보 조회
      let campaignName = '';
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('title')
        .eq('id', campaignId)
        .maybeSingle();
      campaignName = campaign?.title || '';

      console.log(`[send-whatsapp] Campaign send: ${templateName} → ${applications.length} creators`);

      const results = [];
      for (const app of applications) {
        const phone = app.creator_phone;
        if (!phone) {
          results.push({
            creatorId: app.creator_id,
            creatorName: app.creator_name,
            success: false,
            error: 'No phone number'
          });
          continue;
        }

        const formattedPhone = formatPhoneNumber(phone);
        if (!formattedPhone) {
          results.push({
            creatorId: app.creator_id,
            creatorName: app.creator_name,
            success: false,
            error: 'Invalid phone format'
          });
          continue;
        }

        // 변수 설정: 이름 자동 채우기
        const variables = { ...variableDefaults };
        if (!variables['1']) variables['1'] = app.creator_name || 'Creator';

        try {
          const result = await sendTemplateMessage(
            formattedPhone, template.sid, variables, accountSid, authToken, fromNumber
          );

          // whatsapp_logs 저장
          await supabase.from('whatsapp_logs').insert({
            phone_number: formattedPhone,
            template_name: templateName,
            template_sid: template.sid,
            variables,
            twilio_sid: result.sid,
            status: result.status || 'queued',
            creator_id: app.creator_id,
            creator_name: app.creator_name,
            campaign_id: campaignId,
            campaign_name: campaignName,
            sent_by: sentBy || null,
            batch_id: batchId
          }).then(({ error }) => {
            if (error) console.warn('[send-whatsapp] Log save failed:', error.message);
          });

          // notification_send_logs 통합 로그
          try {
            await supabase.from('notification_send_logs').insert({
              channel: 'whatsapp',
              status: 'success',
              function_name: 'send-whatsapp',
              recipient: formattedPhone,
              message_preview: `[${template.label}] ${app.creator_name} (${campaignName})`.substring(0, 200),
              metadata: { twilio_sid: result.sid, template_name: templateName, campaign_id: campaignId, batch_id: batchId }
            });
          } catch (e) { /* skip */ }

          results.push({
            creatorId: app.creator_id,
            creatorName: app.creator_name,
            success: true,
            messageSid: result.sid
          });
        } catch (err) {
          console.error(`[send-whatsapp] Failed for ${app.creator_name}:`, err.message);

          await supabase.from('whatsapp_logs').insert({
            phone_number: formattedPhone,
            template_name: templateName,
            template_sid: template.sid,
            variables,
            status: 'failed',
            error_message: err.message,
            creator_id: app.creator_id,
            creator_name: app.creator_name,
            campaign_id: campaignId,
            campaign_name: campaignName,
            sent_by: sentBy || null,
            batch_id: batchId
          }).then(({ error }) => {
            if (error) console.warn('[send-whatsapp] Log save failed:', error.message);
          });

          // notification_send_logs 통합 로그 (실패)
          try {
            await supabase.from('notification_send_logs').insert({
              channel: 'whatsapp',
              status: 'failed',
              function_name: 'send-whatsapp',
              recipient: formattedPhone,
              message_preview: `[${template.label}] ${app.creator_name} (${campaignName})`.substring(0, 200),
              error_message: err.message,
              metadata: { template_name: templateName, campaign_id: campaignId, batch_id: batchId }
            });
          } catch (e) { /* skip */ }

          results.push({
            creatorId: app.creator_id,
            creatorName: app.creator_name,
            success: false,
            error: err.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: successCount > 0,
          message: `발송 완료: 성공 ${successCount}건, 실패 ${failCount}건`,
          batchId,
          total: results.length,
          successCount,
          failCount,
          results
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unknown mode: ${mode}. Use "single" or "campaign".` })
    };

  } catch (error) {
    console.error('[send-whatsapp] Error:', error);

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'send-whatsapp',
          errorMessage: error.message,
          context: { mode: body?.mode, templateName: body?.templateName }
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
