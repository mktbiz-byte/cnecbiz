/**
 * 매칭 결과를 엑셀로 내보내기 위한 서비스
 */

export function exportMatchingToCSV(campaign, matches) {
  // CSV 헤더
  const headers = [
    '순위',
    '크리에이터명',
    '총점',
    '카테고리 일치도',
    '타겟 오디언스',
    '참여율 점수',
    '팔로워 점수',
    '콘텐츠 스타일',
    '팔로워 수',
    '평균 참여율',
    '평균 조회수',
    '카테고리',
    'Instagram',
    'YouTube',
    'TikTok',
    '추천 요약'
  ]

  // CSV 데이터 생성
  const rows = matches.map((match, index) => {
    const creator = match.creator
    return [
      match.recommendation_rank || (index + 1),
      creator.creator_name,
      Math.round(match.match_score),
      Math.round(match.category_match_score || 0),
      Math.round(match.audience_match_score || 0),
      Math.round(match.engagement_score || 0),
      Math.round(match.follower_score || 0),
      Math.round(match.content_style_score || 0),
      creator.total_followers || 0,
      creator.avg_engagement_rate || 0,
      creator.avg_views || 0,
      (creator.final_categories || creator.ai_generated_categories || []).join(', '),
      creator.instagram_url || '',
      creator.youtube_url || '',
      creator.tiktok_url || '',
      match.recommendation_summary || ''
    ]
  })

  // CSV 문자열 생성
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // 셀에 쉼표나 줄바꿈이 있으면 따옴표로 감싸기
      const cellStr = String(cell)
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(','))
  ].join('\n')

  // BOM 추가 (한글 깨짐 방지)
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  
  // 다운로드
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${campaign.title}_크리에이터_매칭표_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportMatchingToJSON(campaign, matches) {
  const exportData = {
    campaign: {
      id: campaign.id,
      title: campaign.title,
      brand: campaign.brand,
      category: campaign.product_category,
      budget: campaign.budget,
      creator_count: campaign.creator_count,
      exported_at: new Date().toISOString()
    },
    matches: matches.map((match, index) => ({
      rank: match.recommendation_rank || (index + 1),
      is_recommended: match.is_recommended,
      creator: {
        id: match.creator.id,
        name: match.creator.creator_name,
        email: match.creator.email,
        bio: match.creator.final_bio || match.creator.ai_generated_bio,
        categories: match.creator.final_categories || match.creator.ai_generated_categories,
        strengths: match.creator.final_strengths || match.creator.ai_generated_strengths,
        target_audience: match.creator.final_target_audience || match.creator.ai_generated_target_audience,
        content_style: match.creator.final_content_style || match.creator.ai_generated_content_style,
        stats: {
          followers: match.creator.total_followers,
          engagement_rate: match.creator.avg_engagement_rate,
          avg_views: match.creator.avg_views
        },
        social_media: {
          instagram: match.creator.instagram_url,
          youtube: match.creator.youtube_url,
          tiktok: match.creator.tiktok_url
        }
      },
      matching: {
        overall_score: match.match_score,
        category_match_score: match.category_match_score,
        audience_match_score: match.audience_match_score,
        engagement_score: match.engagement_score,
        follower_score: match.follower_score,
        content_style_score: match.content_style_score,
        reasons: match.match_reasons,
        summary: match.recommendation_summary
      }
    }))
  }

  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${campaign.title}_크리에이터_매칭_${new Date().toISOString().split('T')[0]}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function printMatchingReport(campaign, matches) {
  const printWindow = window.open('', '_blank')
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${campaign.title} - 크리에이터 매칭 리포트</title>
      <style>
        body {
          font-family: 'Malgun Gothic', sans-serif;
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        h1 {
          color: #1e40af;
          border-bottom: 3px solid #1e40af;
          padding-bottom: 10px;
        }
        .campaign-info {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .campaign-info div {
          margin: 5px 0;
        }
        .creator-card {
          border: 1px solid #e5e7eb;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        .creator-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        .rank {
          font-size: 24px;
          font-weight: bold;
          color: #1e40af;
          margin-right: 15px;
          min-width: 40px;
        }
        .creator-name {
          font-size: 20px;
          font-weight: bold;
        }
        .score {
          margin-left: auto;
          font-size: 24px;
          font-weight: bold;
          color: #059669;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 15px 0;
          background: #f9fafb;
          padding: 15px;
          border-radius: 4px;
        }
        .stat-item {
          text-align: center;
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
        }
        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #111827;
        }
        .reasons {
          margin-top: 15px;
        }
        .reason-item {
          padding: 10px;
          background: #eff6ff;
          margin: 5px 0;
          border-radius: 4px;
          border-left: 3px solid #3b82f6;
        }
        .summary {
          background: #fef3c7;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
          border-left: 4px solid #f59e0b;
        }
        @media print {
          body { padding: 20px; }
          .creator-card { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>🎯 크리에이터 매칭 리포트</h1>
      
      <div class="campaign-info">
        <h2>캠페인 정보</h2>
        <div><strong>제목:</strong> ${campaign.title}</div>
        <div><strong>브랜드:</strong> ${campaign.brand || '-'}</div>
        <div><strong>카테고리:</strong> ${campaign.product_category}</div>
        <div><strong>예산:</strong> ${campaign.budget?.toLocaleString()}원</div>
        <div><strong>크리에이터 수:</strong> ${campaign.creator_count}명</div>
        <div><strong>생성일:</strong> ${new Date().toLocaleString('ko-KR')}</div>
      </div>

      <h2>Top ${Math.min(matches.length, 10)} 추천 크리에이터</h2>

      ${matches.slice(0, 10).map(match => {
        const creator = match.creator
        return `
          <div class="creator-card">
            <div class="creator-header">
              <div class="rank">#${match.recommendation_rank}</div>
              <div class="creator-name">${creator.creator_name}</div>
              <div class="score">${Math.round(match.match_score)}점</div>
            </div>

            <p>${creator.final_bio || creator.ai_generated_bio || ''}</p>

            <div class="stats">
              <div class="stat-item">
                <div class="stat-label">팔로워</div>
                <div class="stat-value">${(creator.total_followers || 0).toLocaleString()}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">참여율</div>
                <div class="stat-value">${creator.avg_engagement_rate || 0}%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">평균 조회수</div>
                <div class="stat-value">${(creator.avg_views || 0).toLocaleString()}</div>
              </div>
            </div>

            ${match.recommendation_summary ? `
              <div class="summary">
                <strong>💡 추천 요약:</strong><br>
                ${match.recommendation_summary}
              </div>
            ` : ''}

            ${match.match_reasons && match.match_reasons.length > 0 ? `
              <div class="reasons">
                <strong>📋 추천 이유:</strong>
                ${match.match_reasons.map(reason => `
                  <div class="reason-item">
                    <strong>${reason.title}</strong> (${Math.round(reason.score)}점)<br>
                    ${reason.reason}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `
      }).join('')}

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print()
          }, 500)
        }
      </script>
    </body>
    </html>
  `
  
  printWindow.document.write(html)
  printWindow.document.close()
}

