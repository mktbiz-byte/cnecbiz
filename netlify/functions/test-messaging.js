const { createClient } = require('@supabase/supabase-js');

/**
 * 메시징 채널 환경변수 및 API 연결 테스트
 *
 * POST /.netlify/functions/test-messaging
 * Body: {
 *   channel: 'line' | 'whatsapp' | 'kakao' | 'all',
 *   adminKey: 'cnec-test-2024'
 * }
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { channel = 'all', adminKey } = JSON.parse(event.body || '{}');

    if (adminKey !== 'cnec-test-2024') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const results = {};

    // --- LINE ---
    if (channel === 'line' || channel === 'all') {
      const lineResult = { envVars: {}, apiTest: null };

      const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      lineResult.envVars.LINE_CHANNEL_ACCESS_TOKEN = !!lineToken;
      lineResult.envVars.SUPABASE_JAPAN_URL = !!(process.env.SUPABASE_JAPAN_URL || process.env.VITE_SUPABASE_JAPAN_URL);
      lineResult.envVars.SUPABASE_JAPAN_SERVICE_ROLE_KEY = !!process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY;

      if (lineToken) {
        try {
          const res = await fetch('https://api.line.me/v2/bot/info', {
            headers: { 'Authorization': `Bearer ${lineToken}` }
          });
          if (res.ok) {
            const botInfo = await res.json();
            lineResult.apiTest = { status: 'ok', botName: botInfo.displayName, botId: botInfo.userId };
          } else {
            const errorText = await res.text();
            lineResult.apiTest = { status: 'error', code: res.status, detail: errorText };
          }
        } catch (e) {
          lineResult.apiTest = { status: 'error', detail: e.message };
        }
      } else {
        lineResult.apiTest = { status: 'skipped', reason: 'TOKEN not set' };
      }

      results.line = lineResult;
    }

    // --- WhatsApp (Twilio) ---
    if (channel === 'whatsapp' || channel === 'all') {
      const waResult = { envVars: {}, apiTest: null };

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      waResult.envVars.TWILIO_ACCOUNT_SID = !!accountSid;
      waResult.envVars.TWILIO_AUTH_TOKEN = !!authToken;
      waResult.envVars.TWILIO_WHATSAPP_NUMBER = !!process.env.TWILIO_WHATSAPP_NUMBER;

      if (accountSid && authToken) {
        try {
          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
            }
          });
          if (res.ok) {
            const info = await res.json();
            waResult.apiTest = { status: 'ok', accountName: info.friendly_name, accountStatus: info.status };
          } else {
            const errorText = await res.text();
            waResult.apiTest = { status: 'error', code: res.status, detail: errorText };
          }
        } catch (e) {
          waResult.apiTest = { status: 'error', detail: e.message };
        }
      } else {
        waResult.apiTest = { status: 'skipped', reason: 'Credentials not set' };
      }

      results.whatsapp = waResult;
    }

    // --- Kakao (Popbill) ---
    if (channel === 'kakao' || channel === 'all') {
      const kakaoResult = { envVars: {} };

      kakaoResult.envVars.POPBILL_LINK_ID = !!process.env.POPBILL_LINK_ID;
      kakaoResult.envVars.POPBILL_SECRET_KEY = !!process.env.POPBILL_SECRET_KEY;

      results.kakao = kakaoResult;
    }

    // --- Supabase DB ---
    if (channel === 'all') {
      const dbResult = { envVars: {} };

      const bizUrl = process.env.SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_BIZ_URL;
      const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      dbResult.envVars.SUPABASE_BIZ_URL = !!bizUrl;
      dbResult.envVars.SUPABASE_SERVICE_ROLE_KEY = !!bizKey;

      if (bizUrl && bizKey) {
        try {
          const db = createClient(bizUrl, bizKey);
          const { count, error } = await db.from('notification_send_logs').select('*', { count: 'exact', head: true });
          dbResult.connectionTest = error
            ? { status: 'error', detail: error.message }
            : { status: 'ok', totalLogs: count };
        } catch (e) {
          dbResult.connectionTest = { status: 'error', detail: e.message };
        }
      } else {
        dbResult.connectionTest = { status: 'skipped', reason: 'BIZ DB env not set' };
      }

      results.database = dbResult;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results, testedAt: new Date().toISOString() })
    };

  } catch (error) {
    console.error('[test-messaging] Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
