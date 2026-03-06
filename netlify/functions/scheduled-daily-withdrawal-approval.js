const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const XLSX = require('xlsx');

/**
 * 출금 건을 입금처별(하우랩/하우파파)로 묶어 네이버웍스 결재 문서로 상신
 * - 입금처별 1건씩 (최대 2건) 결재 문서 생성
 * - 각 결재 문서에 엑셀 파일 첨부
 * - 수동: POST /.netlify/functions/scheduled-daily-withdrawal-approval
 * - 자동: 매주 월~금 KST 10:00
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJjOEJZfc9xbDh
MpcJ6WPATGZDNPwKpRDIe4vJvEhkQeZC0UA8M0VmpBtM0nyuRtW6sRy0+Qk5Y3Cr
veKKt2ZRAqV43wdYJpwxptx5GhWGX0FwAeDrItsEVrbAXnBjGEMtWzMks1cA0nxQ
M7wc39d4IznKOJ0HqlkisPdRZnT0I3reaj7MW5B6GM3mscUC6pBLmPHClXdcWhft
HirX8U0Y+l7EHtK8w92jFaR7SMy62LKYjC8Pyo6tnI4Wp4Q3OxCZ9WuGEhIP45EC
wrgP8APCf4VoR1048gLmITUpF/Bm0t/idvl7Ebam4KJJm6E2w4+dEQvLx883lXq1
L0gYXVYDAgMBAAECggEABQAjzTHkcnnnK48vxCUwPmMm3mAAKNtzkSXPkA/F1Ab2
iY3bhCLZg/RqYPuP8Fr9joY6ahsLqYrYDsrFRh/KwBPKuzb9XaiHk4vKSI7nHdBb
NUY2qF7TBEaKfjdZnnvJnuR2XmC8td6DCxJdhnHfTLHDC0tgSgJl98BgQnrCSBRV
84vJqCr7Ouf56Oio1Fo8E7krYmqjsB3BaoKamuGUaAcAwUSEOpGSIsfP2aYOOZmk
aNgWo8Lr19VIr4iWccqjA/CJ83/fk84bE4Bae1lKzjQY4WFKmGSdeOn/3cVr76fY
Gt7qIBgWhe8DnKE6q3umNpAI5gC8j6mPhEbxmMUFsQKBgQDOkoC728Ay1PWoqP64
ldniGatvTvHDTVgU/kRipEXO8xzCGj+C21cKoniF1a0bI4fWTSUTtASURZKvuXAQ
Ij55GueWO5WjHAwskOacTYjUNpa8GlDDcBpSy/mYfNIh+IJE7bTO/rKX+wyJCAKp
klz7FkS4dykWwAww3KHDGkNblQKBgQD5xsH2Ma/tkHrekV5i3A0mLBBJheYgkwgR
YDSbkcp2pw+OIuby0bZlXiRrkDYBoCdLXyl4lmkmXwtcgOmuRpFnixb7YsJ7mTR1
gqNunttaczTRQkkanxZe77qKIYV1dtnumjn6x5hU0+Q6sJ5uPbLUahrQ9ocD+eD0
icJwkf/FNwKBgDHuRYGi900SHqL63j79saGuNLr96QAdFNpWL29sZ5dDOkNMludp
Xxup89ndsS7rIq1RDlI55BV2z6L7/rNXo6QgNbQhiOTZJbQr/iHvt9AbtcmXzse+
tA4pUZZjLWOarto8XsTd2YtU2k3RCtu0Dhd+5XN1EhB2sTuqSMtg8MEVAoGBAJ8Y
itNWMskPDjRWQ9iUcYuu5XDvaPW2sZzfuqKc6mlJYA8ZDCH+kj9fB7O716qRaHYJ
11CH/dIDGCmDs1Tefh+F6M2WymoP2+o9m/wKE445c5sWrZnXW1h9OkRhtbBsU8Q3
WFb0a4MctHLtrPxrME08iHgxjy5pK3CXjtJFLLVhAoGAXjlxrXUIHcbaeFJ78J/G
rv6RBqA2rzQOE0aaf/UcNnIAqJ4TUmgBfZ4TpXNkNHJ7YanXYdcKKVd2jGhoiZdH
h6Nfro2bqUE96CvNn+L5pTCHXUFZML8W02ZpgRLaRvXrt2HeHy3QUCqkHqxpm2rs
skmeYX6UpJwnuTP2xN5NDDI=
-----END PRIVATE KEY-----`;

function generateJWT(clientId, serviceAccount, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: clientId, sub: serviceAccount, iat: now, exp: now + 3600, scope };
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), PRIVATE_KEY);
  return `${signatureInput}.${signature.toString('base64url')}`;
}

function getAccessToken(clientId, clientSecret, serviceAccount, scope) {
  return new Promise((resolve, reject) => {
    const jwt = generateJWT(clientId, serviceAccount, scope);
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt, client_id: clientId, client_secret: clientSecret, scope
    }).toString();

    const req = https.request({
      hostname: 'auth.worksmobile.com', path: '/oauth2/v2.0/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => res.statusCode === 200 ? resolve(JSON.parse(data).access_token) : reject(new Error(`Token error: ${res.statusCode} ${data}`)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 엑셀 파일 생성 (Buffer 반환)
function generateExcelBuffer(withdrawals, entityName) {
  const koreanDate = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const rows = withdrawals.map((w, i) => {
    const createdAt = new Date(w.created_at);
    const grossAmount = w.requested_amount || 0;
    const incomeTax = Math.round(grossAmount * 0.03);
    const residentTax = Math.round(grossAmount * 0.003);
    const netAmount = grossAmount - incomeTax - residentTax;

    return {
      'No': i + 1,
      '월': createdAt.getMonth() + 1,
      '일': createdAt.getDate(),
      '이름': w.creator_name || w.account_holder || '-',
      '주민등록번호': w.resident_registration_number || '-',
      '세금공제 전 금액': grossAmount,
      '소득세(3%)': incomeTax,
      '주민세(0.3%)': residentTax,
      '실입금액': netAmount,
      '은행명': w.bank_name || '-',
      '계좌번호': w.account_number || '-',
      '비고': w.admin_notes || ''
    };
  });

  // 합계 행
  const totalGross = withdrawals.reduce((s, w) => s + (w.requested_amount || 0), 0);
  const totalIncomeTax = Math.round(totalGross * 0.03);
  const totalResidentTax = Math.round(totalGross * 0.003);
  const totalNet = totalGross - totalIncomeTax - totalResidentTax;

  rows.push({
    'No': '',
    '월': '',
    '일': '',
    '이름': '합계',
    '주민등록번호': '',
    '세금공제 전 금액': totalGross,
    '소득세(3%)': totalIncomeTax,
    '주민세(0.3%)': totalResidentTax,
    '실입금액': totalNet,
    '은행명': '',
    '계좌번호': '',
    '비고': `${entityName} / ${koreanDate} / ${withdrawals.length}건`
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // 열 너비 설정
  ws['!cols'] = [
    { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 10 }, { wch: 16 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
    { wch: 10 }, { wch: 16 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '출금내역');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// 네이버웍스 파일 업로드
function uploadFileToNaverWorks(accessToken, fileName, fileBuffer) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Date.now()}`;
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const headerBuf = Buffer.from(header, 'utf8');
    const footerBuf = Buffer.from(footer, 'utf8');
    const body = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

    const req = https.request({
      hostname: 'www.worksapis.com',
      path: '/v1.0/storage/files',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try { resolve(JSON.parse(data)); }
          catch (e) { resolve({ fileId: data }); }
        } else {
          reject(new Error(`File upload error: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 네이버웍스 결재 문서 생성 (입금처별 묶음)
function createBatchApprovalDocument(accessToken, userId, documentFormId, entityName, withdrawals, componentIds, fileId) {
  return new Promise((resolve, reject) => {
    const totalGross = withdrawals.reduce((s, w) => s + (w.requested_amount || 0), 0);
    const totalIncomeTax = Math.round(totalGross * 0.03);
    const totalResidentTax = Math.round(totalGross * 0.003);
    const totalNet = totalGross - totalIncomeTax - totalResidentTax;
    const koreanDate = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

    const documentBody = [];

    // 텍스트 컴포넌트들
    if (componentIds.entity) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.entity, componentValue: { value: entityName } });
    }
    if (componentIds.date) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.date, componentValue: { value: koreanDate } });
    }
    if (componentIds.count) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.count, componentValue: { value: String(withdrawals.length) } });
    }
    if (componentIds.totalAmount) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.totalAmount, componentValue: { value: totalGross.toLocaleString() + '원' } });
    }
    if (componentIds.totalTax) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.totalTax, componentValue: { value: (totalIncomeTax + totalResidentTax).toLocaleString() + '원' } });
    }
    if (componentIds.totalNet) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.totalNet, componentValue: { value: totalNet.toLocaleString() + '원' } });
    }

    // 크리에이터 목록 (간략)
    if (componentIds.creatorList) {
      const listText = withdrawals.map((w, i) =>
        `${i + 1}. ${w.creator_name || w.account_holder || '-'} / ${(w.requested_amount || 0).toLocaleString()}원`
      ).join('\n');
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.creatorList, componentValue: { value: listText } });
    }

    // 첨부파일 컴포넌트
    if (componentIds.attachment && fileId) {
      documentBody.push({ componentType: 'CP_FILE', componentId: componentIds.attachment, componentValue: { fileId: fileId } });
    }

    const documentData = {
      title: `[포인트입금/${entityName}] ${koreanDate} - ${withdrawals.length}건 / ${totalGross.toLocaleString()}원`,
      documentFormId: documentFormId,
      documentBody: documentBody
    };

    const postData = JSON.stringify(documentData);

    const req = https.request({
      hostname: 'www.worksapis.com',
      path: `/v1.0/business-support/approval/users/${encodeURIComponent(userId)}/documents`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try { resolve(JSON.parse(data)); }
          catch (e) { resolve({ documentId: data }); }
        } else {
          reject(new Error(`Approval API error: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 네이버웍스 채널 메시지 전송
function sendChannelMessage(accessToken, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ content: { type: 'text', text: message } });
    const req = https.request({
      hostname: 'www.worksapis.com', path: `/v1.0/bots/${botId}/channels/${channelId}/messages`, method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => (res.statusCode === 201 || res.statusCode === 200) ? resolve({ success: true }) : reject(new Error(`Message error: ${res.statusCode}`)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.handler = async (event) => {
  const httpMethod = event.httpMethod || 'SCHEDULED';
  const isManualTest = httpMethod === 'GET' || httpMethod === 'POST';
  console.log(`[daily-withdrawal-approval] 시작 - ${isManualTest ? '수동' : '자동'}`);

  try {
    // 주말 체크 (수동 테스트 시에는 skip)
    if (!isManualTest) {
      const now = new Date();
      const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const dayOfWeek = kst.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log('[daily-withdrawal-approval] 주말 - skip');
        return { statusCode: 200, body: JSON.stringify({ message: '주말 - skip' }) };
      }
    }

    // 분류 완료 + 승인됨 + approval_status=NONE 건 조회
    const { data: withdrawals, error } = await supabase
      .from('creator_withdrawal_requests')
      .select('*')
      .eq('status', 'approved')
      .eq('approval_status', 'NONE')
      .eq('region', 'korea')
      .not('paying_entity', 'is', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!withdrawals || withdrawals.length === 0) {
      console.log('[daily-withdrawal-approval] 처리할 출금 신청 없음');
      return { statusCode: 200, body: JSON.stringify({ message: '처리할 출금 신청 없음', count: 0 }) };
    }

    // 입금처별 그룹핑
    const grouped = {};
    for (const w of withdrawals) {
      const entity = w.paying_entity; // 'howlab' or 'howpapa'
      if (!grouped[entity]) grouped[entity] = [];
      grouped[entity].push(w);
    }

    console.log(`[daily-withdrawal-approval] 총 ${withdrawals.length}건 - 그룹: ${Object.keys(grouped).join(', ')}`);

    // 네이버웍스 인증
    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_WITHDRAWAL_CHANNEL_ID || process.env.NAVER_WORKS_CHANNEL_ID;
    const documentFormId = process.env.NAVER_WORKS_APPROVAL_TEMPLATE_ID || 'd4cb5007-37a3-4220-9c28-bbaf4778f600';
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

    // 서식 컴포넌트 ID (서식 생성 후 환경변수로 설정)
    const componentIds = {
      entity: process.env.NW_COMP_ENTITY || null,           // 입금처
      date: process.env.NW_COMP_DATE || null,               // 신청일
      count: process.env.NW_COMP_COUNT || null,              // 총 건수
      totalAmount: process.env.NW_COMP_TOTAL_AMOUNT || null, // 총 신청금액
      totalTax: process.env.NW_COMP_TOTAL_TAX || null,       // 총 세금
      totalNet: process.env.NW_COMP_TOTAL_NET || null,       // 총 실입금액
      creatorList: process.env.NW_COMP_CREATOR_LIST || null,  // 크리에이터 목록
      attachment: process.env.NW_COMP_ATTACHMENT || null       // 첨부파일
    };

    if (!clientId || !clientSecret) {
      throw new Error('네이버웍스 인증 정보가 설정되지 않았습니다.');
    }

    // 토큰 발급
    let approvalToken = null;
    if (documentFormId) {
      try {
        approvalToken = await getAccessToken(clientId, clientSecret, serviceAccount, 'businessSupport.approval');
      } catch (e) {
        console.error('[daily-withdrawal-approval] Approval token error:', e.message);
      }
    }

    // 파일 업로드용 토큰
    let storageToken = null;
    try {
      storageToken = await getAccessToken(clientId, clientSecret, serviceAccount, 'storage');
    } catch (e) {
      console.error('[daily-withdrawal-approval] Storage token error:', e.message);
    }

    const botToken = await getAccessToken(clientId, clientSecret, serviceAccount, 'bot');

    const entityNames = { howlab: '하우랩', howpapa: '하우파파' };
    const results = [];

    // 입금처별로 1건씩 결재 문서 생성 (최대 2건)
    for (const [entity, items] of Object.entries(grouped)) {
      const entityName = entityNames[entity] || entity;
      const totalAmount = items.reduce((s, w) => s + (w.requested_amount || 0), 0);

      try {
        let fileId = null;
        let approvalDocId = null;

        // 1. 엑셀 생성 및 업로드
        if (storageToken) {
          try {
            const koreanDate = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }).replace(/\. /g, '').replace('.', '');
            const fileName = `포인트입금_${entityName}_${koreanDate}.xlsx`;
            const excelBuffer = generateExcelBuffer(items, entityName);
            const uploadResult = await uploadFileToNaverWorks(storageToken, fileName, excelBuffer);
            fileId = uploadResult.fileId || uploadResult.id || null;
            console.log(`[daily-withdrawal-approval] ${entityName} 엑셀 업로드 완료: ${fileId}`);
          } catch (uploadErr) {
            console.error(`[daily-withdrawal-approval] ${entityName} 엑셀 업로드 실패:`, uploadErr.message);
          }
        }

        // 2. 결재 문서 생성
        if (approvalToken && documentFormId) {
          try {
            const result = await createBatchApprovalDocument(
              approvalToken, serviceAccount, documentFormId,
              entityName, items, componentIds, fileId
            );
            approvalDocId = result.documentId || result.requestId || result.id || null;
            console.log(`[daily-withdrawal-approval] ${entityName} 결재문서 생성: ${approvalDocId}`);
          } catch (approvalErr) {
            console.error(`[daily-withdrawal-approval] ${entityName} 결재문서 생성 실패:`, approvalErr.message);
          }
        }

        // 3. DB 업데이트 (해당 입금처의 모든 건)
        const itemIds = items.map(w => w.id);
        const updateData = {
          approval_status: 'PENDING',
          approval_requested_at: new Date().toISOString()
        };
        if (approvalDocId) {
          updateData.approval_doc_id = approvalDocId;
        }

        await supabase
          .from('creator_withdrawal_requests')
          .update(updateData)
          .in('id', itemIds);

        // 4. 감사 로그
        for (const w of items) {
          await supabase.from('withdrawal_audit_logs').insert({
            withdrawal_id: w.id,
            action: 'SUBMITTED',
            actor: 'system',
            details: {
              approval_doc_id: approvalDocId,
              paying_entity: entity,
              requested_amount: w.requested_amount,
              creator_name: w.creator_name || w.account_holder,
              batch_count: items.length,
              batch_total: totalAmount
            }
          });
        }

        results.push({
          entity: entityName,
          count: items.length,
          totalAmount,
          approvalDocId,
          fileUploaded: !!fileId
        });

      } catch (entityErr) {
        console.error(`[daily-withdrawal-approval] ${entityName} 처리 실패:`, entityErr.message);
        results.push({ entity: entityName, count: items.length, totalAmount, error: entityErr.message });
      }
    }

    // 결과 요약 네이버웍스 메시지
    const successResults = results.filter(r => !r.error);
    if (successResults.length > 0 && botId && channelId) {
      const koreanDate = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
      const detailLines = successResults.map(r =>
        `[${r.entity}] ${r.count}건 / ${r.totalAmount.toLocaleString()}원${r.fileUploaded ? ' (엑셀첨부)' : ''}`
      ).join('\n');

      const totalAll = successResults.reduce((s, r) => s + r.totalAmount, 0);
      const countAll = successResults.reduce((s, r) => s + r.count, 0);
      const summaryMessage = `[결재상신완료] ${koreanDate}\n\n총 ${countAll}건 / ${totalAll.toLocaleString()}원\n${successResults.length}건 결재문서 상신\n\n${detailLines}`;

      try {
        await sendChannelMessage(botToken, botId, channelId, summaryMessage);
      } catch (e) {
        console.error('[daily-withdrawal-approval] 요약 메시지 전송 실패:', e.message);
      }
    }

    const totalSuccess = successResults.reduce((s, r) => s + r.count, 0);
    const totalFailed = results.filter(r => r.error).reduce((s, r) => s + r.count, 0);
    console.log(`[daily-withdrawal-approval] 완료 - 성공: ${totalSuccess}건 (${successResults.length}문서), 실패: ${totalFailed}건`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: totalSuccess,
        failed: totalFailed,
        documents: results.length,
        results
      })
    };

  } catch (error) {
    console.error('[daily-withdrawal-approval] Error:', error);

    try {
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${baseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'scheduled-daily-withdrawal-approval',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// 스케줄: 매주 월~금 UTC 01:00 = KST 10:00
exports.config = { schedule: '0 1 * * 1-5' };
