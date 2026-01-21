const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const XLSX = require('xlsx');

/**
 * 매주 월요일 오전 10시 (KST) 출금 신청 주간 보고서 발송
 * 지난주 월요일 ~ 일요일까지의 출금 신청을 네이버웍스로 전송
 *
 * Netlify Scheduled Function
 * Schedule: 매주 월요일 10:00 KST (01:00 UTC)
 */

// Supabase clients
const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
);

// 암호화 키
const ENCRYPTION_KEY = process.env.VITE_ENCRYPTION_KEY || 'cnec-default-encryption-key-2024';

// 주민번호 복호화 함수
async function decryptResidentNumber(encryptedText) {
  if (!encryptedText) return '';

  try {
    const { data, error } = await supabaseBiz.rpc('decrypt_text', {
      encrypted: encryptedText,
      key: ENCRYPTION_KEY
    });

    if (error) throw error;
    return data || '';
  } catch (error) {
    console.error('복호화 오류:', error);
    return '복호화실패';
  }
}

// 주민번호 마스킹 (앞 6자리만 표시)
function maskResidentNumber(number) {
  if (!number || number.length < 7) return number;
  return number.slice(0, 6) + '-' + '*'.repeat(7);
}

// 네이버웍스 Private Key
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

// JWT 생성
function generateJWT(clientId, serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientId,
    sub: serviceAccount,
    iat: now,
    exp: now + 3600,
    scope: 'bot'
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), PRIVATE_KEY);
  const base64Signature = signature.toString('base64url');

  return `${signatureInput}.${base64Signature}`;
}

