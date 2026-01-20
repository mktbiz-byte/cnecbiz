const { createClient } = require('@supabase/supabase-js');

/**
 * 5일 경과 영상 자동 확정 스케줄러
 *
 * 매일 자정(KST)에 실행되어 5일 이상 경과한 approved 상태의 영상을
 * 자동으로 최종 확정하고 포인트를 지급합니다.
 *
 * Netlify Scheduled Functions 설정 (netlify.toml):
 * [functions."auto-confirm-videos"]
 * schedule = "0 15 * * *"  # UTC 15:00 = KST 00:00
 */

exports.handler = async (event, context) => {
  console.log('=== 자동 확정 스케줄러 시작 ===');
  console.log('실행 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  // Supabase 클라이언트 설정
  const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const koreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_URL_BIZ;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY_BIZ || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!koreaUrl || !koreaKey) {
    console.error('Korea Supabase 환경변수 누락');
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing environment variables' }) };
  }

  const supabaseKorea = createClient(koreaUrl, koreaKey);
  const supabaseBiz = bizUrl && bizKey ? createClient(bizUrl, bizKey) : supabaseKorea;

  // 지급 내역 기록용
  const paymentRecords = [];

  try {
    // 5일 전 날짜 계산
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const cutoffDate = fiveDaysAgo.toISOString();

    console.log('5일 경과 기준 시간:', cutoffDate);

    // 자동 확정 대상 조회:
    // - status가 'approved'
    // - final_confirmed_at이 null
    // - approved_at이 5일 이전
    const { data: pendingSubmissions, error: fetchError } = await supabaseKorea
      .from('video_submissions')
      .select(`
        id,
        campaign_id,
        user_id,
        application_id,
        approved_at,
        status,
        sns_upload_url
      `)
      .eq('status', 'approved')
      .is('final_confirmed_at', null)
      .lt('approved_at', cutoffDate);

    if (fetchError) {
      console.error('자동 확정 대상 조회 실패:', fetchError);
      throw fetchError;
    }

    console.log(`자동 확정 대상: ${pendingSubmissions?.length || 0}건`);

    if (!pendingSubmissions || pendingSubmissions.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '자동 확정 대상이 없습니다.',
          processed: 0
        })
      };
    }

    let processedCount = 0;
    let errorCount = 0;

    // 이미 처리한 (user_id, campaign_id) 조합 추적 (멀티비디오 중복 방지)
    const processedUserCampaigns = new Set();

    for (const submission of pendingSubmissions) {
      try {
        console.log(`처리 중: submission_id=${submission.id}`);

        // 캠페인 정보 조회 (video_count, campaign_type 포함)
        const { data: campaign, error: campaignError } = await supabaseKorea
          .from('campaigns')
          .select('id, title, reward_points, point, video_count, campaign_type')
          .eq('id', submission.campaign_id)
          .single();

        if (campaignError || !campaign) {
          console.error(`캠페인 조회 실패 (submission_id=${submission.id}):`, campaignError);
          errorCount++;
          continue;
        }

        // 멀티비디오 캠페인 체크 (4주 챌린지, 올리브영 등)
        const isMultiVideo = campaign.video_count > 1 ||
          campaign.campaign_type === '4week_challenge' ||
          campaign.campaign_type === 'olive_young' ||
          campaign.campaign_type === 'multi_video';

        const userCampaignKey = `${submission.user_id}-${submission.campaign_id}`;

        // 멀티비디오 캠페인인 경우
        if (isMultiVideo) {
          // 이미 처리한 조합이면 스킵
          if (processedUserCampaigns.has(userCampaignKey)) {
            console.log(`이미 처리된 멀티비디오: ${userCampaignKey}`);
            continue;
          }

          // 해당 유저의 이 캠페인 모든 영상 조회
          const { data: allUserSubmissions } = await supabaseKorea
            .from('video_submissions')
            .select('id, status, video_number, week_number, final_confirmed_at')
            .eq('campaign_id', submission.campaign_id)
            .eq('user_id', submission.user_id);

          const requiredCount = campaign.video_count || 4; // 기본 4개 (4주 챌린지)
          const approvedCount = allUserSubmissions?.filter(s => s.status === 'approved' && !s.final_confirmed_at).length || 0;
          const completedCount = allUserSubmissions?.filter(s => s.status === 'completed' || s.final_confirmed_at).length || 0;

          console.log(`멀티비디오 캠페인: 필요=${requiredCount}, 승인됨=${approvedCount}, 완료됨=${completedCount}, 전체=${allUserSubmissions?.length || 0}`);

          // 모든 영상이 승인되지 않았으면 스킵
          if (approvedCount + completedCount < requiredCount) {
            console.log(`아직 모든 영상이 승인되지 않음. 스킵: ${userCampaignKey}`);
            processedUserCampaigns.add(userCampaignKey);
            continue;
          }

          // 모든 승인된 영상 한번에 확정
          const approvedSubmissions = allUserSubmissions?.filter(s => s.status === 'approved' && !s.final_confirmed_at) || [];

          for (const sub of approvedSubmissions) {
            await supabaseKorea
              .from('video_submissions')
              .update({
                status: 'completed',
                final_confirmed_at: new Date().toISOString(),
                auto_confirmed: true
              })
              .eq('id', sub.id);
          }

          processedUserCampaigns.add(userCampaignKey);
          console.log(`멀티비디오 전체 확정: ${approvedSubmissions.length}개 영상`);

        } else {
          // 단일 영상 캠페인 - 기존 로직
          const { error: updateError } = await supabaseKorea
            .from('video_submissions')
            .update({
              status: 'completed',
              final_confirmed_at: new Date().toISOString(),
              auto_confirmed: true
            })
            .eq('id', submission.id);

          if (updateError) {
            console.error(`video_submissions 업데이트 실패:`, updateError);
            errorCount++;
            continue;
          }
        }

        const pointAmount = campaign.reward_points || campaign.point || 0;

        // applications 업데이트 (BIZ DB)
        if (submission.application_id) {
          await supabaseBiz
            .from('applications')
            .update({ status: 'completed' })
            .eq('id', submission.application_id);
        }

        // 3. 포인트 지급
        if (pointAmount > 0 && submission.user_id) {
          // 크리에이터 프로필 조회 (Korea DB - 한국 크리에이터 포인트는 Korea DB에 저장)
          const { data: profile, error: profileError } = await supabaseKorea
            .from('user_profiles')
            .select('points, phone, email, name, full_name')
            .eq('id', submission.user_id)
            .single();

          if (profile) {
            // 포인트 업데이트
            const newPoints = (profile.points || 0) + pointAmount;
            await supabaseKorea
              .from('user_profiles')
              .update({ points: newPoints, updated_at: new Date().toISOString() })
              .eq('id', submission.user_id);

            // 포인트 히스토리 기록
            try {
              await supabaseKorea
                .from('point_history')
                .insert([{
                  user_id: submission.user_id,
                  campaign_id: campaign.id,
                  amount: pointAmount,
                  type: 'campaign_complete',
                  reason: `캠페인 자동 완료: ${campaign.title}`,
                  balance_after: newPoints,
                  created_at: new Date().toISOString()
                }]);
            } catch (historyError) {
              console.log('point_history 저장 실패:', historyError);
            }

            const creatorName = profile.name || profile.full_name || '크리에이터';

            // 알림톡 발송 (캠페인 완료 포인트 지급 - 025100001018)
            if (profile.phone) {
              try {
                const completedDate = new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul'
                });
                await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-kakao-notification`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    receiverNum: profile.phone,
                    receiverName: creatorName,
                    templateCode: '025100001018',
                    variables: {
                      '크리에이터명': creatorName,
                      '캠페인명': campaign.title,
                      '완료일': completedDate
                    }
                  })
                });
              } catch (e) {
                console.error('알림톡 발송 실패:', e);
              }
            }

            console.log(`포인트 지급 완료: user_id=${submission.user_id}, amount=${pointAmount}`);

            // 지급 내역 기록
            paymentRecords.push({
              creatorName,
              campaignTitle: campaign.title,
              pointAmount,
              newBalance: newPoints
            });
          }
        }

        processedCount++;
        console.log(`자동 확정 완료: submission_id=${submission.id}`);

      } catch (error) {
        console.error(`처리 중 오류 (submission_id=${submission.id}):`, error);
        errorCount++;
      }
    }

    // 네이버 웍스 알림 (매일 발송 - 처리 결과)
    try {
      const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      let message = `🤖 [자동 확정] ${now}\n\n`;

      if (processedCount > 0) {
        message += `✅ 처리: ${processedCount}건\n`;
        if (errorCount > 0) message += `❌ 오류: ${errorCount}건\n`;
        message += `\n📋 지급 내역:\n`;
        paymentRecords.forEach((record, idx) => {
          message += `${idx + 1}. ${record.creatorName}\n   - 캠페인: ${record.campaignTitle}\n   - 지급: ${record.pointAmount.toLocaleString()}P\n`;
        });
      } else {
        message += `📭 오늘 자동 확정 대상이 없습니다.`;
      }

      await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || '75c24874-e370-afd5-9da3-72918ba15a3c',
          message
        })
      });
      console.log('네이버 웍스 알림 발송 완료');
    } catch (e) {
      console.error('네이버 웍스 알림 실패:', e);
    }

    console.log(`=== 자동 확정 스케줄러 완료 ===`);
    console.log(`처리: ${processedCount}건, 오류: ${errorCount}건`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '자동 확정 처리 완료',
        processed: processedCount,
        errors: errorCount
      })
    };

  } catch (error) {
    console.error('자동 확정 스케줄러 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
