const { createClient } = require('@supabase/supabase-js');

/**
 * 5일 경과 영상 자동 확정 스케줄러 (멀티리전: 한국/일본/미국)
 *
 * 매일 자정(KST)에 실행되어 5일 이상 경과한 approved 상태의 영상을
 * 자동으로 최종 확정하고 포인트를 지급합니다.
 *
 * Netlify Scheduled Functions 설정 (netlify.toml):
 * [functions."auto-confirm-videos"]
 * schedule = "0 15 * * *"  # UTC 15:00 = KST 00:00
 */

// 중복 실행 방지를 위한 실행 ID
const EXECUTION_KEY = 'auto-confirm-videos';
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5분 내 중복 실행 방지

exports.handler = async (event, context) => {
  const executionTime = new Date();
  console.log('=== 자동 확정 스케줄러 시작 (멀티리전) ===');
  console.log('실행 시간:', executionTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  // BIZ DB 클라이언트
  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseBiz = bizUrl && bizKey ? createClient(bizUrl, bizKey) : null;

  // 리전별 DB 설정
  const regionConfigs = {
    korea: {
      url: process.env.VITE_SUPABASE_KOREA_URL,
      key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
      label: '🇰🇷 한국'
    },
    japan: {
      url: process.env.VITE_SUPABASE_JAPAN_URL,
      key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY,
      label: '🇯🇵 일본'
    },
    us: {
      url: process.env.VITE_SUPABASE_US_URL,
      key: process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY,
      label: '🇺🇸 미국'
    }
  };

  // 중복 실행 방지 체크
  if (supabaseBiz) {
    try {
      const { data: lastExec } = await supabaseBiz
        .from('scheduler_executions')
        .select('executed_at')
        .eq('function_name', EXECUTION_KEY)
        .order('executed_at', { ascending: false })
        .limit(1)
        .single();

      if (lastExec) {
        const lastExecTime = new Date(lastExec.executed_at);
        const timeDiff = executionTime.getTime() - lastExecTime.getTime();
        if (timeDiff < DUPLICATE_WINDOW_MS) {
          console.log(`중복 실행 감지: ${Math.round(timeDiff / 1000)}초 전에 실행됨. 스킵합니다.`);
          return {
            statusCode: 200,
            body: JSON.stringify({ success: true, skipped: true, reason: 'Duplicate execution prevented' })
          };
        }
      }

      await supabaseBiz
        .from('scheduler_executions')
        .upsert({
          function_name: EXECUTION_KEY,
          executed_at: executionTime.toISOString()
        }, { onConflict: 'function_name' });
    } catch (e) {
      console.log('중복 실행 체크 테이블 없음, 계속 진행:', e.message);
    }
  }

  // 전체 지급 내역 기록용
  const allPaymentRecords = [];
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    // 5일 전 날짜 계산
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const cutoffDate = fiveDaysAgo.toISOString();
    console.log('5일 경과 기준 시간:', cutoffDate);

    // 각 리전별로 처리
    for (const [regionId, config] of Object.entries(regionConfigs)) {
      if (!config.url || !config.key) {
        console.log(`[${regionId}] Supabase 환경변수 누락, 스킵`);
        continue;
      }

      console.log(`\n--- [${regionId}] 처리 시작 ---`);
      const regionDB = createClient(config.url, config.key);
      const bizDB = supabaseBiz || regionDB;

      let processedCount = 0;
      let errorCount = 0;
      const processedUserCampaigns = new Set();

      try {
        // 자동 확정 대상 조회
        const { data: pendingSubmissions, error: fetchError } = await regionDB
          .from('video_submissions')
          .select('id, campaign_id, user_id, application_id, approved_at, status, sns_upload_url')
          .eq('status', 'approved')
          .is('final_confirmed_at', null)
          .lt('approved_at', cutoffDate);

        if (fetchError) {
          console.error(`[${regionId}] 자동 확정 대상 조회 실패:`, fetchError);
          totalErrors++;
          continue;
        }

        console.log(`[${regionId}] 자동 확정 대상: ${pendingSubmissions?.length || 0}건`);

        if (!pendingSubmissions || pendingSubmissions.length === 0) continue;

        for (const submission of pendingSubmissions) {
          try {
            // 캠페인 정보 조회 (리전 DB에서 먼저, 없으면 BIZ DB에서)
            let campaign = null;
            const { data: regionCampaign } = await regionDB
              .from('campaigns')
              .select('id, title, reward_points, creator_points_override, video_count, campaign_type')
              .eq('id', submission.campaign_id)
              .single();

            campaign = regionCampaign;

            if (!campaign && bizDB !== regionDB) {
              const { data: bizCampaign } = await bizDB
                .from('campaigns')
                .select('id, title, reward_points, creator_points_override, video_count, campaign_type')
                .eq('id', submission.campaign_id)
                .single();
              campaign = bizCampaign;
            }

            if (!campaign) {
              console.error(`[${regionId}] 캠페인 조회 실패 (submission_id=${submission.id})`);
              errorCount++;
              continue;
            }

            // 멀티비디오 캠페인 체크
            const is4WeekChallenge = campaign.campaign_type === '4week_challenge';
            const isOliveyoung = campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale';
            const isMultiVideo = campaign.video_count > 1 ||
              is4WeekChallenge || isOliveyoung || campaign.campaign_type === 'multi_video';

            const userCampaignKey = `${submission.user_id}-${submission.campaign_id}`;

            // 멀티비디오 캠페인
            if (isMultiVideo) {
              if (processedUserCampaigns.has(userCampaignKey)) continue;

              const { data: allUserSubmissions } = await regionDB
                .from('video_submissions')
                .select('id, status, video_number, week_number, final_confirmed_at')
                .eq('campaign_id', submission.campaign_id)
                .eq('user_id', submission.user_id);

              const requiredCount = is4WeekChallenge ? 4 : isOliveyoung ? 2 : (campaign.video_count || 4);
              const approvedCount = allUserSubmissions?.filter(s => s.status === 'approved' && !s.final_confirmed_at).length || 0;
              const completedCount = allUserSubmissions?.filter(s => s.status === 'completed' || s.final_confirmed_at).length || 0;

              console.log(`[${regionId}] 멀티비디오: 필요=${requiredCount}, 승인=${approvedCount}, 완료=${completedCount}`);

              if (approvedCount + completedCount < requiredCount) {
                processedUserCampaigns.add(userCampaignKey);
                continue;
              }

              // 모든 승인된 영상 한번에 확정
              const approvedSubmissions = allUserSubmissions?.filter(s => s.status === 'approved' && !s.final_confirmed_at) || [];
              for (const sub of approvedSubmissions) {
                await regionDB
                  .from('video_submissions')
                  .update({ status: 'completed', final_confirmed_at: new Date().toISOString(), auto_confirmed: true })
                  .eq('id', sub.id);
              }

              processedUserCampaigns.add(userCampaignKey);
              console.log(`[${regionId}] 멀티비디오 전체 확정: ${approvedSubmissions.length}개 영상`);

            } else {
              // 단일 영상
              const { error: updateError } = await regionDB
                .from('video_submissions')
                .update({ status: 'completed', final_confirmed_at: new Date().toISOString(), auto_confirmed: true })
                .eq('id', submission.id);

              if (updateError) {
                console.error(`[${regionId}] video_submissions 업데이트 실패:`, updateError);
                errorCount++;
                continue;
              }
            }

            // 포인트 금액 (creator_points_override > reward_points)
            const pointAmount = campaign.creator_points_override || campaign.reward_points || 0;

            // applications 업데이트 (BIZ DB)
            if (submission.application_id) {
              await bizDB
                .from('applications')
                .update({ status: 'completed' })
                .eq('id', submission.application_id);
            }

            // 포인트 지급
            if (pointAmount > 0 && submission.user_id) {
              const { data: profile } = await regionDB
                .from('user_profiles')
                .select('points, phone, email, name, full_name')
                .eq('id', submission.user_id)
                .single();

              if (profile) {
                const newPoints = (profile.points || 0) + pointAmount;
                await regionDB
                  .from('user_profiles')
                  .update({ points: newPoints, updated_at: new Date().toISOString() })
                  .eq('id', submission.user_id);

                // point_transactions 기록
                try {
                  await regionDB
                    .from('point_transactions')
                    .insert({
                      user_id: submission.user_id,
                      amount: pointAmount,
                      transaction_type: 'campaign_payment',
                      description: `캠페인 자동 완료: ${campaign.title}`,
                      related_campaign_id: campaign.id,
                      created_at: new Date().toISOString()
                    });
                } catch (txError) {
                  console.log(`[${regionId}] point_transactions 저장 실패:`, txError);
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
                    console.error(`[${regionId}] 알림톡 발송 실패:`, e);
                  }
                }

                console.log(`[${regionId}] 포인트 지급 완료: user_id=${submission.user_id}, amount=${pointAmount}`);

                allPaymentRecords.push({
                  region: config.label,
                  creatorName,
                  campaignTitle: campaign.title,
                  pointAmount,
                  newBalance: newPoints
                });
              }
            }

            processedCount++;
          } catch (error) {
            console.error(`[${regionId}] 처리 중 오류 (submission_id=${submission.id}):`, error);
            errorCount++;
          }
        }

        console.log(`[${regionId}] 처리: ${processedCount}건, 오류: ${errorCount}건`);
        totalProcessed += processedCount;
        totalErrors += errorCount;

      } catch (regionError) {
        console.error(`[${regionId}] 리전 처리 오류:`, regionError);
        totalErrors++;
      }
    }

    // 네이버 웍스 알림 (전체 리전 결과)
    try {
      const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      let message = `🤖 [자동 확정] ${now}\n\n`;

      if (totalProcessed > 0) {
        message += `✅ 처리: ${totalProcessed}건\n`;
        if (totalErrors > 0) message += `❌ 오류: ${totalErrors}건\n`;
        message += `\n📋 지급 내역:\n`;
        allPaymentRecords.forEach((record, idx) => {
          message += `${idx + 1}. ${record.region} ${record.creatorName}\n   - 캠페인: ${record.campaignTitle}\n   - 지급: ${record.pointAmount.toLocaleString()}P\n`;
        });
      } else {
        message += `📭 오늘 자동 확정 대상이 없습니다. (한국/일본/미국 전체)`;
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

    console.log(`\n=== 자동 확정 스케줄러 완료 ===`);
    console.log(`전체 처리: ${totalProcessed}건, 오류: ${totalErrors}건`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '자동 확정 처리 완료 (멀티리전)',
        processed: totalProcessed,
        errors: totalErrors
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
