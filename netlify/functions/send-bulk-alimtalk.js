/**
 * 단체 알림톡 발송 API (팝빌)
 * 엑셀 업로드 + BIZ DB 크리에이터 데이터를 합쳐서 중복 제거 후 일괄 발송
 *
 * POST /.netlify/functions/send-bulk-alimtalk
 * Body: {
 *   templateCode: "026030000945",
 *   variables: { "캠페인명": "봄 신상 캠페인" },
 *   recipients: [{ phone: "01012345678", name: "홍길동" }, ...],
 *   senderNum: "18336025"  // optional, default POPBILL_SENDER_NUM
 * }
 */

const popbill = require('popbill');
const { createClient } = require('@supabase/supabase-js');

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const POPBILL_LINK_ID = process.env.POPBILL_LINK_ID || 'HOWLAB';
const POPBILL_SECRET_KEY = process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=';
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025';
const POPBILL_USER_ID = process.env.POPBILL_USER_ID || '';

popbill.config({
  LinkID: POPBILL_LINK_ID,
  SecretKey: POPBILL_SECRET_KEY,
  IsTest: false,
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true
});

const kakaoService = popbill.KakaoService();

// 템플릿 메시지 내 변수 치환
function applyVariables(templateContent, variables, recipientName) {
  let msg = templateContent;
  if (recipientName) {
    msg = msg.replace(/#{크리에이터명}/g, recipientName);
  }
  for (const [key, value] of Object.entries(variables || {})) {
    msg = msg.replace(new RegExp(`#{${key}}`, 'g'), value || '');
  }
  return msg;
}

// 전화번호 정규화 (숫자만, 하이픈 제거)
function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.length < 10 || cleaned.length > 11) return null;
  return cleaned;
}

// 🔕 알림 전역 비활성화 스위치 (2026-04-20)
const NOTIFICATIONS_DISABLED = true;

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

  if (NOTIFICATIONS_DISABLED) {
    console.log('[send-bulk-alimtalk] SKIPPED: notifications globally disabled');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, skipped: true, reason: 'notifications_disabled' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { templateCode, templateContent, variables = {}, recipients = [], buttons, senderNum } = body;

    if (!templateCode || !templateContent) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '템플릿 코드와 내용이 필요합니다.' }) };
    }
    if (!recipients || recipients.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '수신자가 없습니다.' }) };
    }

    // 수신자 중복 제거 (전화번호 기준)
    const phoneSet = new Set();
    const uniqueRecipients = [];
    for (const r of recipients) {
      const phone = normalizePhone(r.phone);
      if (!phone) continue;
      if (phoneSet.has(phone)) continue;
      phoneSet.add(phone);
      uniqueRecipients.push({ phone, name: r.name || '' });
    }

    if (uniqueRecipients.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '유효한 수신자가 없습니다.' }) };
    }

    console.log(`[bulk-alimtalk] 발송 시작: 템플릿=${templateCode}, 수신자=${uniqueRecipients.length}명`);

    // plusFriendID 결정
    const companyTemplates = [
      '025100000912', '025100000918', '025100000919', '025100000942', '025100000943',
      '025100001005', '025100001006', '025100001007', '025100001008', '025100001009', '025100001010'
    ];
    const plusFriendID = companyTemplates.includes(templateCode) ? '@크넥' : '@크넥_크리에이터';

    // 팝빌 sendATS는 1회에 최대 1,000건
    const BATCH_SIZE = 1000;
    let totalSuccess = 0;
    let totalFail = 0;
    const failedRecipients = [];

    for (let i = 0; i < uniqueRecipients.length; i += BATCH_SIZE) {
      const batch = uniqueRecipients.slice(i, i + BATCH_SIZE);

      // 수신자별 메시지 생성 (#{크리에이터명} 개인화)
      const receivers = batch.map(r => {
        const msg = applyVariables(templateContent, variables, r.name);
        return {
          rcv: r.phone,
          rcvnm: r.name,
          msg: msg,
          altmsg: msg,
          altsjt: ''
        };
      });

      // 버튼 포맷 변환 (프론트엔드 형식 → 팝빌 형식)
      const popbillBtns = buttons ? buttons.map(b => ({
        n: b.n,
        t: b.t,
        u1: b.u1 || '',
        u2: b.u2 || ''
      })) : null;

      try {
        const result = await new Promise((resolve, reject) => {
          kakaoService.sendATS_multi(
            POPBILL_CORP_NUM,
            templateCode,
            senderNum || POPBILL_SENDER_NUM,
            'C',  // altSendType: C=동일내용 대체문자
            null, // sndDT (즉시발송)
            receivers,
            POPBILL_USER_ID,
            '',   // requestNum
            popbillBtns,
            (receiptNum) => {
              console.log(`[bulk-alimtalk] Batch ${Math.floor(i / BATCH_SIZE) + 1} 성공, receiptNum: ${receiptNum}`);
              resolve({ success: true, receiptNum, count: batch.length });
            },
            (error) => {
              console.error(`[bulk-alimtalk] Batch ${Math.floor(i / BATCH_SIZE) + 1} 실패:`, error);
              reject(error);
            }
          );
        });

        totalSuccess += result.count;
      } catch (batchError) {
        console.error(`[bulk-alimtalk] Batch error:`, batchError);
        totalFail += batch.length;
        batch.forEach(r => failedRecipients.push({ phone: r.phone, name: r.name, error: batchError.message || String(batchError) }));
      }
    }

    // 발송 로그 저장
    try {
      await supabaseBiz.from('notification_send_logs').insert({
        channel: 'kakao',
        status: totalSuccess > 0 ? 'success' : 'failed',
        function_name: 'send-bulk-alimtalk',
        recipient: `총 ${uniqueRecipients.length}명`,
        message_preview: `[${templateCode}] ${Object.values(variables).join(', ')}`.substring(0, 200),
        error_message: totalFail > 0 ? `${totalFail}건 실패` : null,
        metadata: { templateCode, totalSuccess, totalFail, totalRecipients: uniqueRecipients.length }
      });
    } catch (e) { console.warn('[bulk-alimtalk] Log save failed:', e.message); }

    console.log(`[bulk-alimtalk] 완료: 성공 ${totalSuccess}, 실패 ${totalFail}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: totalSuccess > 0,
        message: `발송 완료: 성공 ${totalSuccess}건, 실패 ${totalFail}건`,
        totalRecipients: uniqueRecipients.length,
        totalSuccess,
        totalFail,
        failedRecipients: failedRecipients.slice(0, 50) // 최대 50건까지 실패 목록
      })
    };
  } catch (error) {
    console.error('[bulk-alimtalk] Error:', error);

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'send-bulk-alimtalk', errorMessage: error.message })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
