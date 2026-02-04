const { createClient } = require('@supabase/supabase-js');

/**
 * 일본 크리에이터 알림 발송 Function
 *
 * 발송 순서:
 * 1. LINE 메시지 시도
 * 2. LINE 실패 시 (친구 아님) → SMS 발송
 * 3. 이메일 발송 (항상)
 *
 * 사용법:
 * POST /.netlify/functions/send-japan-notification
 * Body: {
 *   type: "line_invitation" | "campaign_selected" | "profile_request" | "general"
 *   creatorId: "크리에이터 ID" 또는
 *   creatorEmail: "이메일"
 *   data: {
 *     creatorName: "이름",
 *     campaignName: "캠페인명",
 *     brandName: "브랜드명",
 *     ... (타입별 데이터)
 *   }
 * }
 */

// Japan Supabase
const getSupabaseJapan = () => {
  return createClient(
    process.env.VITE_SUPABASE_JAPAN_URL || process.env.SUPABASE_JAPAN_URL,
    process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
  );
};

// Gemini 번역
async function translateToJapanese(text) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey) return text;

  try {
    // 번역: 단순, 대량 → gemini-2.5-flash-lite (4K RPM, 무제한 RPD)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `다음 텍스트를 일본어로 자연스럽게 번역해주세요. 이모지와 줄바꿈은 그대로 유지하고, 번역된 텍스트만 출력하세요:\n\n${text}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
      })
    });

    if (!response.ok) return text;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
  } catch {
    return text;
  }
}

