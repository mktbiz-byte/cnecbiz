import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// YouTube API keys with rotation support
const YOUTUBE_API_KEYS = [
  process.env.YOUTUBE_API_KEY,
  process.env.YOUTUBE_API_KEY_1,
  process.env.YOUTUBE_API_KEY_2,
  process.env.YOUTUBE_API_KEY_3
].filter(Boolean); // Remove undefined keys

let currentKeyIndex = 0;

function getYouTubeAPIKey() {
  if (YOUTUBE_API_KEYS.length === 0) {
    throw new Error('No YouTube API keys configured');
  }
  return YOUTUBE_API_KEYS[currentKeyIndex % YOUTUBE_API_KEYS.length];
}

function rotateYouTubeAPIKey() {
  currentKeyIndex++;
  if (currentKeyIndex >= YOUTUBE_API_KEYS.length) {
    return null; // All keys exhausted
  }
  console.log(`Rotating to YouTube API key ${currentKeyIndex + 1}/${YOUTUBE_API_KEYS.length}`);
  return getYouTubeAPIKey();
}

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
    
    // Check if it's an API key exhaustion error
    if (error.message.includes('All YouTube API keys exhausted')) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'YouTube API 키 할당량 초과',
          message: '모든 YouTube API 키의 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.',
          details: error.message
        })
      };
    }
    
    // Check if it's a configuration error
    if (error.message.includes('No YouTube API keys configured')) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'YouTube API 키 미설정',
          message: 'YouTube API 키가 설정되지 않았습니다. 관리자에게 문의하세요.',
          details: error.message
        })
      };
    }
    
    // Generic error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'CAPI 분석 실패',
        message: 'CAPI 프로필 생성 중 오류가 발생했습니다.',
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
    if (match) {
      // Remove @ symbol if present
      let extracted = match[1];
      if (extracted.startsWith('@')) {
        extracted = extracted.substring(1);
      }
      return extracted;
    }
  }
  
  return null;
}

async function getYouTubeChannelData(channelId, retryCount = 0) {
  const apiKey = getYouTubeAPIKey();
  console.log(`Attempting to get channel data for: ${channelId} (retry: ${retryCount})`);

  try {
    let url, response, data;
    
    // Check if channelId starts with UC (actual channel ID)
    if (channelId.startsWith('UC')) {
      // Try to get channel by ID
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
      response = await fetch(url);
      data = await response.json();
      
      // Check for quota exceeded or auth error
      if (data.error && (data.error.code === 403 || data.error.code === 429)) {
        const nextKey = rotateYouTubeAPIKey();
        if (nextKey && retryCount < YOUTUBE_API_KEYS.length) {
          console.log(`API key failed (${data.error.message}), trying next key...`);
          return getYouTubeChannelData(channelId, retryCount + 1);
        }
        throw new Error(`All YouTube API keys exhausted. Last error: ${data.error.message}`);
      }
    } else {
      // It's a username, use search API first
      console.log(`Searching for channel with username: ${channelId}`);
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelId}&type=channel&maxResults=1&key=${apiKey}`;
      response = await fetch(url);
      data = await response.json();
      
      // Check for API errors
      if (data.error && (data.error.code === 403 || data.error.code === 429)) {
        const nextKey = rotateYouTubeAPIKey();
        if (nextKey && retryCount < YOUTUBE_API_KEYS.length) {
          console.log(`API key failed (${data.error.message}), trying next key...`);
          return getYouTubeChannelData(channelId, retryCount + 1);
        }
        throw new Error(`All YouTube API keys exhausted. Last error: ${data.error.message}`);
      }
      
      if (data.items && data.items.length > 0) {
        const actualChannelId = data.items[0].id.channelId || data.items[0].snippet.channelId;
        console.log(`Found channel ID: ${actualChannelId}`);
        // Recursively call with actual channel ID
        return getYouTubeChannelData(actualChannelId, retryCount);
      }
      
      // If search fails, try forUsername as fallback
      console.log(`Search failed, trying forUsername...`);
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${channelId}&key=${apiKey}`;
      response = await fetch(url);
      data = await response.json();
    }
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found');
    }
    
    const channel = data.items[0];
    console.log(`Successfully retrieved channel data for: ${channel.snippet.title}`);
    return {
      id: channel.id,
      subscribers: parseInt(channel.statistics.subscriberCount) || 0,
      total_views: parseInt(channel.statistics.viewCount) || 0,
      video_count: parseInt(channel.statistics.videoCount) || 0,
      profile_image: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url
    };
  } catch (error) {
    // If it's already an "all keys exhausted" error, rethrow it
    if (error.message.includes('All YouTube API keys exhausted')) {
      throw error;
    }
    // Otherwise, try next key
    const nextKey = rotateYouTubeAPIKey();
    if (nextKey && retryCount < YOUTUBE_API_KEYS.length) {
      console.log(`Error occurred (${error.message}), trying next key...`);
      return getYouTubeChannelData(channelId, retryCount + 1);
    }
    throw new Error(`All YouTube API keys exhausted. Last error: ${error.message}`);
  }
}

