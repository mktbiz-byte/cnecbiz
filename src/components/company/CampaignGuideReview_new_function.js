// New generateAIGuideFromData function with YouTube trend analysis
// This will replace lines 56-249 in CampaignGuideReview.jsx

const generateAIGuideFromData = async (campaignData) => {
  if (!campaignData.guide_brand || !campaignData.guide_product_name || !campaignData.product_features || !campaignData.product_key_points) {
    alert('제품 정보를 먼저 입력해주세요.')
    navigate(`/company/campaigns/guide?id=${id}`)
    return
  }

  setGenerating(true)

  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    
    // STEP 1: YouTube 트렌드 분석 (해시태그/카테고리 기반)
    let trendInsights = null
    
    if (campaignData.required_hashtags && campaignData.required_hashtags.length > 0) {
      console.log('🔍 YouTube 트렌드 분석 시작...')
      
      const hashtagsForSearch = campaignData.required_hashtags.join(' ')
      
      // 트렌드 분석: 중간 복잡도 → gemini-1.5-flash (4K RPM, 무제한 RPD)
      const trendResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a YouTube trend analyst for Korean beauty/fashion influencer marketing.

**Task**: Search YouTube for trending videos using these hashtags/categories: ${hashtagsForSearch}

**Search Strategy**:
1. Search using HASHTAGS/CATEGORIES, NOT product names
   - Example: Search for "#민감성피부 #토너" NOT "라운드랩 토너"
2. Prioritize Shorts/Reels format videos (under 60 seconds)
3. If no Shorts found, analyze general videos but note they need stronger hooks

**Analysis Requirements**:
1. Find 3-5 reference videos that creators can realistically reproduce
2. For each video, identify:
   - Video URL
   - What makes it special (hook, editing style, storytelling)
   - Why it's trending (view count, engagement pattern)
3. Summarize overall trends:
   - Common hook patterns in first 3 seconds
   - Popular editing techniques
   - Effective dialogue/caption styles
   - Trending background music/sound effects

**Important**:
- NO predictions or estimated metrics
- Focus on what creators can ACTUALLY do
- If only general videos exist, emphasize hook strengthening strategies

Return JSON format:
{
  "reference_videos": [
    {
      "url": "actual YouTube URL",
      "format": "shorts" or "general",
      "what_makes_it_special": "specific observation",
      "why_trending": "concrete reason based on visible metrics"
    }
  ],
  "trend_summary": {
    "hook_patterns": ["pattern 1", "pattern 2"],
    "editing_techniques": ["technique 1", "technique 2"],
    "dialogue_styles": ["style 1", "style 2"],
    "has_shorts": true/false
  }
}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
              // Enable Google Search for real-time YouTube data
              tools: [{
                googleSearchRetrieval: {}
              }]
            }
          })
        }
      )

      if (trendResponse.ok) {
        const trendResult = await trendResponse.json()
        if (trendResult.candidates && trendResult.candidates[0]) {
          const trendText = trendResult.candidates[0].content.parts[0].text
          trendInsights = JSON.parse(trendText)
          console.log('✅ YouTube 트렌드 분석 완료:', trendInsights)
        }
      } else {
        console.warn('⚠️ YouTube 트렌드 분석 실패, 기본 가이드 생성 진행')
      }
    }

    // STEP 2: AI 가이드 생성 (트렌드 반영)
    const autonomyNote = campaignData.creator_autonomy 
      ? '\n\n**중요:** 이 캠페인은 크리에이터 자율성을 보장합니다. 촬영 장면과 대사는 크리에이터가 자유롭게 결정할 수 있으나, 핵심 소구 포인트는 반드시 포함되어야 합니다.'
      : ''

    // 트렌드 정보를 프롬프트에 추가
    const trendSection = trendInsights ? `

### 📊 YouTube 트렌드 분석 결과

**참고 영상** (크리에이터가 재현 가능한 형식):
${trendInsights.reference_videos.map((v, i) => `${i + 1}. ${v.url}
   - 포맷: ${v.format === 'shorts' ? 'Shorts/Reels (60초 이하)' : '일반 영상'}
   - 특별한 점: ${v.what_makes_it_special}
   - 트렌딩 이유: ${v.why_trending}`).join('\n')}

**트렌드 요약**:
- **훅 패턴** (첫 3초): ${trendInsights.trend_summary.hook_patterns.join(', ')}
- **편집 기법**: ${trendInsights.trend_summary.editing_techniques.join(', ')}
- **대사/자막 스타일**: ${trendInsights.trend_summary.dialogue_styles.join(', ')}
${!trendInsights.trend_summary.has_shorts ? '\n⚠️ **주의**: Shorts 형식 영상이 부족하므로, 훅 강화 및 빠른 전개가 필수입니다.' : ''}

**가이드 작성 시 반영사항**:
- 위 트렌드를 필수 대사 및 촬영 장면에 자연스럽게 통합
- 참고 영상의 성공 요소를 크리에이터가 재현 가능한 형태로 제시
- 일반 영상만 있는 경우, 첫 3초 훅 강화 전략 명시
` : ''

    // 가이드 생성: 복잡한 콘텐츠 → gemini-1.5-flash (품질 중요)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `당신은 한국 뷰티/패션 인플루언서 마케팅 전문가입니다. 크리에이터가 바로 실행할 수 있는 구체적이고 명확한 가이드를 작성해주세요.

