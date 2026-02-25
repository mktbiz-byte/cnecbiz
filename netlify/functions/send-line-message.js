const { createClient } = require('@supabase/supabase-js');

/**
 * LINE 메시지 발송 Function (자동 번역 지원)
 *
 * 사용법:
 * POST /.netlify/functions/send-line-message
 * Body: {
 *   userId: "LINE User ID" (직접 지정) 또는
 *   creatorId: "크리에이터 ID" (DB에서 line_user_id 조회) 또는
 *   creatorEmail: "이메일" (DB에서 조회)
 *   message: "메시지 내용" 또는
 *   messages: [{ type: 'text', text: '...' }] (복수 메시지)
 *   templateType: 'campaign_selected' | 'signup_complete' | 'payment_complete' 등 (템플릿 사용시)
 *   templateData: { ... } (템플릿 데이터)
 *   translate: true/false (번역 활성화, 기본: true)
 *   targetLanguage: 'ja' | 'en' | 'zh-TW' (타겟 언어, 기본: 'ja')
 * }
 */

// Gemini API를 통한 번역
async function translateText(text, targetLanguage = 'ja') {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.warn('[LINE] Gemini API key not found, skipping translation');
    return text;
  }

  const languageNames = {
    ja: '일본어',
    en: '영어',
    'zh-TW': '중국어 번체',
    ko: '한국어'
  };

  try {
    // 표준 Gemini API 엔드포인트 사용
    // 번역: 단순, 대량 → gemini-2.5-flash-lite (4K RPM, 무제한 RPD)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `다음 텍스트를 ${languageNames[targetLanguage]}로 자연스럽게 번역해주세요. 이모지와 줄바꿈은 그대로 유지하고, 번역된 텍스트만 출력하세요:\n\n${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LINE] Translation API error:', errorText);
      return text;
    }

    const data = await response.json();
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    console.log(`[LINE] Translated: "${text.substring(0, 30)}..." → "${translated?.substring(0, 30)}..."`);
    return translated || text;
  } catch (error) {
    console.error('[LINE] Translation error:', error);
    return text;
  }
}