async function getYouTubeTopVideos(channelId, count = 10, retryCount = 0) {
  const apiKey = getYouTubeAPIKey();

  try {
    // Get channel's uploads playlist
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
    const channelResponse = await fetch(channelUrl);
    const channelData = await channelResponse.json();
    
    // Check for quota exceeded or auth error
    if (channelData.error && (channelData.error.code === 403 || channelData.error.code === 429)) {
      const nextKey = rotateYouTubeAPIKey();
      if (nextKey && retryCount < YOUTUBE_API_KEYS.length) {
        console.log(`API key failed (${channelData.error.message}), trying next key...`);
        return getYouTubeTopVideos(channelId, count, retryCount + 1);
      }
      throw new Error(`All YouTube API keys exhausted. Last error: ${channelData.error.message}`);
    }
    
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found');
    }
    
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Get recent videos (last 50)
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`;
    const playlistResponse = await fetch(playlistUrl);
    const playlistData = await playlistResponse.json();
    
    if (!playlistData.items || playlistData.items.length === 0) {
      return [];
    }
    
    // Get video statistics
    const videoIds = playlistData.items.map(item => item.snippet.resourceId.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`;
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
  } catch (error) {
    // If it's already an "all keys exhausted" error, rethrow it
    if (error.message.includes('All YouTube API keys exhausted')) {
      throw error;
    }
    // Otherwise, try next key
    const nextKey = rotateYouTubeAPIKey();
    if (nextKey && retryCount < YOUTUBE_API_KEYS.length) {
      console.log(`Error occurred (${error.message}), trying next key...`);
      return getYouTubeTopVideos(channelId, count, retryCount + 1);
    }
    throw new Error(`All YouTube API keys exhausted. Last error: ${error.message}`);
  }
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
  console.log(`Starting multi-agent analysis for: ${videoUrl}`);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  // 4개 에이전트 프롬프트 정의 (뷰티 크리에이터 특화)
  const agents = [
    // 영상 분석 에이전트 1: 시각적 구성과 제품 표현력
    {
      name: 'video_agent_1',
      prompt: `당신은 뷰티 콘텐츠 전문 비디오 분석가입니다. 다음 YouTube 영상을 시청하고 **시각적 구성과 제품 표현력**을 중심으로 평가해주세요.\n\n영상 URL: ${videoUrl}\n\n다음 항목을 평가하세요:\n\n1. **오프닝 후킹력** (14점 만점)\n   - 첫 3초 내 제품 발색/텍스처가 명확하게 보이는가?\n   - 뷰티 문제 제시 또는 결과물 미리보기로 호기심 유발\n   - 조명과 클로즈업으로 디테일 강조\n\n2. **제품 시연 효과성** (11점 만점)\n   - 손+얼굴 동시 시연으로 발색 비교\n   - Before/After 분할 화면 활용\n   - 여러 각도에서 제품 효과 확인 가능\n\n3. **비주얼 품질** (3점 만점)\n   - 자연광/링라이트 조명으로 색감 정확도\n   - 4K 이상 해상도, 피부 텍스처 선명도\n   - 구도와 색보정 (피부톤 왜곡 없음)\n\nJSON 형식으로 응답:\n{\n  "opening_hook": { "score": 0-14, "reason": "구체적 분석" },\n  "product_demo": { "score": 0-11, "reason": "구체적 분석" },\n  "visual_quality": { "score": 0-3, "reason": "구체적 분석" }\n}`
    },
    // 영상 분석 에이전트 2: 스토리텔링과 신뢰도 구축
    {
      name: 'video_agent_2',
      prompt: `당신은 뷰티 콘텐츠 전문 비디오 분석가입니다. 다음 YouTube 영상을 시청하고 **스토리텔링과 신뢰도 구축**을 중심으로 평가해주세요.\n\n영상 URL: ${videoUrl}\n\n다음 항목을 평가하세요:\n\n1. **신뢰도 구축** (13점 만점)\n   - 사용 전후 비교 (예: "7일 사용 후 90% 개선")\n   - 피부 고민별 실제 테스트 장면\n   - 다른 제품과의 비교 시연\n\n2. **스토리텔링 구조** (7점 만점)\n   - 문제(피부 고민) → 해결(제품 사용) → 결과(변화) 구조\n   - 감정 여정 (공감 → 기대 → 만족)\n   - 일상 속 사용 장면 연출\n\n3. **편집 완성도** (8점 만점)\n   - 컷 리듬 (2-3초/컷, 뷰티 숏폼 최적)\n   - 영상 길이 (30-90초, 제품 설명 충분)\n   - 텍스트 오버레이 (제품명, 가격, 특징)\n\nJSON 형식으로 응답:\n{\n  "credibility": { "score": 0-13, "reason": "구체적 분석" },\n  "storytelling": { "score": 0-7, "reason": "구체적 분석" },\n  "editing": { "score": 0-8, "reason": "구체적 분석" }\n}`
    },
    // 영상 분석 에이전트 3: 제품 정보 전달과 구매 유도
    {
      name: 'video_agent_3',
      prompt: `당신은 뷰티 콘텐츠 전문 비디오 분석가입니다. 다음 YouTube 영상을 시청하고 **제품 정보 전달과 구매 유도**를 중심으로 평가해주세요.\n\n영상 URL: ${videoUrl}\n\n다음 항목을 평가하세요:\n\n1. **CTA 명확성** (6점 만점)\n   - 가격/할인 정보 명시 (예: "29,000원 → 19,900원")\n   - 구매처 안내 (올리브영, 무신사 등)\n   - 링크/쿠폰 코드 제공\n\n2. **오프닝 후킹력** (추가 평가)\n   - 제품 결과물 미리보기 (완성된 메이크업)\n   - 구체적 수치 제시 (예: "24시간 지속")\n   - 타겟 고객 명확화 (예: "지성 피부용")\n\nJSON 형식으로 응답:\n{\n  "cta_clarity": { "score": 0-6, "reason": "구체적 분석" },\n  "opening_hook_2": { "score": 0-14, "reason": "구체적 분석" }\n}`
    },
    // 음성 분석 에이전트 1: 음성 품질과 제품 정보 전달
    {
      name: 'audio_agent_1',
      prompt: `당신은 뷰티 콘텐츠 전문 오디오 분석가입니다. 다음 YouTube 영상을 시청하고 **음성 품질과 제품 정보 전달**을 중심으로 평가해주세요.\n\n영상 URL: ${videoUrl}\n\n다음 항목을 평가하세요:\n\n1. **오디오 품질** (8점 만점)\n   - 배경음악 (120-130 BPM, 뷰티 콘텐츠 적합)\n   - 음성 톤 (밝고 친근함, 명료한 발음)\n   - 믹싱 밸런스 (음성 > 배경음악)\n\n2. **신뢰도 구축** (추가 평가)\n   - 제품명, 브랜드명 명확한 발음\n   - 가격, 용량, 구매처 언급\n   - 사용법 구체적 설명\n\nJSON 형식으로 응답:\n{\n  "audio_quality": { "score": 0-8, "reason": "구체적 분석" },\n  "credibility_2": { "score": 0-13, "reason": "구체적 분석" }\n}`
    }
  ];
  
  try {
    // 4개 에이전트 병렬 실행
    const results = await Promise.all(
      agents.map(async (agent) => {
        try {
          const result = await model.generateContent(agent.prompt);
          const text = result.response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          return jsonMatch ? { name: agent.name, data: JSON.parse(jsonMatch[0]) } : null;
        } catch (error) {
          console.error(`Agent ${agent.name} failed:`, error.message);
          return null;
        }
      })
    );
    
    // 결과 통합 및 평균화
    const scores = {
      opening_hook: { score: 0, max: 14, reason: '' },
      credibility: { score: 0, max: 13, reason: '' },
      product_demo: { score: 0, max: 11, reason: '' },
      audio_quality: { score: 0, max: 8, reason: '' },
      editing: { score: 0, max: 8, reason: '' },
      storytelling: { score: 0, max: 7, reason: '' },
      cta_clarity: { score: 0, max: 6, reason: '' },
      visual_quality: { score: 0, max: 3, reason: '' }
    };
    
    // 각 에이전트 결과 수집
    const video1 = results.find(r => r?.name === 'video_agent_1')?.data;
    const video2 = results.find(r => r?.name === 'video_agent_2')?.data;
    const video3 = results.find(r => r?.name === 'video_agent_3')?.data;
    const audio1 = results.find(r => r?.name === 'audio_agent_1')?.data;
    
    // 오프닝 후킹력: video1 + video3 평균
    if (video1?.opening_hook && video3?.opening_hook_2) {
      scores.opening_hook.score = Math.round((video1.opening_hook.score + video3.opening_hook_2.score) / 2);
      scores.opening_hook.reason = video1.opening_hook.reason;
    } else if (video1?.opening_hook) {
      scores.opening_hook.score = video1.opening_hook.score;
      scores.opening_hook.reason = video1.opening_hook.reason;
    }
    
    // 신뢰도: video2 + audio1 평균
    if (video2?.credibility && audio1?.credibility_2) {
      scores.credibility.score = Math.round((video2.credibility.score + audio1.credibility_2.score) / 2);
      scores.credibility.reason = video2.credibility.reason;
    } else if (video2?.credibility) {
      scores.credibility.score = video2.credibility.score;
      scores.credibility.reason = video2.credibility.reason;
    }
    
    // 제품 시연: video1만 사용
    if (video1?.product_demo) {
      scores.product_demo.score = video1.product_demo.score;
      scores.product_demo.reason = video1.product_demo.reason;
    }
    
    // 오디오 품질: audio1만 사용
    if (audio1?.audio_quality) {
      scores.audio_quality.score = audio1.audio_quality.score;
      scores.audio_quality.reason = audio1.audio_quality.reason;
    }
    
    // 편집 완성도: video2만 사용
    if (video2?.editing) {
      scores.editing.score = video2.editing.score;
      scores.editing.reason = video2.editing.reason;
    }
    
    // 스토리텔링: video2만 사용
    if (video2?.storytelling) {
      scores.storytelling.score = video2.storytelling.score;
      scores.storytelling.reason = video2.storytelling.reason;
    }
    
    // CTA 명확성: video3만 사용
    if (video3?.cta_clarity) {
      scores.cta_clarity.score = video3.cta_clarity.score;
      scores.cta_clarity.reason = video3.cta_clarity.reason;
    }
    
    // 비주얼 품질: video1만 사용
    if (video1?.visual_quality) {
      scores.visual_quality.score = video1.visual_quality.score;
      scores.visual_quality.reason = video1.visual_quality.reason;
    }
    
    const total_score = Object.values(scores).reduce((sum, item) => sum + item.score, 0);
    
    console.log(`Multi-agent analysis complete. Total score: ${total_score}`);
    
    return {
      scores,
      total_score
    };
    
  } catch (error) {
    console.error('Multi-agent analysis error:', error);
    // Return default scores on error
    return {
      scores: {
        opening_hook: { score: 10, max: 14, reason: "분석 실패 - 기본값" },
        credibility: { score: 9, max: 13, reason: "분석 실패 - 기본값" },
        product_demo: { score: 8, max: 11, reason: "분석 실패 - 기본값" },
        audio_quality: { score: 6, max: 8, reason: "분석 실패 - 기본값" },
        editing: { score: 6, max: 8, reason: "분석 실패 - 기본값" },
        storytelling: { score: 5, max: 7, reason: "분석 실패 - 기본값" },
        cta_clarity: { score: 4, max: 6, reason: "분석 실패 - 기본값" },
        visual_quality: { score: 2, max: 3, reason: "분석 실패 - 기본값" }
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
