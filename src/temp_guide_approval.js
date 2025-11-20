// 가이드 승인 및 알림 발송 함수
const handleGuideApproval = async (participantIds) => {
  if (!participantIds || participantIds.length === 0) {
    alert('승인할 크리에이터를 선택해주세요.')
    return
  }

  if (!confirm(`${participantIds.length}명의 크리에이터에게 가이드를 승인하고 전송하시겠습니까?`)) {
    return
  }

  try {
    let successCount = 0
    let errorCount = 0

    for (const participantId of participantIds) {
      try {
        // 참여자 정보 가져오기
        const participant = participants.find(p => p.id === participantId)
        if (!participant) {
          console.error(`Participant ${participantId} not found`)
          errorCount++
          continue
        }

        // 이미 승인된 경우 건너뛰기
        if (participant.guide_confirmed) {
          console.log(`Participant ${participant.creator_name} already approved`)
          continue
        }

        // 가이드 승인 상태 업데이트
        await supabase
          .from('campaign_participants')
          .update({ guide_confirmed: true })
          .eq('id', participantId)

        // user_id와 phone 정보 가져오기
        const { data: app } = await supabase
          .from('applications')
          .select('user_id, applicant_name')
          .eq('campaign_id', id)
          .eq('applicant_name', participant.creator_name)
          .maybeSingle()

        if (app?.user_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('phone')
            .eq('id', app.user_id)
            .maybeSingle()

          // 알림톡 발송
          if (profile?.phone) {
            try {
              await fetch('/.netlify/functions/send-naver-works-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone: profile.phone,
                  templateCode: '025100001012',
                  variables: {
                    크리에이터명: participant.creator_name,
                    캠페인명: campaign.title,
                    제출기한: campaign.content_submission_deadline || '미정'
                  }
                })
              })
            } catch (alimtalkError) {
              console.error('Alimtalk error:', alimtalkError)
            }
          }

          // 이메일 발송
          try {
            await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: participant.creator_email,
                subject: '[CNEC] 선정되신 캠페인 가이드 전달',
                html: `
                  <h2>${participant.creator_name}님, 선정되신 캠페인의 촬영 가이드가 전달되었습니다.</h2>
                  <p><strong>캠페인:</strong> ${campaign.title}</p>
                  <p><strong>영상 제출 기한:</strong> ${campaign.content_submission_deadline || '미정'}</p>
                  <p>크리에이터 대시보드에서 가이드를 확인하시고, 가이드에 따라 촬영을 진행해 주세요.</p>
                  <p>기한 내 미제출 시 패널티가 부과될 수 있습니다.</p>
                  <p>문의: 1833-6025</p>
                `
              })
            })
          } catch (emailError) {
            console.error('Email error:', emailError)
          }
        }

        successCount++
      } catch (error) {
        console.error(`Error approving guide for participant ${participantId}:`, error)
        errorCount++
      }
    }

    // 참여자 목록 새로고침
    await fetchParticipants()

    if (errorCount === 0) {
      alert(`${successCount}명의 크리에이터에게 가이드 승인이 완료되고 알림이 발송되었습니다.`)
    } else {
      alert(`${successCount}명 승인 완료, ${errorCount}명 실패했습니다.`)
    }
  } catch (error) {
    console.error('Error in bulk guide approval:', error)
    alert('가이드 승인에 실패했습니다.')
  }
}