## 캠페인 정보

${campaignData.is_oliveyoung_sale ? `### 🌸 올영세일 캠페인
- **세일 시즌**: ${campaignData.sale_season === 'spring' ? '봄 세일 (3월 1~7일)' : campaignData.sale_season === 'summer' ? '여름 세일 (5월 31일~6월 6일)' : campaignData.sale_season === 'fall' ? '가을 세일 (8월 30일~9월 5일)' : '겨울 세일 (12월 초)'}
- **콘텐츠 타입**: ${campaignData.content_type === 'store_visit' ? '매장 방문형 (진정성 강조)' : '제품 소개형 (빠른 제작)'}
- **앰블럼 삽입**: ${campaignData.emblem_required ? '필요' : '불필요'}
- **3단계 콘텐츠 전략**: 릴스 2건 + 스토리 1건
  - STEP 1 (세일 7일 전): 기대감 형성 - 올리브영 방문형 콘텐츠 (마감: ${campaignData.step1_deadline || '미정'})
  - STEP 2 (세일 1일 전): 구매 전환 유도 - 추천팁 콘텐츠 (마감: ${campaignData.step2_deadline || '미정'})
  - STEP 3 (세일 당일): 즉시 구매 유도 - 스토리 릴크 삽입 (마감: ${campaignData.step3_deadline || '미정'})

` : ''}
### 제품 정보
- **브랜드**: ${campaignData.guide_brand}
- **제품명**: ${campaignData.guide_product_name}
- **제품 특징**: ${campaignData.product_features}
- **핵심 소구 포인트**: ${campaignData.product_key_points}

### 일정
- **촬영 마감일**: ${campaignData.start_date || '미정'}
- **SNS 업로드일**: ${campaignData.end_date || '미정'}

### 필수 대사
${campaignData.required_dialogues && campaignData.required_dialogues.length > 0 ? campaignData.required_dialogues.map((d, i) => `${i + 1}. "${d}"`).join('\n') : '- 없음'}

### 필수 촬영 장면
${campaignData.required_scenes && campaignData.required_scenes.length > 0 ? campaignData.required_scenes.map((s, i) => `${i + 1}. ${s}`).join('\n') : '- 없음'}

### 촬영 장면 요구사항
${[
  campaignData.shooting_scenes_ba_photo && '- BA 사진 (Before/After)',
  campaignData.shooting_scenes_no_makeup && '- 노메이크업',
  campaignData.shooting_scenes_closeup && '- 제품 제형 클로즈업',
  campaignData.shooting_scenes_product_closeup && '- 제품 클로즈업',
  campaignData.shooting_scenes_product_texture && '- 제품 텍스처',
  campaignData.shooting_scenes_outdoor && '- 외부촬영',
  campaignData.shooting_scenes_couple && '- 커플 출연',
  campaignData.shooting_scenes_child && '- 아이 출연',
  campaignData.shooting_scenes_troubled_skin && '- 트러블 피부 노출',
  campaignData.shooting_scenes_wrinkles && '- 피부 주름 노출'
].filter(Boolean).join('\n') || '- 없음'}

### 추가 촬영 요청
${campaignData.additional_shooting_requests || '- 없음'}

### 필수 해시태그
${campaignData.required_hashtags && campaignData.required_hashtags.length > 0 ? campaignData.required_hashtags.map(h => `#${h}`).join(' ') : '- 없음'}

### 영상 요구사항
- **영상 길이**: ${campaignData.video_duration || '자유'}
- **영상 템포**: ${campaignData.video_tempo || '자유'}
- **영상 톤앤매너**: ${campaignData.video_tone || '자유'}

### 기타 요청사항
${campaignData.additional_details || '- 없음'}