// Supabase 클라이언트 (일본 DB)
const getSupabase = () => {
  return createClient(
    process.env.VITE_SUPABASE_JAPAN_URL || process.env.VITE_SUPABASE_JAPAN_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// 메시지 템플릿
const MESSAGE_TEMPLATES = {
  // 캠페인 선정 알림
  campaign_selected: (data) => ({
    type: 'text',
    text: `🎉 축하합니다!\n\n${data.creatorName}님, "${data.campaignName}" 캠페인에 선정되셨습니다!\n\n브랜드: ${data.brandName}\n마감일: ${data.deadline || '추후 안내'}\n\n자세한 내용은 CNEC BIZ에서 확인해주세요.\n${data.guideUrl || 'https://cnecbiz.com'}`
  }),

  // 가입 완료 알림
  signup_complete: (data) => ({
    type: 'text',
    text: `✅ 가입 완료!\n\n${data.creatorName}님, CNEC BIZ 크리에이터 가입이 완료되었습니다.\n\n이제 다양한 캠페인에 참여하실 수 있습니다.\n캠페인 선정, 정산 등 중요한 알림을 LINE으로 보내드릴게요!\n\n마이페이지: https://cnecbiz.com/creator/mypage`
  }),

  // 정산 완료 알림
  payment_complete: (data) => ({
    type: 'text',
    text: `💰 정산 완료!\n\n${data.creatorName}님, 정산금이 입금되었습니다.\n\n금액: ${data.amount?.toLocaleString()}원\n캠페인: ${data.campaignName || '-'}\n입금일: ${data.paymentDate || new Date().toLocaleDateString('ko-KR')}\n\n정산 내역은 마이페이지에서 확인하실 수 있습니다.`
  }),

  // 영상 검토 요청
  video_review_request: (data) => ({
    type: 'text',
    text: `📹 영상 검토 요청\n\n${data.creatorName}님, 제출하신 영상에 수정 요청이 있습니다.\n\n캠페인: ${data.campaignName}\n피드백: ${data.feedback || '상세 내용을 확인해주세요.'}\n\n수정 후 다시 제출해주세요.\n${data.reviewUrl || 'https://cnecbiz.com/creator/mypage'}`
  }),

  // 영상 승인 완료
  video_approved: (data) => ({
    type: 'text',
    text: `✅ 영상 승인 완료!\n\n${data.creatorName}님, 제출하신 영상이 승인되었습니다.\n\n캠페인: ${data.campaignName}\n\n업로드 마감일을 확인하시고 기한 내에 업로드해주세요.`
  }),

  // 영상 제출 마감 임박 알림 (일본어)
  video_deadline_reminder: (data) => ({
    type: 'text',
    text: `⏰ 동영상 제출 마감 알림\n\n${data.creatorName}님, "${data.campaignName}" 캠페인의 영상 제출 마감일이 다가왔습니다.\n\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}마감일: ${data.deadline}\n\n기한 내에 영상을 제출해주세요!\n${data.submitUrl || 'https://cnecbiz.com/creator/mypage'}`
  }),

  // 가이드 확인 요청 (일본어)
  guide_confirm_request: (data) => ({
    type: 'text',
    text: `📋 가이드 확인 요청\n\n${data.creatorName}님, "${data.campaignName}" 캠페인의 가이드가 등록되었습니다.\n\n브랜드: ${data.brandName}\n\n가이드를 확인하시고 촬영을 시작해주세요.\n${data.guideUrl || 'https://cnecbiz.com/creator/mypage'}`
  }),

  // SNS 업로드 완료 요청 (일본어)
  sns_upload_request: (data) => ({
    type: 'text',
    text: `📤 SNS 업로드 요청\n\n${data.creatorName}님, "${data.campaignName}" 영상이 승인되었습니다!\n\n이제 SNS에 업로드하시고 URL을 등록해주세요.\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}\n✅ 광고 코드 입력\n✅ 클린 영상 (자막 없는 버전) 제출\n\n마감일: ${data.deadline || '캠페인 종료일까지'}\n${data.uploadUrl || 'https://cnecbiz.com/creator/mypage'}`
  }),

  // 포인트 지급 완료 (일본어)
  points_awarded: (data) => ({
    type: 'text',
    text: `🎁 포인트 지급 완료!\n\n${data.creatorName}님, "${data.campaignName}" 캠페인의 포인트가 지급되었습니다.\n\n지급 포인트: ${data.points?.toLocaleString() || 0}P\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}\n마이페이지에서 확인해주세요!`
  }),

  // 4주 챌린지 주차별 알림 (일본어)
  weekly_challenge_reminder: (data) => ({
    type: 'text',
    text: `🗓️ ${data.weekNumber}주차 영상 제출 알림\n\n${data.creatorName}님, "${data.campaignName}" ${data.weekNumber}주차 영상 제출 마감일이 다가왔습니다.\n\n마감일: ${data.deadline}\n\n이번 주 영상을 잊지 말고 제출해주세요!\n${data.submitUrl || 'https://cnecbiz.com/creator/mypage'}`
  }),

  // 메가와리 스텝별 알림 (일본어)
  megawari_step_reminder: (data) => ({
    type: 'text',
    text: `🎯 ${data.stepNumber === 1 ? '1차' : '2차'} 영상 제출 알림\n\n${data.creatorName}님, "${data.campaignName}" ${data.stepNumber === 1 ? '1차' : '2차'} 영상 제출 마감일이 다가왔습니다.\n\n마감일: ${data.deadline}\n\n기한 내에 영상을 제출해주세요!\n${data.submitUrl || 'https://cnecbiz.com/creator/mypage'}`
  }),

  // 선정 취소 알림
  selection_cancelled: (data) => ({
    type: 'text',
    text: `❌ 캠페인 선정 취소 안내\n\n${data.creatorName}님, 안타깝게도 "${data.campaignName}" 캠페인 선정이 취소되었습니다.\n\n📌 취소 사유:\n${data.reason || '별도 안내 없음'}\n\n문의사항이 있으시면 담당자에게 연락 부탁드립니다.\n\n다른 캠페인 참여 기회를 기다려주세요!`
  }),

  // 가이드 전달 알림
  guide_delivered: (data) => ({
    type: 'text',
    text: `📋 촬영 가이드 전달\n\n${data.creatorName}님, "${data.campaignName}" 캠페인의 촬영 가이드가 도착했습니다!\n\n📅 제출 마감일: ${data.deadline || '확인 필요'}\n\n이메일을 확인하시고 가이드에 따라 촬영을 진행해주세요.\n\n문의사항이 있으시면 언제든 연락 주세요! 🙏`
  }),

  // 출금 신청 완료 알림
  withdrawal_complete: (data) => ({
    type: 'text',
    text: `💸 출금 신청 완료!\n\n${data.creatorName}님, 출금 신청이 완료되었습니다.\n\n출금 금액: ¥${data.amount?.toLocaleString() || 0}\n입금 예정일: ${data.expectedDate || '영업일 기준 3-5일 이내'}\n\n등록하신 계좌로 입금될 예정입니다.\n감사합니다! 🙏`
  }),

  // 입금 완료 알림
  deposit_complete: (data) => ({
    type: 'text',
    text: `✅ 입금 완료!\n\n${data.creatorName}님, 출금 신청하신 금액이 입금 완료되었습니다.\n\n입금 금액: ¥${data.amount?.toLocaleString() || 0}\n입금일: ${data.depositDate || '본일'}\n\n등록하신 계좌를 확인해주세요.\n감사합니다! 🙏`
  }),

  // 일반 알림
  general: (data) => ({
    type: 'text',
    text: data.message || '알림이 있습니다.'
  })
};

// LINE Push Message 발송
async function pushMessage(userId, messages, accessToken) {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      to: userId,
      messages: Array.isArray(messages) ? messages : [messages]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LINE API error: ${response.status} - ${error}`);
  }

  return true;
}

// Multicast (여러 사용자에게 동시 발송)
async function multicastMessage(userIds, messages, accessToken) {
  if (userIds.length === 0) return { success: true, sent: 0 };

  const response = await fetch('https://api.line.me/v2/bot/message/multicast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      to: userIds,
      messages: Array.isArray(messages) ? messages : [messages]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LINE multicast error: ${response.status} - ${error}`);
  }

  return { success: true, sent: userIds.length };
}

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

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'LINE access token not configured' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const {
      userId,
      userIds,
      creatorId,
      creatorEmail,
      creatorIds,
      message,
      messages,
      templateType,
      templateData,
      translate = true,  // 기본적으로 번역 활성화
      targetLanguage = 'ja'  // 기본 일본어
    } = body;

    const supabase = getSupabase();
    let targetUserIds = [];

    // 1. 직접 userId 지정
    if (userId) {
      targetUserIds = [userId];
    }
    // 2. 여러 userId 지정
    else if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    }
    // 3. creatorId로 조회
    else if (creatorId) {
      // 먼저 id 컬럼으로 시도
      let creator = null;
      const { data: c1 } = await supabase
        .from('user_profiles')
        .select('line_user_id, name')
        .eq('id', creatorId)
        .maybeSingle();

      if (c1) {
        creator = c1;
      } else {
        // id로 못 찾으면 user_id 컬럼으로 재시도
        const { data: c2 } = await supabase
          .from('user_profiles')
          .select('line_user_id, name')
          .eq('user_id', creatorId)
          .maybeSingle();
        creator = c2;
      }

      if (creator?.line_user_id) {
        targetUserIds = [creator.line_user_id];
        if (templateData) templateData.creatorName = templateData.creatorName || creator.name;
      }
    }
    // 4. 여러 creatorId로 조회
    else if (creatorIds && Array.isArray(creatorIds)) {
      // id 컬럼으로 조회
      const { data: creators1 } = await supabase
        .from('user_profiles')
        .select('id, line_user_id')
        .in('id', creatorIds)
        .not('line_user_id', 'is', null);

      const foundIds = (creators1 || []).map(c => c.id);
      const notFoundIds = creatorIds.filter(id => !foundIds.includes(id));

      // 못 찾은 id들은 user_id 컬럼으로 재시도
      let creators2 = [];
      if (notFoundIds.length > 0) {
        const { data: c2 } = await supabase
          .from('user_profiles')
          .select('line_user_id')
          .in('user_id', notFoundIds)
          .not('line_user_id', 'is', null);
        creators2 = c2 || [];
      }

      const allCreators = [...(creators1 || []), ...creators2];
      if (allCreators.length > 0) {
        targetUserIds = allCreators.map(c => c.line_user_id);
      }
    }
    // 5. 이메일로 조회
    else if (creatorEmail) {
      const { data: creator } = await supabase
        .from('user_profiles')
        .select('line_user_id, name')
        .eq('email', creatorEmail.toLowerCase())
        .single();

      if (creator?.line_user_id) {
        targetUserIds = [creator.line_user_id];
        if (templateData) templateData.creatorName = templateData.creatorName || creator.name;
      }
    }

    if (targetUserIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No LINE user found',
          message: '해당 사용자의 LINE 연동 정보가 없습니다.'
        })
      };
    }

    // 메시지 생성
    let finalMessages;

    if (templateType && MESSAGE_TEMPLATES[templateType]) {
      finalMessages = [MESSAGE_TEMPLATES[templateType](templateData || {})];
    } else if (messages) {
      finalMessages = messages;
    } else if (message) {
      finalMessages = [{ type: 'text', text: message }];
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // 번역 적용 (translate가 true이고, targetLanguage가 'ko'가 아닌 경우)
    if (translate && targetLanguage !== 'ko') {
      console.log(`[LINE] Translating messages to ${targetLanguage}...`);
      for (let i = 0; i < finalMessages.length; i++) {
        if (finalMessages[i].type === 'text' && finalMessages[i].text) {
          const originalText = finalMessages[i].text;
          finalMessages[i].text = await translateText(originalText, targetLanguage);
          console.log(`[LINE] Translated: ${originalText.substring(0, 50)}... → ${finalMessages[i].text.substring(0, 50)}...`);
        }
      }
    }

    // 발송
    let result;
    if (targetUserIds.length === 1) {
      await pushMessage(targetUserIds[0], finalMessages, accessToken);
      result = { success: true, sent: 1 };
    } else {
      // 500명씩 나눠서 발송 (LINE API 제한)
      let totalSent = 0;
      for (let i = 0; i < targetUserIds.length; i += 500) {
        const batch = targetUserIds.slice(i, i + 500);
        await multicastMessage(batch, finalMessages, accessToken);
        totalSent += batch.length;
      }
      result = { success: true, sent: totalSent };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Send LINE message error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
