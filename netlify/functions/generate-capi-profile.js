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
        // Use actual channel ID from channelData (in case username was converted)
        const actualChannelId = channelData.id;
        topVideos = await getYouTubeTopVideos(actualChannelId, 10);
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
          scores: analysis.scores,
          reliability: analysis.reliability || 0
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

    // Calculate average reliability from all video analyses
    const avgReliability = Math.round(
      videoAnalyses.reduce((sum, v) => sum + (v.reliability || 0), 0) / videoAnalyses.length
    );
    
    const result = {
      total_score: totalScore,
      grade: calculateGrade(totalScore),
      content_score: Math.round(totalContentScore),
      total_content_score: Math.round(totalContentScore), // For frontend compatibility
      activity_score: activityScore.total,
      activity_total_score: activityScore.total, // For frontend display fix
      reliability: avgReliability,
      
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
// Calculate reliability score based on evaluation quality
function calculateReliabilityScore(scores, maxScores) {
  let totalReliability = 0;
  let count = 0;
  
  for (const [key, data] of Object.entries(scores)) {
    const maxScore = maxScores[key];
    const score = data.score;
    const reason = data.reason || '';
    
    // 1. Reason clarity (40 points): Check if reason is specific and detailed
    let reasonScore = 0;
    if (reason.length > 50) reasonScore += 20; // Long enough
    else if (reason.length > 20) reasonScore += 10; // Medium
    
    if (reason.includes('Before') || reason.includes('After') || reason.includes('시각적') || 
        reason.includes('효과') || reason.includes('명확') || reason.includes('구체적')) {
      reasonScore += 20; // Contains specific keywords
    } else if (reason.length > 30) {
      reasonScore += 10; // At least some detail
    }
    
    // 2. Score appropriateness (30 points): Not too extreme
    let scoreAppropriatenessScore = 0;
    const scoreRatio = score / maxScore;
    if (scoreRatio >= 0.3 && scoreRatio <= 0.9) {
      scoreAppropriatenessScore = 30; // Reasonable range
    } else if (scoreRatio >= 0.2 && scoreRatio <= 0.95) {
      scoreAppropriatenessScore = 20; // Acceptable
    } else {
      scoreAppropriatenessScore = 10; // Too extreme
    }
    
    // 3. Consistency (30 points): Check if reason matches score
    let consistencyScore = 0;
    const hasPositiveWords = reason.includes('효과적') || reason.includes('명확') || 
                             reason.includes('우수') || reason.includes('좋') || 
                             reason.includes('잘');
    const hasNegativeWords = reason.includes('부족') || reason.includes('미흡') || 
                             reason.includes('약함') || reason.includes('없');
    
    if (scoreRatio > 0.7 && hasPositiveWords) {
      consistencyScore = 30; // High score + positive words
    } else if (scoreRatio < 0.4 && hasNegativeWords) {
      consistencyScore = 30; // Low score + negative words
    } else if (scoreRatio >= 0.4 && scoreRatio <= 0.7) {
      consistencyScore = 25; // Medium score (neutral is ok)
    } else {
      consistencyScore = 15; // Mismatch
    }
    
    const itemReliability = reasonScore + scoreAppropriatenessScore + consistencyScore;
    totalReliability += itemReliability;
    count++;
  }
  
  // Average reliability across all items (0-100)
  const avgReliability = Math.round(totalReliability / count);
  
  // Cap at 100
  return Math.min(avgReliability, 100);
}


async function analyzeVideoWithGemini(videoUrl, platform) {
  console.log(`Starting video analysis for: ${videoUrl}`);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `당신은 숏폼 콘텐츠 분석 전문가입니다. 다음 영상을 시청하고 콘텐츠 제작 역량을 평가해주세요.

영상 URL: ${videoUrl}

## 평가 항목 (총 70점)

### 1. 오프닝 후킹력 (14점)
- **첫 3초 임팩트** (6점): 긴급성/호기심/문제 제시가 명확한가?
- **시각적 후킹 요소** (5점): Before/After 즉시 제공, 제품 클로즈업, 인플루언서 얼굴 등
- **오프닝 메시지** (3점): 숫자/통계/구체적 효과 언급

### 2. 신뢰도 구축 (13점)
- **사회적 증거** (6점): 판매 수치, 리뷰 언급, 인기 증명
- **과학적/전문적 증명** (4점): 성분 설명, 테스트 결과, 전문가 의견
- **진정성 신호** (3점): "내돈내산", "솔직 후기", 실제 사용 장면

### 3. 제품 시연 효과성 (11점)
- **Before/After 명확성** (4점): 분할 화면, 시연 장면 충분
- **제품 등장 빈도** (4점): 제품이 충분히 보이는가
- **차별점 증명** (3점): 타 제품 대비 장점 시연

### 4. 오디오 품질 (8점)
- **배경음악** (3점): 120-130 BPM, 콘텐츠와 어울림
- **음성 톤** (3점): 명료한 발음, 적절한 속도
- **믹싱** (2점): 음성 명확히 들림, 배경음과 밸런스

### 5. 편집 & 페이싱 (8점)
- **컷 리듬** (3점): 2-3초/컷, 지루하지 않은 템포
- **영상 길이** (3점): 30-90초 최적 길이
- **텍스트 오버레이** (2점): 핵심 메시지 자막 강조

### 6. 스토리텔링 구조 (7점)
- **문제-해결 구조** (4점): 문제 제시 → 제품 소개 → CTA
- **감정 여정** (3점): 공감 → 기대 → 만족 흐름

### 7. CTA 명확성 (6점)
- **가격/혜택 정보** (3점): 가격, 할인율 명시
- **구매처 안내** (3점): 링크, 쿠폰 코드, 구매 방법

### 8. 비주얼 품질 (3점)
- **조명/해상도** (2점): 밝고 선명한 화질
- **구도/색감** (1점): 제품이 잘 보이는 구도

## 출력 형식 (JSON)

반드시 다음 JSON 형식으로 응답하세요. 마크다운 코드 블록(\`\`\`)을 사용하지 마세요.

{
  "opening_hook": {
    "score": 0-14,
    "reason": "구체적 분석 (1-2문장)"
  },
  "credibility": {
    "score": 0-13,
    "reason": "구체적 분석 (1-2문장)"
  },
  "product_demo": {
    "score": 0-11,
    "reason": "구체적 분석 (1-2문장)"
  },
  "audio_quality": {
    "score": 0-8,
    "reason": "구체적 분석 (1-2문장)"
  },
  "editing": {
    "score": 0-8,
    "reason": "구체적 분석 (1-2문장)"
  },
  "storytelling": {
    "score": 0-7,
    "reason": "구체적 분석 (1-2문장)"
  },
  "cta_clarity": {
    "score": 0-6,
    "reason": "구체적 분석 (1-2문장)"
  },
  "visual_quality": {
    "score": 0-3,
    "reason": "구체적 분석 (1-2문장)"
  }
}`;
  
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
    
    // Extract first complete JSON object using brace counting
    let braceCount = 0;
    let jsonStart = -1;
    let jsonEnd = -1;
    
    for (let i = 0; i < jsonText.length; i++) {
      if (jsonText[i] === '{') {
        if (braceCount === 0) jsonStart = i;
        braceCount++;
      } else if (jsonText[i] === '}') {
        braceCount--;
        if (braceCount === 0 && jsonStart !== -1) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No valid JSON found in response');
    }
    
    const extractedJson = jsonText.substring(jsonStart, jsonEnd);
    const parsedData = JSON.parse(extractedJson);
    
    // Validate and cap scores
    const maxScores = {
      opening_hook: 14,
      credibility: 13,
      product_demo: 11,
      audio_quality: 8,
      editing: 8,
      storytelling: 7,
      cta_clarity: 6,
      visual_quality: 3
    };
    
    const scores = {};
    for (const [key, maxScore] of Object.entries(maxScores)) {
      const itemData = parsedData[key] || {};
      let score = parseInt(itemData.score) || 0;
      
      // Cap score at maximum
      if (score > maxScore) score = maxScore;
      if (score < 0) score = 0;
      
      scores[key] = {
        score: score,
        max: maxScore,
        reason: itemData.reason || '분석 완료'
      };
    }
    
    const total_score = Object.values(scores).reduce((sum, item) => sum + item.score, 0);
    
    // Calculate reliability score (0-100%)
    const reliability = calculateReliabilityScore(scores, maxScores);
    
    console.log(`Video analysis complete. Total score: ${total_score}, Reliability: ${reliability}%`);
    
    return {
      scores,
      total_score,
      reliability
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
    // Filter out videos that don't have valid scores for this category
    const validScores = videoAnalyses
      .filter(v => v.scores && v.scores[category] && typeof v.scores[category].score === 'number' && !isNaN(v.scores[category].score))
      .map(v => v.scores[category]);
    
    if (validScores.length === 0) {
      // No valid scores, use default
      avgScores[category] = {
        score: Math.round(maxScores[category] * 0.7), // 70% as default
        max: maxScores[category],
        reason: "분석 데이터 부족 - 기본값 적용"
      };
      continue;
    }
    
    const avgScore = validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length;
    const reasons = validScores.map(s => s.reason).filter(r => r && r.length > 0);
    const mostCommonReason = reasons[0] || "분석 완료";
    
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