### 참고 레퍼런스
${campaignData.reference_links && campaignData.reference_links.length > 0 ? campaignData.reference_links.map((link, i) => `${i + 1}. ${link}`).join('\n') : '- 없음'}
${trendSection}
### 메타 파트너십 광고코드 (필수)
${campaignData.meta_ad_code_requested ? `- 요청됨: 영상 완료 후 파트너십 광고 코드를 발급받아 마이페이지 해당 캠페인의 코드 작성 공간에 반드시 제공해주세요.

**발급 방법:**
1. Instagram 앱에서 업로드한 게시물/릴스/스토리로 이동
2. 오른쪽 상단 점 3개(⋯) 아이콘 클릭
3. "파트너십 레이블 및 광고" 선택
4. "파트너십 광고 코드 받기" 토글 켜기
5. 코드 복사 후 마이페이지에 입력` : '- 요청 안함'}
${autonomyNote}

---

## 작성 지침

1. **한국인 취향**: 화려하지 않고 단순 명료하게
2. **실용성**: 크리에이터가 바로 실행 가능한 구체적 내용
3. **가독성**: 짧은 문장, 명확한 구조
4. **완성도**: 위 모든 정보를 반영하여 통합된 가이드 작성
${campaignData.is_oliveyoung_sale ? `5. **올영세일 전용**: 3단계 콘텐츠 전략을 명확히 구분하여 작성. 각 STEP별 목표와 콘텐츠 방향을 구체적으로 제시` : ''}
5. **주의사항**: 피부 트러블, 과장 광고 등 일반적인 내용은 제외. 다음 필수 주의사항을 반드시 포함:
   - FHD(1920x1080) 이상 해상도로 영상 제공 필수
   - 과도한 필터 사용 자제 (제품 본연의 색상 왜곡 방지)
   - 촬영 마감일 및 SNS 업로드일 엄수 필수
   - 기간 미준수 시 패널티: 포인트 차감 및 제품값 변상
   - 해시태그 필수 포함 (명시된 경우)
   - CNEC에서 가이드 검토 및 품질 관리 진행
   - 부적합한 콘텐츠 재촬영 요청 가능

## 응답 형식 (JSON)

{
  "product_intro": "제품을 2-3문장으로 소개. 브랜드, 제품명, 핵심 특징 포함.",
  "video_concepts": [
    "컨셉 1: 구체적인 컨셉 설명 (예: 아침 루틴 브이로그 형식으로 자연스럽게 제품 사용)",
    "컨셉 2: 다른 컨셉 설명",
    "컨셉 3: 또 다른 컨셉 설명"
  ],
  "must_include": [
    "필수 대사와 소구 포인트를 구체적으로 명시",
    "필수 촬영 장면을 구체적으로 명시",
    "필수 해시태그 사용법"
  ],
  "filming_tips": [
    "촬영 장면 요구사항을 반영한 구체적 팁",
    "영상 길이/템포/톤앤매너를 고려한 팁",
    "추가 촬영 요청사항 반영"
  ],
  "cautions": [
    "이 캠페인에 필수적인 주의사항만 포함 (예: 마감일, 해시태그, 촬영 요구사항 등)"
  ]
}

JSON만 응답하세요.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API 에러:', errorData)
      throw new Error(`AI 가이드 생성 실패: ${errorData.error?.message || response.statusText}`)
    }

    const result = await response.json()
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Gemini API 응답 형식 오류:', result)
      throw new Error('AI 응답 형식이 올바르지 않습니다.')
    }

    const generatedText = result.candidates[0].content.parts[0].text
    const guideData = JSON.parse(generatedText)

    setAiGuide(guideData)
    // 모든 컨셉을 기본으로 선택
    if (guideData.video_concepts) {
      setSelectedConcepts(guideData.video_concepts.map((_, index) => index))
    }

    // Supabase에 저장 (ai_generated_guide + ai_guide_insights)
    const updateData = {
      ai_generated_guide: guideData
    }
    
    // 트렌드 인사이트가 있으면 함께 저장
    if (trendInsights) {
      updateData.ai_guide_insights = trendInsights
    }

    const { error: saveError } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)

    if (saveError) {
      console.error('Supabase 저장 에러:', saveError)
      // 저장 실패해도 AI 가이드는 화면에 표시됨
      alert('가이드가 생성되었지만 저장에 실패했습니다. 다시 시도해주세요.')
    }

  } catch (error) {
    console.error('AI 가이드 생성 실패:', error)
    alert(`AI 가이드 생성 중 오류가 발생했습니다.\n\n${error.message}`)
  } finally {
    setGenerating(false)
  }
}
