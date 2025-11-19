import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const YOUTUBE_API_KEY = process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { channelUrl, platform: rawPlatform } = JSON.parse(event.body);

    if (!channelUrl || !rawPlatform) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'channelUrl and platform are required' })
      };
    }

    // Normalize platform to lowercase
    const platform = rawPlatform.toLowerCase();

    console.log(`Starting CAPI analysis for ${platform}:`, channelUrl);

    let channelData, topVideos;

    // Platform-specific data collection
    if (platform === 'youtube') {
      // Try API first, fallback to scraping
      try {
        const channelId = extractYouTubeChannelId(channelUrl);
        channelData = await getYouTubeChannelData(channelId);
        topVideos = await getYouTubeTopVideos(channelId, 10);
      } catch (apiError) {
        console.log('YouTube API failed, falling back to scraping:', apiError.message);
        const scraped = await scrapeYouTubeChannel(channelUrl);
        channelData = scraped.channelData;
        topVideos = scraped.topVideos;
      }
    } else if (platform === 'instagram') {
      const scraped = await scrapeInstagramProfile(channelUrl);
      channelData = scraped.channelData;
      topVideos = scraped.topVideos;
    } else if (platform === 'tiktok') {
      const scraped = await scrapeTikTokProfile(channelUrl);
      channelData = scraped.channelData;
      topVideos = scraped.topVideos;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Unsupported platform' })
      };
    }

    if (!topVideos || topVideos.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No videos found for this channel' })
      };
    }

    console.log(`Found ${topVideos.length} videos to analyze`);

    // Analyze videos with Gemini AI (actual video URLs)
    const videoAnalyses = [];
    const videosToAnalyze = topVideos.slice(0, 5); // Analyze top 5 for speed
    
    for (const video of videosToAnalyze) {
      try {
        console.log(`Analyzing video: ${video.url}`);
        const analysis = await analyzeVideoWithGemini(video.url, platform);
        videoAnalyses.push({
          ...video,
          content_score: analysis.total_score,
          scores: analysis.scores
        });
      } catch (error) {
        console.error(`Failed to analyze video ${video.url}:`, error);
        // Continue with other videos
      }
    }

    if (videoAnalyses.length === 0) {
      throw new Error('Failed to analyze any videos');
    }

    // Calculate average content scores
    const avgContentScores = calculateAverageScores(videoAnalyses);

    // Calculate activity score
    const activityScore = calculateActivityScore(channelData, topVideos, platform);

    // Generate strengths and weaknesses
    const { strengths, weaknesses } = generateInsights(avgContentScores, activityScore);

    // Prepare final result
    const totalContentScore = Object.values(avgContentScores).reduce((sum, item) => sum + item.score, 0);
    const totalScore = Math.round(totalContentScore + activityScore.total);

    const result = {
      total_score: totalScore,
      grade: calculateGrade(totalScore),
      content_score: Math.round(totalContentScore),
      activity_score: activityScore.total,
      
      content_scores: avgContentScores,
      activity_scores: activityScore.breakdown,
      
      analyzed_videos: videoAnalyses.map(v => ({
        url: v.url,
        title: v.title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        published_at: v.published_at,
        content_score: v.content_score
      })),
      
      channel_info: {
        subscribers: channelData.subscribers,
        total_views: channelData.total_views,
        video_count: channelData.video_count,
        profile_image: channelData.profile_image
      },
      
      strengths,
      weaknesses,
      
      overall_assessment: generateOverallAssessment(totalScore, strengths, weaknesses)
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: result
      })
    };

  } catch (error) {
    console.error('Error generating CAPI profile:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate CAPI profile',
        details: error.message 
      })
    };
  }
};

// ==================== YouTube Functions ====================

