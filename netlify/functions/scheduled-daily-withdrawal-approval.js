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

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
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

// 네이버웍스 결재 서식 컴포넌트 조회 (API로 자동 탐색)
function getFormComponents(accessToken, documentFormId) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.worksapis.com',
      path: `/v1.0/business-support/approval/forms/${documentFormId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Form parse error: ${e.message}`)); }
        } else {
          reject(new Error(`Form API error: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// 서식 컴포넌트에서 이름으로 ID 자동 매칭
function matchComponentIds(formData) {
  const ids = {};
  const allComponents = [];

  // 재귀적으로 모든 컴포넌트를 플랫하게 수집
  function flatten(items) {
    if (!Array.isArray(items)) return;
    for (const comp of items) {
      if (comp.componentId || comp.id) allComponents.push(comp);
      if (comp.components) flatten(comp.components);
      if (comp.children) flatten(comp.children);
      if (comp.items) flatten(comp.items);
    }
  }

  // NaverWorks API 응답 구조에 따라 탐색
  flatten(formData.components || []);
  flatten(formData.documentBody || []);
  flatten(formData.body || []);
  if (formData.formBody) flatten(formData.formBody.components || formData.formBody || []);

  console.log(`[form-match] Found ${allComponents.length} components:`,
    allComponents.map(c => `${c.name || c.label || '?'}(${c.componentId || c.id}/${c.componentType || c.type})`).join(', '));

  for (const comp of allComponents) {
    const name = (comp.name || comp.label || comp.title || '').trim();
    const id = comp.componentId || comp.id;
    const type = comp.componentType || comp.type || '';

    if (name.includes('입금처')) ids.entity = { id, type };
    else if (name === '총 건수' || name.includes('총 건수')) ids.count = { id, type };
    else if (name === '총 신청금액' || name.includes('신청금액')) ids.totalAmount = { id, type };
    else if (name === '총 세금' || name.includes('세금')) ids.totalTax = { id, type };
    else if (name === '총 실입금액' || name.includes('실입금액')) ids.totalNet = { id, type };
    else if (name.includes('내역')) ids.details = { id, type };

    // 테이블 컴포넌트
    if (type.includes('TABLE') || name.includes('테이블')) {
      ids.table = { id, type, component: comp };
    }
    // 파일 첨부 컴포넌트
    if (type.includes('FILE') || name.includes('파일') || name.includes('첨부')) {
      ids.attachment = { id, type: type || 'CP_FILE' };
    }
  }

  return ids;
}

// 네이버웍스 결재 문서 생성 (입금처별 묶음 - 자동 컴포넌트 매칭)
function createBatchApprovalDocument(accessToken, userId, documentFormId, entityName, withdrawals, componentIds, fileId) {
  return new Promise((resolve, reject) => {
    const totalGross = withdrawals.reduce((s, w) => s + (w.requested_amount || 0), 0);
    const totalIncomeTax = Math.round(totalGross * 0.03);
    const totalResidentTax = Math.round(totalGross * 0.003);
    const totalNet = totalGross - totalIncomeTax - totalResidentTax;
    const koreanDate = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

    const documentBody = [];

    // 입금처 (셀렉트 또는 텍스트)
    if (componentIds.entity) {
      const cType = (componentIds.entity.type || '').includes('SELECT') ? 'CP_SELECT' : 'CP_TEXT';
      documentBody.push({ componentType: cType, componentId: componentIds.entity.id, componentValue: { value: entityName } });
    }

    // 총 건수
    if (componentIds.count) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.count.id, componentValue: { value: String(withdrawals.length) } });
    }

    // 총 신청금액
    if (componentIds.totalAmount) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.totalAmount.id, componentValue: { value: totalGross.toLocaleString() } });
    }

    // 총 세금
    if (componentIds.totalTax) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.totalTax.id, componentValue: { value: (totalIncomeTax + totalResidentTax).toLocaleString() } });
    }

    // 총 실입금액
    if (componentIds.totalNet) {
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.totalNet.id, componentValue: { value: totalNet.toLocaleString() } });
    }

    // 수식 테이블 (No, 신청자, 신청금액, 수수료(3.3%), 실수령액, 은행명, 계좌번호, 예금주)
    if (componentIds.table) {
      const tableRows = withdrawals.map((w, i) => {
        const gross = w.requested_amount || 0;
        const fee = Math.round(gross * 0.033);
        const net = gross - fee;
        return [
          String(i + 1),
          w.creator_name || w.account_holder || '-',
          gross.toLocaleString(),
          fee.toLocaleString(),
          net.toLocaleString(),
          w.bank_name || '-',
          w.account_number || '-',
          w.account_holder || '-'
        ];
      });
      documentBody.push({
        componentType: componentIds.table.type || 'CP_TABLE',
        componentId: componentIds.table.id,
        componentValue: { rows: tableRows }
      });
    }

    // 내역 (리치 텍스트)
    if (componentIds.details) {
      const listText = withdrawals.map((w, i) =>
        `${i + 1}. ${w.creator_name || w.account_holder || '-'} / ${(w.requested_amount || 0).toLocaleString()}원`
      ).join('\n');
      const detailText = `[${entityName}] ${koreanDate}\n총 ${withdrawals.length}건 / ${totalGross.toLocaleString()}원\n\n${listText}`;
      documentBody.push({ componentType: 'CP_TEXT', componentId: componentIds.details.id, componentValue: { value: detailText } });
    }

    // 첨부파일
    if (componentIds.attachment && fileId) {
      documentBody.push({
        componentType: componentIds.attachment.type || 'CP_FILE',
        componentId: componentIds.attachment.id,
        componentValue: { fileId: fileId }
      });
    }

    console.log(`[daily-withdrawal-approval] ${entityName} documentBody components: ${documentBody.length}개`);

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
  const queryParams = event.queryStringParameters || {};

  // 자동 스케줄 실행 비활성화 (사용자 요청: 네이버웍스 결재상신 알림 OFF)
  // 수동 관리자 트리거(HTTP 호출)는 계속 허용
  if (!isManualTest) {
    console.log('[daily-withdrawal-approval] 자동 스케줄 비활성화 상태 - skip');
    return { statusCode: 200, body: JSON.stringify({ message: '자동 스케줄 비활성화됨' }) };
  }

  // dry-run 모드: DB 변경 없이 결과만 반환
  let dryRun = false;
  if (httpMethod === 'POST' && event.body) {
    try {
      const bodyData = JSON.parse(event.body);
      dryRun = bodyData.dryRun === true;
    } catch (e) { /* body가 없거나 파싱 불가 → 기본값 */ }
  }

  console.log(`[daily-withdrawal-approval] 시작 - ${isManualTest ? '수동' : '자동'}${dryRun ? ' (DRY-RUN)' : ''}`);

  try {
    // GET ?debug=form → 서식 컴포넌트 조회 모드
    if (httpMethod === 'GET' && queryParams.debug === 'form') {
      const clientId = process.env.NAVER_WORKS_CLIENT_ID;
      const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
      const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';
      const documentFormId = 'd4cb5007-37a3-4220-9c28-bbaf4778f600';

      const token = await getAccessToken(clientId, clientSecret, serviceAccount, 'businessSupport.approval');
      const formData = await getFormComponents(token, documentFormId);
      const matched = matchComponentIds(formData);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: documentFormId,
          matchedComponents: matched,
          rawForm: formData
        }, null, 2)
      };
    }

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

    // 1. BIZ DB의 withdrawal_entity_map에서 분류된 건 조회
    const { data: entityMaps, error: mapError } = await supabaseBiz
      .from('withdrawal_entity_map')
      .select('withdrawal_id, source_db, paying_entity')
      .eq('source_db', 'korea');

    if (mapError) throw mapError;

    if (!entityMaps || entityMaps.length === 0) {
      console.log('[daily-withdrawal-approval] 분류된 출금 건 없음');
      return { statusCode: 200, body: JSON.stringify({ message: '분류된 출금 건 없음', count: 0 }) };
    }

    // 2. Korea DB에서 승인된 출금 건 조회
    const mappedIds = entityMaps.map(m => m.withdrawal_id);
    const { data: koreaWithdrawals, error: koreaError } = await supabaseKorea
      .from('withdrawals')
      .select('*')
      .eq('status', 'approved')
      .in('id', mappedIds)
      .order('created_at', { ascending: true });

    if (koreaError) throw koreaError;

    // 3. 이미 결재 상신된 건 제외 (BIZ DB audit_logs 확인)
    const { data: submittedLogs } = await supabaseBiz
      .from('withdrawal_audit_logs')
      .select('withdrawal_id')
      .eq('action', 'SUBMITTED')
      .in('withdrawal_id', mappedIds);

    const submittedIds = new Set((submittedLogs || []).map(l => l.withdrawal_id));

    // 4. entity map과 조인하여 paying_entity 추가 + 이미 상신된 건 제외
    const entityMap = {};
    entityMaps.forEach(m => { entityMap[m.withdrawal_id] = m.paying_entity; });

    const withdrawals = (koreaWithdrawals || [])
      .filter(w => !submittedIds.has(w.id))
      .map(w => ({
        ...w,
        paying_entity: entityMap[w.id],
        // Korea DB 컬럼명을 결재 함수 기대 형식으로 매핑
        requested_amount: w.amount,
        account_number: w.bank_account_number,
        account_holder: w.bank_account_holder,
        creator_name: w.bank_account_holder,
        resident_registration_number: w.resident_number_encrypted,
        region: 'korea'
      }));

    if (withdrawals.length === 0) {
      console.log('[daily-withdrawal-approval] 처리할 출금 신청 없음 (이미 상신됨 또는 미승인)');
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

    // DRY-RUN 모드: 대상 건만 반환하고 종료
    if (dryRun) {
      const dryRunResults = Object.entries(grouped).map(([entity, items]) => {
        const entityName = { howlab: '하우랩', howpapa: '하우파파' }[entity] || entity;
        const totalAmount = items.reduce((s, w) => s + (w.requested_amount || 0), 0);
        const totalIncomeTax = Math.round(totalAmount * 0.03);
        const totalResidentTax = Math.round(totalAmount * 0.003);
        const totalNet = totalAmount - totalIncomeTax - totalResidentTax;
        return {
          entity: entityName,
          entityKey: entity,
          count: items.length,
          totalAmount,
          totalTax: totalIncomeTax + totalResidentTax,
          totalNet,
          items: items.map(w => ({
            id: w.id,
            creator_name: w.creator_name || w.account_holder || '-',
            requested_amount: w.requested_amount || 0,
            bank_name: w.bank_name || '-',
            account_number: w.account_number || '-',
            account_holder: w.account_holder || '-',
            created_at: w.created_at
          }))
        };
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          dryRun: true,
          message: 'DRY-RUN: 실제 결재 상신 없이 대상 건만 조회합니다.',
          totalCount: withdrawals.length,
          groups: dryRunResults
        })
      };
    }

    // 네이버웍스 인증
    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_WITHDRAWAL_CHANNEL_ID || process.env.NAVER_WORKS_CHANNEL_ID;
    const documentFormId = 'd4cb5007-37a3-4220-9c28-bbaf4778f600';
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

    if (!clientId || !clientSecret) {
      throw new Error('네이버웍스 인증 정보가 설정되지 않았습니다.');
    }

    // 토큰 발급 (결재, 파일, 봇 - 병렬)
    let approvalToken = null;
    let fileToken = null;
    let botToken = null;

    const [approvalRes, fileRes, botRes] = await Promise.allSettled([
      getAccessToken(clientId, clientSecret, serviceAccount, 'businessSupport.approval'),
      getAccessToken(clientId, clientSecret, serviceAccount, 'file'),
      getAccessToken(clientId, clientSecret, serviceAccount, 'bot')
    ]);

    approvalToken = approvalRes.status === 'fulfilled' ? approvalRes.value : null;
    fileToken = fileRes.status === 'fulfilled' ? fileRes.value : null;
    botToken = botRes.status === 'fulfilled' ? botRes.value : null;

    const debugInfo = {
      tokens: {
        approval: approvalRes.status === 'fulfilled' ? 'OK' : (approvalRes.reason?.message || 'FAILED'),
        file: fileRes.status === 'fulfilled' ? 'OK' : (fileRes.reason?.message || 'FAILED'),
        bot: botRes.status === 'fulfilled' ? 'OK' : (botRes.reason?.message || 'FAILED')
      },
      formMatch: null,
      formError: null
    };

    if (approvalRes.status === 'rejected') console.error('[daily-withdrawal-approval] Approval token error:', approvalRes.reason?.message);
    if (fileRes.status === 'rejected') console.error('[daily-withdrawal-approval] File token error:', fileRes.reason?.message);
    if (!botToken) console.error('[daily-withdrawal-approval] Bot token error:', botRes.reason?.message);

    // 서식 컴포넌트 자동 조회 (API로 서식 구조를 읽어서 이름으로 매칭)
    let componentIds = {};
    if (approvalToken) {
      try {
        const formData = await getFormComponents(approvalToken, documentFormId);
        componentIds = matchComponentIds(formData);
        debugInfo.formMatch = Object.keys(componentIds);
        console.log('[daily-withdrawal-approval] 서식 컴포넌트 자동 매칭 완료:', Object.keys(componentIds).join(', '));
      } catch (formErr) {
        debugInfo.formError = formErr.message;
        console.error('[daily-withdrawal-approval] 서식 조회 실패 (빈 본문으로 진행):', formErr.message);
      }
    }

    const entityNames = { howlab: '하우랩', howpapa: '하우파파' };
    const results = [];

    // 입금처별로 1건씩 결재 문서 생성 (최대 2건)
    for (const [entity, items] of Object.entries(grouped)) {
      const entityName = entityNames[entity] || entity;
      const totalAmount = items.reduce((s, w) => s + (w.requested_amount || 0), 0);

      try {
        let fileId = null;
        let approvalDocId = null;

        // 1. 엑셀 생성 및 업로드 (approval 토큰으로 시도, 안 되면 file 토큰)
        const uploadToken = approvalToken || fileToken;
        if (uploadToken) {
          try {
            const koreanDate = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }).replace(/\. /g, '').replace('.', '');
            const fileName = `포인트입금_${entityName}_${koreanDate}.xlsx`;
            const excelBuffer = generateExcelBuffer(items, entityName);
            const uploadResult = await uploadFileToNaverWorks(uploadToken, fileName, excelBuffer);
            fileId = uploadResult.fileId || uploadResult.id || null;
            console.log(`[daily-withdrawal-approval] ${entityName} 엑셀 업로드 완료: ${fileId}`);
          } catch (uploadErr) {
            console.error(`[daily-withdrawal-approval] ${entityName} 엑셀 업로드 실패:`, uploadErr.message);
          }
        }

        // 2. 결재 문서 생성
        if (approvalToken) {
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

        // 3. DB 업데이트 (해당 입금처의 모든 건 - BIZ withdrawal_entity_map)
        const itemIds = items.map(w => w.id);

        await supabaseBiz
          .from('withdrawal_entity_map')
          .update({
            approval_status: 'PENDING',
            approval_requested_at: new Date().toISOString(),
            ...(approvalDocId ? { approval_doc_id: approvalDocId } : {})
          })
          .in('withdrawal_id', itemIds)
          .eq('source_db', 'korea');

        // 4. 감사 로그
        for (const w of items) {
          await supabaseBiz.from('withdrawal_audit_logs').insert({
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

    // 이메일 알림 발송 (mkt@cnecbiz.com)
    let emailResult = null;
    if (successResults.length > 0) {
      try {
        const koreanDate = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
        const totalAll = successResults.reduce((s, r) => s + r.totalAmount, 0);
        const countAll = successResults.reduce((s, r) => s + r.count, 0);
        const detailRows = successResults.map(r =>
          `<tr><td style="padding:8px;border:1px solid #e2e8f0;">${r.entity}</td>` +
          `<td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${r.count}건</td>` +
          `<td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${r.totalAmount.toLocaleString()}원</td>` +
          `<td style="padding:8px;border:1px solid #e2e8f0;">${r.approvalDocId || '-'}</td>` +
          `<td style="padding:8px;border:1px solid #e2e8f0;">${r.fileUploaded ? '✅' : '❌'}</td></tr>`
        ).join('');

        const emailHtml = `
          <div style="font-family:'Pretendard',sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#6C5CE7;">📋 결재 상신 완료 알림</h2>
            <p style="color:#4a5568;">${koreanDate} 출금 결재 상신이 완료되었습니다.</p>
            <div style="background:#f7fafc;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>총 건수:</strong> ${countAll}건</p>
              <p style="margin:4px 0;"><strong>총 금액:</strong> ${totalAll.toLocaleString()}원</p>
              <p style="margin:4px 0;"><strong>결재 문서:</strong> ${successResults.length}건</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead>
                <tr style="background:#6C5CE7;color:#fff;">
                  <th style="padding:8px;border:1px solid #e2e8f0;">입금처</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;">건수</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;">금액</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;">결재문서ID</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;">엑셀</th>
                </tr>
              </thead>
              <tbody>${detailRows}</tbody>
            </table>
            <p style="color:#a0aec0;font-size:12px;">이 메일은 자동 발송되었습니다. - CNECBIZ</p>
          </div>`;

        const baseUrl = process.env.URL || 'https://cnecbiz.com';
        const emailRes = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'mkt@cnecbiz.com',
            subject: `[결재상신완료] ${koreanDate} - ${countAll}건 / ${totalAll.toLocaleString()}원`,
            html: emailHtml
          })
        });
        const emailData = await emailRes.json();
        emailResult = { success: emailData.success, messageId: emailData.messageId };
        console.log('[daily-withdrawal-approval] 이메일 알림 발송:', emailResult.success ? '성공' : '실패');
      } catch (emailErr) {
        console.error('[daily-withdrawal-approval] 이메일 알림 발송 실패:', emailErr.message);
        emailResult = { success: false, error: emailErr.message };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: totalSuccess,
        failed: totalFailed,
        documents: results.length,
        results,
        emailNotification: emailResult,
        debug: debugInfo
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

// 스케줄 비활성화 (사용자 요청: 네이버웍스 결재상신 알림 OFF)
// 수동 트리거(관리자 UI)는 계속 작동함
// exports.config = { schedule: '0 1 * * 1-5' };  // 매주 월~금 UTC 01:00 = KST 10:00