// 네이버웍스 Access Token 발급
async function getAccessToken(clientId, clientSecret, serviceAccount) {
  return new Promise((resolve, reject) => {
    const jwt = generateJWT(clientId, serviceAccount);

    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'bot'
    }).toString();

    const options = {
      hostname: 'auth.worksmobile.com',
      path: '/oauth2/v2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).access_token);
        } else {
          reject(new Error(`Token error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 네이버웍스 메시지 전송
async function sendNaverWorksMessage(accessToken, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      content: { type: 'text', text: message }
    });

    const options = {
      hostname: 'www.worksapis.com',
      path: `/v1.0/bots/${botId}/channels/${channelId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve({ success: true });
        } else {
          reject(new Error(`Message error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 지난 주 범위 계산 (월요일 ~ 일요일)
function getLastWeekRange() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000; // KST = UTC + 9
  const kstNow = new Date(now.getTime() + kstOffset);

  const dayOfWeek = kstNow.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // 지난주 월요일
  const lastMonday = new Date(kstNow);
  lastMonday.setUTCDate(kstNow.getUTCDate() - daysFromMonday - 7);
  lastMonday.setUTCHours(0, 0, 0, 0);

  // 지난주 일요일
  const lastSunday = new Date(lastMonday);
  lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);
  lastSunday.setUTCHours(23, 59, 59, 999);

  return { monday: lastMonday, sunday: lastSunday };
}

// 숫자 포맷 (천 단위 콤마)
function formatNumber(num) {
  return (num || 0).toLocaleString('ko-KR');
}

// 날짜 포맷
function formatDate(date) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 엑셀 파일 생성 및 Supabase Storage 업로드
async function createAndUploadExcel(withdrawals, startDate, endDate) {
  try {
    // 엑셀 데이터 준비
    const excelData = withdrawals.map((w, index) => {
      const grossAmount = w.amount || 0;
      const incomeTax = Math.round(grossAmount * 0.03);
      const residentTax = Math.round(grossAmount * 0.003);
      const netAmount = grossAmount - incomeTax - residentTax;

      return {
        '순번': index + 1,
        '신청일': new Date(w.created_at).toLocaleDateString('ko-KR'),
        '이름': w.name || '',
        '은행': w.bank_name || '',
        '계좌번호': w.account_number || '',
        '신청금액': grossAmount,
        '소득세(3%)': incomeTax,
        '주민세(0.3%)': residentTax,
        '실지급액': netAmount,
        '상태': w.status === 'approved' ? '승인' : w.status === 'pending' ? '대기' : w.status
      };
    });

    // 합계 행 추가
    const totalGross = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    const totalIncomeTax = Math.round(totalGross * 0.03);
    const totalResidentTax = Math.round(totalGross * 0.003);
    const totalNet = totalGross - totalIncomeTax - totalResidentTax;

    excelData.push({
      '순번': '',
      '신청일': '',
      '이름': '합계',
      '은행': '',
      '계좌번호': '',
      '신청금액': totalGross,
      '소득세(3%)': totalIncomeTax,
      '주민세(0.3%)': totalResidentTax,
      '실지급액': totalNet,
      '상태': `총 ${withdrawals.length}건`
    });

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 6 },   // 순번
      { wch: 12 },  // 신청일
      { wch: 12 },  // 이름
      { wch: 12 },  // 은행
      { wch: 20 },  // 계좌번호
      { wch: 15 },  // 신청금액
      { wch: 12 },  // 소득세
      { wch: 12 },  // 주민세
      { wch: 15 },  // 실지급액
      { wch: 10 }   // 상태
    ];

    XLSX.utils.book_append_sheet(wb, ws, '출금신청목록');

    // 엑셀 파일을 버퍼로 생성
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 파일명 생성
    const startStr = `${startDate.getMonth() + 1}${startDate.getDate()}`.padStart(4, '0');
    const endStr = `${endDate.getMonth() + 1}${endDate.getDate()}`.padStart(4, '0');
    const fileName = `출금신청_${startStr}-${endStr}_${Date.now()}.xlsx`;

    // Supabase Storage에 업로드
    const { data, error } = await supabaseBiz.storage
      .from('reports')
      .upload(`withdrawals/${fileName}`, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });

    if (error) {
      console.error('엑셀 업로드 오류:', error);
      return null;
    }

    // 공개 URL 생성 (1주일 유효)
    const { data: urlData } = await supabaseBiz.storage
      .from('reports')
      .createSignedUrl(`withdrawals/${fileName}`, 60 * 60 * 24 * 7); // 7일

    return urlData?.signedUrl || null;
  } catch (error) {
    console.error('엑셀 생성 오류:', error);
    return null;
  }
}

exports.handler = async (event, context) => {
  // HTTP 요청 정보 로깅 (수동 테스트 확인용)
  const httpMethod = event.httpMethod || 'SCHEDULED';
  const isManualTest = httpMethod === 'GET' || httpMethod === 'POST';

  console.log('[Weekly Withdrawal Report] Starting...');
  console.log(`📌 실행 방식: ${isManualTest ? `수동 테스트 (${httpMethod})` : '스케줄 자동 실행'}`);
  console.log(`📅 실행 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  // 환경 변수 확인
  console.log('[ENV Check] VITE_SUPABASE_BIZ_URL:', process.env.VITE_SUPABASE_BIZ_URL ? '✅ SET' : '❌ NOT SET');
  console.log('[ENV Check] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('[ENV Check] VITE_SUPABASE_KOREA_URL:', process.env.VITE_SUPABASE_KOREA_URL ? '✅ SET' : '❌ NOT SET');
  console.log('[ENV Check] NAVER_WORKS_CLIENT_ID:', process.env.NAVER_WORKS_CLIENT_ID ? '✅ SET' : '❌ NOT SET');
  console.log('[ENV Check] NAVER_WORKS_BOT_ID:', process.env.NAVER_WORKS_BOT_ID ? '✅ SET' : '❌ NOT SET');
  console.log('[ENV Check] NAVER_WORKS_CHANNEL_ID:', process.env.NAVER_WORKS_CHANNEL_ID ? '✅ SET' : '❌ NOT SET');

  if (!process.env.VITE_SUPABASE_BIZ_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Error] 필수 환경 변수가 설정되지 않았습니다.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing required environment variables' })
    };
  }

  try {
    const { monday, sunday } = getLastWeekRange();
    console.log(`[Report Period] ${monday.toISOString()} ~ ${sunday.toISOString()}`);

    // BIZ DB에서 출금 신청 조회 (creator_withdrawal_requests)
    const { data: bizWithdrawals, error: bizError } = await supabaseBiz
      .from('creator_withdrawal_requests')
      .select('*')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true });

    if (bizError) {
      console.error('BIZ DB (creator_withdrawal_requests) 조회 오류:', bizError);
    }

    // BIZ DB에서 출금 신청 조회 (withdrawal_requests)
    const { data: wrWithdrawals, error: wrError } = await supabaseBiz
      .from('withdrawal_requests')
      .select('*')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true });

    if (wrError) {
      console.error('BIZ DB (withdrawal_requests) 조회 오류:', wrError);
    }

    // Korea DB에서 출금 신청 조회 (withdrawals 테이블)
    const { data: koreaWithdrawals, error: koreaError } = await supabaseKorea
      .from('withdrawals')
      .select('*')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true });

    if (koreaError) {
      console.error('Korea DB (withdrawals) 조회 오류:', koreaError);
    }

    // Korea DB에서 출금 신청 조회 (withdrawal_requests 테이블 - 주민번호가 여기에 저장됨)
    const { data: koreaWrWithdrawals, error: koreaWrError } = await supabaseKorea
      .from('withdrawal_requests')
      .select('*')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true });

    if (koreaWrError) {
      console.error('Korea DB (withdrawal_requests) 조회 오류:', koreaWrError);
    }

    // Korea DB user_profiles에서 주민번호 조회 (fallback)
    const allUserIds = [
      ...((koreaWithdrawals || []).map(w => w.user_id).filter(Boolean)),
      ...((koreaWrWithdrawals || []).map(w => w.user_id).filter(Boolean))
    ];
    const uniqueUserIds = [...new Set(allUserIds)];

    let userProfileResidentNumbers = {};
    if (uniqueUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseKorea
        .from('user_profiles')
        .select('user_id, resident_number_encrypted')
        .in('user_id', uniqueUserIds);

      if (!profilesError && profiles) {
        profiles.forEach(p => {
          if (p.resident_number_encrypted) {
            userProfileResidentNumbers[p.user_id] = p.resident_number_encrypted;
          }
        });
      }
    }

    // withdrawal_requests에서 주민번호 매핑
    let wrResidentNumbers = {};
    (koreaWrWithdrawals || []).forEach(w => {
      if (w.resident_number_encrypted && w.user_id) {
        wrResidentNumbers[w.user_id] = w.resident_number_encrypted;
      }
    });

    // 데이터 통합
    const existingIds = new Set();
    const allWithdrawals = [];

    // BIZ DB creator_withdrawal_requests
    (bizWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        allWithdrawals.push({
          ...w,
          source: 'biz',
          name: w.account_holder || 'Unknown',
          amount: w.requested_amount || w.amount || 0,
          resident_registration_number: w.resident_registration_number
        });
      }
    });

    // BIZ DB withdrawal_requests
    (wrWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        allWithdrawals.push({
          ...w,
          source: 'biz_wr',
          name: w.bank_account_holder || w.account_holder || 'Unknown',
          amount: w.amount || w.requested_amount || 0,
          bank_name: w.bank_name,
          account_number: w.bank_account_number || w.account_number,
          resident_registration_number: w.resident_registration_number || w.resident_number_encrypted || w.resident_number
        });
      }
    });

    // Korea DB withdrawals
    (koreaWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        // 주민번호: withdrawal → withdrawal_requests → user_profiles 순서로 확인
        const residentNum = w.resident_number_encrypted ||
                           w.resident_registration_number ||
                           w.resident_number ||
                           wrResidentNumbers[w.user_id] ||
                           userProfileResidentNumbers[w.user_id] ||
                           null;
        allWithdrawals.push({
          ...w,
          source: 'korea',
          name: w.bank_account_holder || 'Unknown',
          amount: w.amount || 0,
          bank_name: w.bank_name,
          account_number: w.bank_account_number,
          resident_registration_number: residentNum
        });
      }
    });

    // Korea DB withdrawal_requests (중복 제외한 것만 추가)
    (koreaWrWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        allWithdrawals.push({
          ...w,
          source: 'korea_wr',
          name: w.bank_account_holder || 'Unknown',
          amount: w.amount || 0,
          bank_name: w.bank_name,
          account_number: w.bank_account_number,
          resident_registration_number: w.resident_number_encrypted || userProfileResidentNumbers[w.user_id] || null
        });
      }
    });

    if (allWithdrawals.length === 0) {
      console.log('[Report] 지난주 출금 신청이 없습니다.');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No withdrawals to report' })
      };
    }

    // 메시지 생성
    const startStr = `${monday.getMonth() + 1}/${monday.getDate()}`;
    const endStr = `${sunday.getMonth() + 1}/${sunday.getDate()}`;

    let totalAmount = 0;
    let totalNetAmount = 0;
    let detailLines = [];

    for (const w of allWithdrawals) {
      const grossAmount = w.amount || 0;
      const incomeTax = Math.round(grossAmount * 0.03);
      const residentTax = Math.round(grossAmount * 0.003);
      const netAmount = grossAmount - incomeTax - residentTax;

      totalAmount += grossAmount;
      totalNetAmount += netAmount;

      // 주민번호 복호화 (암호화된 경우)
      let residentNum = '';
      if (w.resident_registration_number) {
        try {
          residentNum = await decryptResidentNumber(w.resident_registration_number);
          residentNum = maskResidentNumber(residentNum);
        } catch (e) {
          console.log(`[Info] 주민번호 복호화 실패 (source: ${w.source}):`, e.message);
          residentNum = '복호화실패';
        }
      }

      detailLines.push(
        `${formatDate(w.created_at)} | ${w.name} | ${formatNumber(grossAmount)}원 → ${formatNumber(netAmount)}원 | ${w.bank_name || ''} ${w.account_number || ''}`
      );
    }

    // 엑셀 파일 생성 및 업로드
    console.log('[Report] 엑셀 파일 생성 중...');
    const excelUrl = await createAndUploadExcel(allWithdrawals, monday, sunday);
    if (excelUrl) {
      console.log('[Report] 엑셀 파일 업로드 완료:', excelUrl);
    } else {
      console.log('[Report] 엑셀 파일 생성 실패 (메시지만 발송)');
    }

    const testLabel = isManualTest ? ' (수동 테스트)' : '';
    const message = `📋 [주간 출금 신청 보고서]${testLabel}
━━━━━━━━━━━━━━━━━━━━
📅 기간: ${startStr} ~ ${endStr}
📊 총 ${allWithdrawals.length}건

💰 총 신청금액: ${formatNumber(totalAmount)}원
💸 실지급액: ${formatNumber(totalNetAmount)}원
   (세금 3.3% 공제)
━━━━━━━━━━━━━━━━━━━━

📝 상세내역:
${detailLines.join('\n')}

━━━━━━━━━━━━━━━━━━━━
${excelUrl ? `📥 엑셀 다운로드:\n${excelUrl}\n\n` : ''}⏰ 발송시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

    // 네이버웍스로 메시지 전송
    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_WITHDRAWAL_CHANNEL_ID || process.env.NAVER_WORKS_CHANNEL_ID;
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

    if (!clientId || !clientSecret || !botId || !channelId) {
      console.error('네이버웍스 설정이 누락되었습니다.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Naver Works config missing' })
      };
    }

    const accessToken = await getAccessToken(clientId, clientSecret, serviceAccount);
    await sendNaverWorksMessage(accessToken, botId, channelId, message);

    console.log('[Report] 네이버웍스 메시지 전송 완료');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        executionType: isManualTest ? 'manual' : 'scheduled',
        message: `Weekly withdrawal report sent (${allWithdrawals.length} items)`,
        totalAmount: totalAmount,
        totalNetAmount: totalNetAmount,
        excelUrl: excelUrl || null,
        period: { start: monday.toISOString(), end: sunday.toISOString() },
        withdrawalDetails: allWithdrawals.slice(0, 5) // 처음 5개만 반환 (디버깅용)
      })
    };

  } catch (error) {
    console.error('[Report Error]:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Netlify Scheduled Function 설정
// 매주 월요일 오전 10시 KST = 01:00 UTC
exports.config = {
  schedule: '0 1 * * 1'  // 매주 월요일 01:00 UTC (10:00 KST)
};