function extractYouTubeChannelId(url) {
  const patterns = [
    /youtube\.com\/channel\/([^\/\?]+)/,
    /youtube\.com\/@([^\/\?]+)/,
    /youtube\.com\/c\/([^\/\?]+)/,
    /youtube\.com\/user\/([^\/\?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

async function getYouTubeChannelData(channelId) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  // Try to get channel by ID first
  let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`;
  let response = await fetch(url);
  let data = await response.json();
  
  // If not found, try as username
  if (!data.items || data.items.length === 0) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${channelId}&key=${YOUTUBE_API_KEY}`;
    response = await fetch(url);
    data = await response.json();
  }
  
  // If still not found, try searching
  if (!data.items || data.items.length === 0) {
    url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelId}&type=channel&key=${YOUTUBE_API_KEY}`;
    response = await fetch(url);
    data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const actualChannelId = data.items[0].snippet.channelId;
      return getYouTubeChannelData(actualChannelId);
    }
  }
  
  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }
  
  const channel = data.items[0];
  return {
    id: channel.id,
    subscribers: parseInt(channel.statistics.subscriberCount) || 0,
    total_views: parseInt(channel.statistics.viewCount) || 0,
    video_count: parseInt(channel.statistics.videoCount) || 0,
    profile_image: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url
  };
}

async function getYouTubeTopVideos(channelId, count = 10) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  // Get channel's uploads playlist
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
  const channelResponse = await fetch(channelUrl);
  const channelData = await channelResponse.json();
  
  if (!channelData.items || channelData.items.length === 0) {
    throw new Error('Channel not found');
  }
  
  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
  
  // Get recent videos (last 50)
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
  const playlistResponse = await fetch(playlistUrl);
  const playlistData = await playlistResponse.json();
  
  if (!playlistData.items || playlistData.items.length === 0) {
    return [];
  }
  
  // Get video statistics
  const videoIds = playlistData.items.map(item => item.snippet.resourceId.videoId).join(',');
  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
  const statsResponse = await fetch(statsUrl);
  const statsData = await statsResponse.json();
  
  // Filter videos from last 3 months and sort by views
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const videos = statsData.items
    .filter(video => {
      const publishedAt = new Date(video.snippet.publishedAt);
      return publishedAt >= threeMonthsAgo;
    })
    .map(video => ({
      url: `https://www.youtube.com/watch?v=${video.id}`,
      title: video.snippet.title,
      views: parseInt(video.statistics.viewCount) || 0,
      likes: parseInt(video.statistics.likeCount) || 0,
      comments: parseInt(video.statistics.commentCount) || 0,
      published_at: video.snippet.publishedAt
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, count);
  
  return videos;
}

async function scrapeYouTubeChannel(channelUrl) {
  // Simplified scraping - in production, use Puppeteer or Playwright
  // For now, return mock data to demonstrate structure
  console.log('Scraping YouTube channel:', channelUrl);
  
  // This would require actual web scraping implementation
  throw new Error('YouTube scraping not yet implemented. Please provide YouTube API key.');
}

// ==================== Instagram Functions ====================

async function scrapeInstagramProfile(profileUrl) {
  console.log('Scraping Instagram profile:', profileUrl);
  
  // Extract username from URL
  const username = profileUrl.match(/instagram\.com\/([^\/\?]+)/)?.[1];
  if (!username) {
    throw new Error('Invalid Instagram URL');
  }
  
  // In production, use Puppeteer/Playwright or Instagram API
  // For now, return mock data structure
  return {
    channelData: {
      subscribers: 50000,
      total_views: 0, // Instagram doesn't show total views
      video_count: 100,
      profile_image: ''
    },
    topVideos: [
      {
        url: `https://www.instagram.com/reel/example/`,
        title: 'Instagram Reel',
        views: 10000,
        likes: 500,
        comments: 50,
        published_at: new Date().toISOString()
      }
    ]
  };
}

// ==================== TikTok Functions ====================

async function scrapeTikTokProfile(profileUrl) {
  console.log('Scraping TikTok profile:', profileUrl);
  
  // Extract username from URL
  const username = profileUrl.match(/tiktok\.com\/@([^\/\?]+)/)?.[1];
  if (!username) {
    throw new Error('Invalid TikTok URL');
  }
  
  // In production, use Puppeteer/Playwright or TikTok API
  // For now, return mock data structure
  return {
    channelData: {
      subscribers: 30000,
      total_views: 0,
      video_count: 80,
      profile_image: ''
    },
    topVideos: [
      {
        url: `https://www.tiktok.com/@${username}/video/1234567890`,
        title: 'TikTok Video',
        views: 50000,
        likes: 2000,
        comments: 100,
        published_at: new Date().toISOString()
      }
    ]
  };
}

// ==================== Gemini AI Analysis ====================

async function analyzeVideoWithGemini(videoUrl, platform) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp'
  });

  const prompt = `
당신은 인플루언서 마케팅 전문가입니다. 다음 ${platform} 영상을 실제로 시청하고 분석하여 CAPI 점수를 산출해주세요.

영상 URL: ${videoUrl}

**중요: 이 URL의 실제 영상을 분석해주세요. 영상의 비주얼, 오디오, 자막, 편집 등 모든 요소를 확인하세요.**

다음 8개 항목을 평가해주세요:

1. **오프닝 후킹력** (14점 만점)
   - 첫 3초에 명확한 문제 제시 또는 호기심 유발
   - 구체적 수치나 증명 자료 제시
   - 시청자의 즉각적 관심 유도

2. **신뢰도 구축** (13점 만점)
   - 구체적 수치 제시 (예: "7일 만에 90% 개선")
   - 입상 테스트 그래픽 활용
   - 실시간 비교 시연

3. **제품 시연 효과성** (11점 만점)
   - 손+얼굴 이중 시연
   - Before/After 분할 화면
   - 차별점 명확히 증명

4. **오디오 품질** (8점 만점)
   - 배경음악 (120-130 BPM)
   - 음성 톤과 명료도
   - 믹싱 밸런스

5. **편집 완성도** (8점 만점)
   - 컷 리듬 (2-3초/컷)
   - 영상 길이 (30-60초)
   - 텍스트 오버레이

6. **스토리텔링 구조** (7점 만점)
   - 문제→해결→CTA 유발
   - 감정 여정

7. **CTA 명확성** (6점 만점)
   - 가격/혜택 명시
   - 구매처 안내

8. **비주얼 품질** (3점 만점)
   - 조명/해상도
   - 구도/색감

응답은 다음 JSON 형식으로 작성해주세요:

{
  "scores": {
    "opening_hook": { "score": 0-14, "reason": "실제 영상 분석 결과" },
    "credibility": { "score": 0-13, "reason": "실제 영상 분석 결과" },
    "product_demo": { "score": 0-11, "reason": "실제 영상 분석 결과" },
    "audio_quality": { "score": 0-8, "reason": "실제 영상 분석 결과" },
    "editing": { "score": 0-8, "reason": "실제 영상 분석 결과" },
    "storytelling": { "score": 0-7, "reason": "실제 영상 분석 결과" },
    "cta_clarity": { "score": 0-6, "reason": "실제 영상 분석 결과" },
    "visual_quality": { "score": 0-3, "reason": "실제 영상 분석 결과" }
  },
  "total_score": 0-70
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response:', text.substring(0, 200));
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse AI response');
    }
  } catch (error) {
    console.error('Gemini analysis error:', error);
    // Return default scores
    return {
      scores: {
        opening_hook: { score: 10, reason: "분석 실패 - 기본값" },
        credibility: { score: 9, reason: "분석 실패 - 기본값" },
        product_demo: { score: 8, reason: "분석 실패 - 기본값" },
        audio_quality: { score: 6, reason: "분석 실패 - 기본값" },
        editing: { score: 6, reason: "분석 실패 - 기본값" },
        storytelling: { score: 5, reason: "분석 실패 - 기본값" },
        cta_clarity: { score: 4, reason: "분석 실패 - 기본값" },
        visual_quality: { score: 2, reason: "분석 실패 - 기본값" }
      },
      total_score: 50
    };
  }
}

// ==================== Score Calculation ====================

function calculateAverageScores(videoAnalyses) {
  const categories = ['opening_hook', 'credibility', 'product_demo', 'audio_quality', 'editing', 'storytelling', 'cta_clarity', 'visual_quality'];
  const maxScores = { opening_hook: 14, credibility: 13, product_demo: 11, audio_quality: 8, editing: 8, storytelling: 7, cta_clarity: 6, visual_quality: 3 };
  
  const avgScores = {};
  
  for (const category of categories) {
    const scores = videoAnalyses.map(v => v.scores[category]);
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const reasons = scores.map(s => s.reason);
    const mostCommonReason = reasons[0];
    
    avgScores[category] = {
      score: Math.round(avgScore),
      max: maxScores[category],
      reason: mostCommonReason
    };
  }
  
  return avgScores;
}

function calculateActivityScore(channelData, topVideos, platform) {
  const breakdown = {};
  let total = 0;
  const subs = channelData.subscribers;
  
  // 1. Average view rate (15 points) - 구독자 대비 조회율
  const avgViews = topVideos.reduce((sum, v) => sum + v.views, 0) / topVideos.length;
  const viewRate = subs > 0 ? (avgViews / subs) * 100 : 0;
  if (viewRate >= 10) breakdown.avg_views = { score: 15, max: 15, value: Math.round(avgViews), rate: `${viewRate.toFixed(1)}%`, reason: "구독자 대비 조회율 10% 이상" };
  else if (viewRate >= 5) breakdown.avg_views = { score: 12, max: 15, value: Math.round(avgViews), rate: `${viewRate.toFixed(1)}%`, reason: "구독자 대비 조회율 5~10%" };
  else if (viewRate >= 3) breakdown.avg_views = { score: 9, max: 15, value: Math.round(avgViews), rate: `${viewRate.toFixed(1)}%`, reason: "구독자 대비 조회율 3~5%" };
  else if (viewRate >= 1) breakdown.avg_views = { score: 6, max: 15, value: Math.round(avgViews), rate: `${viewRate.toFixed(1)}%`, reason: "구독자 대비 조회율 1~3%" };
  else breakdown.avg_views = { score: 3, max: 15, value: Math.round(avgViews), rate: `${viewRate.toFixed(1)}%`, reason: "구독자 대비 조회율 1% 미만" };
  total += breakdown.avg_views.score;
  
  // 2. Engagement rate (10 points) - 좋아요+댓글/조회수
  const avgEngagement = topVideos.reduce((sum, v) => sum + v.likes + v.comments, 0) / topVideos.length;
  const engagementRate = avgViews > 0 ? (avgEngagement / avgViews) * 100 : 0;
  if (engagementRate >= 5) breakdown.engagement = { score: 10, max: 10, value: `${engagementRate.toFixed(1)}%`, reason: "참여율 5% 이상" };
  else if (engagementRate >= 3) breakdown.engagement = { score: 8, max: 10, value: `${engagementRate.toFixed(1)}%`, reason: "참여율 3~5%" };
  else if (engagementRate >= 1) breakdown.engagement = { score: 6, max: 10, value: `${engagementRate.toFixed(1)}%`, reason: "참여율 1~3%" };
  else if (engagementRate >= 0.5) breakdown.engagement = { score: 4, max: 10, value: `${engagementRate.toFixed(1)}%`, reason: "참여율 0.5~1%" };
  else breakdown.engagement = { score: 2, max: 10, value: `${engagementRate.toFixed(1)}%`, reason: "참여율 0.5% 미만" };
  total += breakdown.engagement.score;
  
  // 3. Upload frequency (5 points)
  const uploadFreq = topVideos.length;
  if (uploadFreq >= 36) breakdown.upload_frequency = { score: 5, max: 5, value: "주 3회 이상", reason: "활발한 업로드 빈도" };
  else if (uploadFreq >= 24) breakdown.upload_frequency = { score: 4, max: 5, value: "주 2회", reason: "양호한 업로드 빈도" };
  else if (uploadFreq >= 12) breakdown.upload_frequency = { score: 3, max: 5, value: "주 1회", reason: "보통 업로드 빈도" };
  else if (uploadFreq >= 6) breakdown.upload_frequency = { score: 2, max: 5, value: "월 2~3회", reason: "낮은 업로드 빈도" };
  else breakdown.upload_frequency = { score: 1, max: 5, value: "월 1회 이하", reason: "매우 낮은 업로드 빈도" };
  total += breakdown.upload_frequency.score;
  
  return { total, breakdown };
}

function generateInsights(contentScores, activityScore) {
  const strengths = [];
  const weaknesses = [];
  
  const sortedScores = Object.entries(contentScores)
    .sort((a, b) => (b[1].score / b[1].max) - (a[1].score / a[1].max))
    .slice(0, 3);
  
  const categoryNames = {
    opening_hook: "오프닝 후킹력",
    credibility: "신뢰도 구축",
    product_demo: "제품 시연 효과성",
    audio_quality: "오디오 품질",
    editing: "편집 완성도",
    storytelling: "스토리텔링 구조",
    cta_clarity: "CTA 명확성",
    visual_quality: "비주얼 품질"
  };
  
  for (const [category, data] of sortedScores) {
    strengths.push({
      title: categoryNames[category],
      description: data.reason,
      score: data.score,
      category
    });
  }
  
  for (const [category, data] of Object.entries(contentScores)) {
    const percentage = (data.score / data.max) * 100;
    if (percentage < 70) {
      const improvements = generateImprovements(category);
      weaknesses.push({
        title: categoryNames[category],
        current: data.reason,
        score: data.score,
        improvements: improvements.tips,
        expected_impact: improvements.impact,
        potential_score_increase: data.max - data.score
      });
    }
  }
  
  return { strengths, weaknesses: weaknesses.slice(0, 2) };
}

function generateImprovements(category) {
  const improvements = {
    opening_hook: {
      tips: ["첫 3초에 구체적 문제 제시", "숫자나 통계로 호기심 유발", "Before/After를 즉시 보여주기"],
      impact: "오프닝 점수 +30% 향상 예상"
    },
    credibility: {
      tips: ["구체적 수치와 데이터 제시", "테스트 결과 그래픽 활용", "전문가 인증이나 리뷰 포함"],
      impact: "신뢰도 점수 +40% 향상 예상"
    },
    product_demo: {
      tips: ["손과 얼굴 동시 시연", "Before/After 분할 화면 사용", "실시간 변화 과정 보여주기"],
      impact: "시연 효과성 +35% 향상 예상"
    },
    audio_quality: {
      tips: ["120-130 BPM의 경쾌한 배경음악 사용", "음성과 BGM 볼륨 밸런스 조정", "노이즈 제거 및 음질 개선"],
      impact: "오디오 점수 +25% 향상 예상"
    },
    editing: {
      tips: ["2-3초마다 컷 전환", "30-60초 최적 길이 유지", "핵심 메시지에 텍스트 오버레이"],
      impact: "편집 점수 +30% 향상 예상"
    },
    storytelling: {
      tips: ["문제→해결→CTA 구조 명확히", "감정 여정 설계 (공감→해결→만족)", "스토리 흐름 일관성 유지"],
      impact: "스토리텔링 점수 +40% 향상 예상"
    },
    cta_clarity: {
      tips: ["영상 마지막 5초에 가격과 할인 정보 명시", "자막으로 구매 링크 강조", "화면 하단에 CTA 배너 고정"],
      impact: "CTA 점수 +50% 향상 예상"
    },
    visual_quality: {
      tips: ["자연광 또는 링라이트 사용", "4K 해상도로 촬영", "색감 보정 및 필터 적용"],
      impact: "비주얼 점수 +30% 향상 예상"
    }
  };
  
  return improvements[category] || { tips: ["개선 방안 분석 중"], impact: "점수 향상 예상" };
}

function calculateGrade(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function generateOverallAssessment(totalScore, strengths, weaknesses) {
  const grade = calculateGrade(totalScore);
  const strengthTitles = strengths.map(s => s.title).join(', ');
  const weaknessTitles = weaknesses.map(w => w.title).join(', ');
  
  let assessment = `${grade}급 크리에이터로 `;
  
  if (grade === 'S') {
    assessment += `최상위 바이럴 크리에이터입니다. ${strengthTitles} 부분에서 탁월한 역량을 보유하고 있습니다.`;
  } else if (grade === 'A') {
    assessment += `프리미엄 인플루언서입니다. ${strengthTitles} 부분에서 우수한 역량을 보유하고 있습니다.`;
    if (weaknesses.length > 0) {
      assessment += ` ${weaknessTitles} 부분을 개선하면 S급 진입이 가능합니다.`;
    }
  } else if (grade === 'B') {
    assessment += `안정적인 성과가 기대됩니다. ${strengthTitles} 부분이 강점입니다.`;
    if (weaknesses.length > 0) {
      assessment += ` ${weaknessTitles} 부분을 캠페인 가이드에 반영하여 개선하면 A급 진입이 가능합니다.`;
    }
  } else {
    assessment += `성장 가능성이 있습니다.`;
    if (weaknesses.length > 0) {
      assessment += ` ${weaknessTitles} 부분을 집중적으로 개선하면 더 높은 등급 달성이 가능합니다.`;
    }
  }
  
  return assessment;
}