// 메시지 템플릿 (한국어 → 자동 번역)
const MESSAGE_TEMPLATES = {
  // LINE 친구 추가 초대
  line_invitation: (data) => ({
    line: `👋 안녕하세요, ${data.creatorName}님!\n\nCNEC BIZ에서 인플루언서 마케팅 캠페인을 진행하고 있습니다.\n\n캠페인 선정, 정산 등 중요한 알림을 LINE으로 보내드리기 위해 친구 추가를 부탁드립니다.\n\n아래 링크를 클릭하여 친구 추가를 해주세요:\n${data.lineAddUrl || 'https://lin.ee/cnec'}\n\n감사합니다! 🙏`,
    sms: `[CNEC] ${data.creatorName}님, 캠페인 알림을 위해 LINE 친구 추가를 부탁드립니다: ${data.lineAddUrl || 'https://lin.ee/cnec'}`,
    emailSubject: `[CNEC] LINE 친구 추가 안내`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#06C755,#00B900);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">CNEC BIZ</h1>
<p style="color:rgba(255,255,255,0.9);margin:10px 0 0;">LINE 友達追加のご案内</p>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<p style="font-size:14px;color:#666;line-height:1.6;">${translated.body}</p>
<div style="text-align:center;margin:30px 0;">
<a href="${data.lineAddUrl || 'https://lin.ee/cnec'}" style="display:inline-block;background:#06C755;color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">LINEで友達追加</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 캠페인 선정 알림
  campaign_selected: (data) => ({
    line: `🎉 축하합니다!\n\n${data.creatorName}님, "${data.campaignName}" 캠페인에 선정되셨습니다!\n\n브랜드: ${data.brandName || '-'}\n보상: ${data.reward || '협의'}\n마감일: ${data.deadline || '추후 안내'}\n\n자세한 내용은 아래 링크에서 확인해주세요:\n${data.guideUrl || 'https://cnec.jp'}\n\n감사합니다! 🙏`,
    sms: `[CNEC] ${data.creatorName}님, "${data.campaignName}" 캠페인에 선정! 상세: ${data.guideUrl || 'https://cnec.jp'} LINE친구추가: https://lin.ee/GuwmxOH`,
    emailSubject: `[CNEC] 🎉 캠페인 선정 안내 - ${data.campaignName}`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">🎉 キャンペーン選定</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;">
<p style="font-size:18px;font-weight:bold;color:#7c3aed;margin:0 0 15px;">${data.campaignName}</p>
<table width="100%">
<tr><td style="color:#666;padding:5px 0;">ブランド</td><td style="color:#333;text-align:right;">${data.brandName || '-'}</td></tr>
<tr><td style="color:#666;padding:5px 0;">報酬</td><td style="color:#7c3aed;font-weight:bold;text-align:right;">${data.reward || '協議'}</td></tr>
<tr><td style="color:#666;padding:5px 0;">締切</td><td style="color:#333;text-align:right;">${data.deadline || '追って連絡'}</td></tr>
</table>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.guideUrl || 'https://cnec.jp'}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">詳細を確認</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 프로필 등록 요청
  profile_request: (data) => ({
    line: `📝 프로필 등록 요청\n\n${data.creatorName}님, CNEC BIZ에서 프로필 등록을 요청드립니다.\n\n프로필 등록 후 다양한 캠페인에 참여하실 수 있습니다.\n\n아래 링크에서 등록해주세요:\n${data.profileUrl || 'https://cnec.jp/register'}\n\n감사합니다! 🙏`,
    sms: `[CNEC] ${data.creatorName}님, 프로필 등록 후 캠페인에 참여하세요: ${data.profileUrl || 'https://cnec.jp/register'} LINE친구추가: https://lin.ee/GuwmxOH`,
    emailSubject: `[CNEC] 프로필 등록 안내`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">CNEC BIZ</h1>
<p style="color:rgba(255,255,255,0.9);margin:10px 0 0;">プロフィール登録のご案内</p>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<p style="font-size:14px;color:#666;line-height:1.6;">${translated.body}</p>
<div style="text-align:center;margin:30px 0;">
<a href="${data.profileUrl || 'https://cnec.jp/register'}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">プロフィールを登録</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 영상 제출 마감 임박 알림
  video_deadline_reminder: (data) => ({
    line: `⏰ 영상 제출 마감 알림\n\n${data.creatorName}님, "${data.campaignName}" 캠페인의 영상 제출 마감일이 다가왔습니다.\n\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}마감일: ${data.deadline}\n\n기한 내에 영상을 제출해주세요!\n${data.submitUrl || 'https://cnec.jp/creator/mypage'}`,
    sms: `[CNEC] ${data.creatorName}님, "${data.campaignName}" ${data.stepInfo || '영상'} 마감일: ${data.deadline}. 기한 내 제출 부탁드립니다. LINE친구추가: https://lin.ee/GuwmxOH`,
    emailSubject: `[CNEC] ⏰ 영상 제출 마감 알림 - ${data.campaignName}`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">⏰ 動画提出締切</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<div style="background:#fffbeb;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #fcd34d;">
<p style="font-size:18px;font-weight:bold;color:#d97706;margin:0 0 15px;">${data.campaignName}</p>
${data.stepInfo ? `<p style="color:#92400e;font-weight:bold;margin:0 0 10px;">📌 ${data.stepInfo}</p>` : ''}
<p style="font-size:16px;color:#92400e;margin:0;"><strong>締切日：${data.deadline}</strong></p>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.submitUrl || 'https://cnec.jp/creator/mypage'}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">動画を提出</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 가이드 확인 요청
  guide_confirm_request: (data) => ({
    line: `📋 가이드 확인 요청\n\n${data.creatorName}님, "${data.campaignName}" 캠페인의 가이드가 등록되었습니다.\n\n브랜드: ${data.brandName || '-'}\n\n가이드를 확인하시고 촬영을 시작해주세요.\n${data.guideUrl || 'https://cnec.jp/creator/mypage'}`,
    sms: `[CNEC] ${data.creatorName}님, "${data.campaignName}" 가이드가 등록되었습니다. 확인 후 촬영을 시작해주세요. LINE친구추가: https://lin.ee/GuwmxOH`,
    emailSubject: `[CNEC] 📋 가이드 확인 요청 - ${data.campaignName}`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">📋 ガイド確認</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<div style="background:#ecfdf5;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #6ee7b7;">
<p style="font-size:18px;font-weight:bold;color:#059669;margin:0 0 15px;">${data.campaignName}</p>
<p style="color:#047857;margin:0;">ブランド：${data.brandName || '-'}</p>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.guideUrl || 'https://cnec.jp/creator/mypage'}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">ガイドを確認</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // SNS 업로드 요청
  sns_upload_request: (data) => ({
    line: `📤 SNS 업로드 요청\n\n${data.creatorName}님, "${data.campaignName}" 영상이 승인되었습니다!\n\n이제 SNS에 업로드하시고 아래 정보를 등록해주세요:\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}\n✅ SNS URL\n✅ 광고 코드\n✅ 클린 영상 (자막 없는 버전)\n\n마감일: ${data.deadline || '캠페인 종료일까지'}\n${data.uploadUrl || 'https://cnec.jp/creator/mypage'}`,
    sms: `[CNEC] "${data.campaignName}" 영상 승인! SNS 업로드 후 URL, 광고코드, 클린영상을 등록해주세요. LINE친구추가: https://lin.ee/GuwmxOH`,
    emailSubject: `[CNEC] 📤 SNS 업로드 요청 - ${data.campaignName}`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">📤 SNSアップロード</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<div style="background:#f5f3ff;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #c4b5fd;">
<p style="font-size:18px;font-weight:bold;color:#7c3aed;margin:0 0 15px;">${data.campaignName}</p>
${data.stepInfo ? `<p style="color:#6d28d9;font-weight:bold;margin:0 0 10px;">📌 ${data.stepInfo}</p>` : ''}
<div style="background:#fff;border-radius:6px;padding:15px;margin:15px 0;">
<p style="font-size:14px;color:#374151;margin:0 0 10px;"><strong>提出必要項目：</strong></p>
<ul style="margin:0;padding-left:20px;color:#4b5563;">
<li>SNS URL</li>
<li>広告コード</li>
<li>クリーン動画（字幕なし版）</li>
</ul>
</div>
<p style="color:#6d28d9;margin:0;"><strong>締切日：${data.deadline || 'キャンペーン終了まで'}</strong></p>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.uploadUrl || 'https://cnec.jp/creator/mypage'}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">アップロード</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 포인트 지급 완료
  points_awarded: (data) => ({
    line: `🎁 포인트 지급 완료!\n\n${data.creatorName}님, "${data.campaignName}" 캠페인의 보상이 지급되었습니다.\n\n지급 금액: ¥${data.points?.toLocaleString() || 0}\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}\n마이페이지에서 확인해주세요!`,
    sms: `[CNEC] "${data.campaignName}" 보상 ¥${data.points?.toLocaleString() || 0} 지급 완료! 마이페이지에서 확인하세요. LINE친구추가: https://lin.ee/GuwmxOH`,
    emailSubject: `[CNEC] 🎁 보상 지급 완료 - ${data.campaignName}`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#eab308,#ca8a04);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">🎁 報酬支給完了</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<div style="background:#fefce8;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #fde047;text-align:center;">
<p style="font-size:16px;color:#854d0e;margin:0 0 10px;">${data.campaignName}</p>
<p style="font-size:32px;font-weight:bold;color:#ca8a04;margin:0;">¥${data.points?.toLocaleString() || 0}</p>
${data.stepInfo ? `<p style="color:#92400e;margin:10px 0 0;">📌 ${data.stepInfo}</p>` : ''}
</div>
<div style="text-align:center;margin:30px 0;">
<a href="https://cnec.jp/creator/mypage" style="display:inline-block;background:linear-gradient(135deg,#eab308,#ca8a04);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">マイページを確認</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 영상 수정 요청
  video_review_request: (data) => ({
    line: `📹 영상 수정 요청\n\n${data.creatorName}님, "${data.campaignName}" 캠페인에서 영상 수정 요청이 있습니다.\n\n${data.stepInfo ? `📌 ${data.stepInfo}\n` : ''}피드백: ${data.feedback || '상세 내용을 확인해주세요.'}\n\n수정 후 다시 제출해주세요.\n${data.reviewUrl || 'https://cnec.jp/creator/mypage'}`,
    sms: `[CNEC] "${data.campaignName}" 영상 수정 요청이 있습니다. 확인 후 다시 제출해주세요. LINE친구추가: https://lin.ee/GuwmxOH`,
    emailSubject: `[CNEC] 📹 영상 수정 요청 - ${data.campaignName}`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">📹 動画修正リクエスト</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<div style="background:#fef2f2;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #fca5a5;">
<p style="font-size:18px;font-weight:bold;color:#dc2626;margin:0 0 15px;">${data.campaignName}</p>
${data.stepInfo ? `<p style="color:#991b1b;font-weight:bold;margin:0 0 10px;">📌 ${data.stepInfo}</p>` : ''}
<div style="background:#fff;border-radius:6px;padding:15px;margin:15px 0;">
<p style="font-size:14px;color:#374151;margin:0 0 10px;"><strong>フィードバック：</strong></p>
<p style="font-size:14px;color:#6b7280;margin:0;white-space:pre-wrap;">${data.feedback || '詳細をご確認ください。'}</p>
</div>
</div>
<div style="text-align:center;margin:30px 0;">
<a href="${data.reviewUrl || 'https://cnec.jp/creator/mypage'}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">動画を修正して再提出</a>
</div>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 출금 완료 알림
  withdrawal_complete: (data) => ({
    line: `💸 출금 완료!\n\n${data.creatorName}님, 출금 신청이 완료되었습니다.\n\n출금 금액: ¥${data.amount?.toLocaleString() || 0}\n입금 예정일: ${data.expectedDate || '영업일 기준 3-5일 이내'}\n\n등록하신 계좌로 입금될 예정입니다.\n감사합니다! 🙏`,
    sms: `[CNEC] 출금 완료! ¥${data.amount?.toLocaleString() || 0}이 등록 계좌로 입금 예정입니다. LINE친구추가: https://lin.ee/GuwmxOH`,
    emailSubject: `[CNEC] 💸 출금 완료 안내`,
    emailHtml: (translated) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">💸 出金完了</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="font-size:16px;color:#333;">${translated.greeting}</p>
<div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #86efac;text-align:center;">
<p style="font-size:14px;color:#166534;margin:0 0 10px;">出金金額</p>
<p style="font-size:32px;font-weight:bold;color:#16a34a;margin:0;">¥${data.amount?.toLocaleString() || 0}</p>
<p style="font-size:14px;color:#166534;margin:15px 0 0;">入金予定日：${data.expectedDate || '営業日基準3〜5日以内'}</p>
</div>
<p style="font-size:14px;color:#666;line-height:1.6;text-align:center;">ご登録の口座へ入金されます。<br>ありがとうございます！</p>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;">CNEC BIZ | support@cnecbiz.com</p>
</td></tr>
</table>
</body>
</html>`
  }),

  // 일반 알림
  general: (data) => ({
    line: data.message || '알림이 있습니다.',
    sms: data.message || '알림이 있습니다.',
    emailSubject: data.emailSubject || '[CNEC] 알림',
    emailHtml: () => data.emailHtml || `<p>${data.message}</p>`
  })
};

// LINE 메시지 발송
async function sendLineMessage(lineUserId, message) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken || !lineUserId) {
    return { success: false, error: 'LINE not configured or no user ID' };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text: message }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[LINE] Error: ${response.status} - ${errorText}`);

      // 친구가 아닌 경우 또는 차단된 경우
      if (response.status === 400 || response.status === 403) {
        return { success: false, error: 'NOT_FRIEND', details: errorText };
      }
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error('[LINE] Exception:', error);
    return { success: false, error: error.message };
  }
}

// SMS 발송
async function sendSms(phoneNumber, message) {
  try {
    const baseUrl = process.env.URL || 'https://cnecbiz.netlify.app';
    const response = await fetch(`${baseUrl}/.netlify/functions/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phoneNumber, message })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[SMS] Error:', error);
    return { success: false, error: error.message };
  }
}

// 이메일 발송
async function sendEmail(to, subject, html) {
  try {
    const baseUrl = process.env.URL || 'https://cnecbiz.netlify.app';
    const response = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html })
    });

    const result = await response.json();
    return { success: response.ok, ...result };
  } catch (error) {
    console.error('[Email] Error:', error);
    return { success: false, error: error.message };
  }
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

  try {
    const body = JSON.parse(event.body);
    const { type, creatorId, creatorEmail, creatorPhone, data = {} } = body;

    console.log(`[send-japan-notification] 요청 수신: type=${type}, creatorId=${creatorId || 'N/A'}, creatorEmail=${creatorEmail || 'N/A'}, creatorPhone=${creatorPhone || 'N/A'}`);

    if (!type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'type is required' })
      };
    }

    const supabase = getSupabaseJapan();
    let creator = null;

    // 크리에이터 정보 조회
    if (creatorId) {
      console.log(`[send-japan-notification] creatorId로 조회: ${creatorId}`);
      // 먼저 id 컬럼으로 시도
      const { data: c, error: e } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone, line_user_id')
        .eq('id', creatorId)
        .maybeSingle();

      if (c) {
        creator = c;
      } else {
        // id로 못 찾으면 user_id 컬럼으로 재시도
        console.log(`[send-japan-notification] id로 못 찾음, user_id 컬럼으로 재시도`);
        const { data: c2, error: e2 } = await supabase
          .from('user_profiles')
          .select('id, name, email, phone, line_user_id')
          .eq('user_id', creatorId)
          .maybeSingle();
        creator = c2;
        if (e2) console.log(`[send-japan-notification] user_id 조회 오류: ${e2.message}`);
      }
      if (e) console.log(`[send-japan-notification] id 조회 오류: ${e.message}`);
    } else if (creatorEmail) {
      console.log(`[send-japan-notification] creatorEmail로 조회: ${creatorEmail}`);
      const { data: c, error: e } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone, line_user_id')
        .eq('email', creatorEmail.toLowerCase())
        .single();
      creator = c;
      if (e) console.log(`[send-japan-notification] creatorEmail 조회 오류: ${e.message}`);
    }

    if (!creator) {
      // DB에서 못 찾은 경우: 요청에서 전달받은 정보로 대체 (이메일/전화번호가 있으면 발송 가능)
      if (creatorEmail || creatorPhone) {
        console.log(`[send-japan-notification] DB 조회 실패, 요청 데이터로 대체: email=${creatorEmail}, phone=${creatorPhone}`);
        creator = {
          name: data.creatorName || '크리에이터',
          email: creatorEmail,
          phone: creatorPhone,
          line_user_id: null
        };
      } else {
        console.log(`[send-japan-notification] 크리에이터 조회 실패 - creatorId: ${creatorId}, creatorEmail: ${creatorEmail}`);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Creator not found' })
        };
      }
    }

    // 요청에서 전달받은 phone이 있으면 DB 값 보완 (DB에 phone이 없는 경우)
    if (creatorPhone && !creator.phone) {
      creator.phone = creatorPhone;
    }

    console.log(`[send-japan-notification] 크리에이터 정보: ${creator.name}, line_user_id: ${creator.line_user_id || 'NONE'}, phone: ${creator.phone || 'NONE'}, email: ${creator.email || 'NONE'}`);

    // 데이터에 크리에이터 이름 추가
    data.creatorName = data.creatorName || creator.name || '크리에이터';

    // 템플릿 생성
    const template = MESSAGE_TEMPLATES[type];
    if (!template) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: `Unknown notification type: ${type}` })
      };
    }

    const messages = template(data);
    const results = {
      line: { attempted: false, success: false },
      sms: { attempted: false, success: false },
      email: { attempted: false, success: false }
    };

    // 1. LINE 메시지 시도 (일본어 번역)
    if (creator.line_user_id) {
      results.line.attempted = true;
      const translatedLineMessage = await translateToJapanese(messages.line);
      const lineResult = await sendLineMessage(creator.line_user_id, translatedLineMessage);
      results.line.success = lineResult.success;
      results.line.error = lineResult.error;

      console.log(`[Japan Notification] LINE result:`, lineResult);
    }

    // 2. LINE 실패 또는 친구 아님 → SMS 발송
    if (!results.line.success && creator.phone) {
      results.sms.attempted = true;
      const translatedSmsMessage = await translateToJapanese(messages.sms);
      const smsResult = await sendSms(creator.phone, translatedSmsMessage);
      results.sms.success = smsResult.success;
      results.sms.error = smsResult.error;

      console.log(`[Japan Notification] SMS result:`, smsResult);
    }

    // 3. 이메일 발송 (항상)
    if (creator.email) {
      results.email.attempted = true;

      // 이메일 내용 번역
      const translatedGreeting = await translateToJapanese(`안녕하세요, ${data.creatorName}님!`);
      const translatedBody = await translateToJapanese(messages.line.split('\n').slice(2, -2).join('\n'));

      const emailHtml = messages.emailHtml({
        greeting: translatedGreeting,
        body: translatedBody
      });

      const emailResult = await sendEmail(
        creator.email,
        messages.emailSubject,
        emailHtml
      );
      results.email.success = emailResult.success;
      results.email.error = emailResult.error;

      console.log(`[Japan Notification] Email result:`, emailResult);
    }

    // 결과 요약
    const anySuccess = results.line.success || results.sms.success || results.email.success;

    return {
      statusCode: anySuccess ? 200 : 500,
      headers,
      body: JSON.stringify({
        success: anySuccess,
        message: anySuccess
          ? `알림 발송 완료 (LINE: ${results.line.success}, SMS: ${results.sms.success}, Email: ${results.email.success})`
          : '모든 알림 발송 실패',
        results,
        creatorId: creator.id
      })
    };

  } catch (error) {
    console.error('[Japan Notification] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
