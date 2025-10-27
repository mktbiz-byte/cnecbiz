// Netlify Serverless Function for YouTube Views Scraping
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // YouTube URL에서 비디오 ID 추출
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // YouTube 페이지 HTML 가져오기
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();

    // 뷰수 추출 (여러 패턴 시도)
    let views = null;

    // 패턴 1: "viewCount":"숫자"
    const pattern1 = /"viewCount":"(\d+)"/;
    const match1 = html.match(pattern1);
    if (match1) {
      views = parseInt(match1[1]);
    }

    // 패턴 2: viewCount":{"simpleText":"숫자 views"}
    if (!views) {
      const pattern2 = /viewCount":\{"simpleText":"([\d,]+)\s*views?"\}/;
      const match2 = html.match(pattern2);
      if (match2) {
        views = parseInt(match2[1].replace(/,/g, ''));
      }
    }

    // 패턴 3: 한글 조회수
    if (!views) {
      const pattern3 = /조회수\s*([\d,]+)회/;
      const match3 = html.match(pattern3);
      if (match3) {
        views = parseInt(match3[1].replace(/,/g, ''));
      }
    }

    if (!views) {
      return res.status(404).json({ error: 'Could not extract view count' });
    }

    return res.status(200).json({
      platform: 'youtube',
      videoId,
      url,
      views,
      scrapedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('YouTube scraping error:', error);
    return res.status(500).json({ 
      error: 'Failed to scrape YouTube views',
      message: error.message 
    });
  }
}

function extractYouTubeVideoId(url) {
  // YouTube URL 패턴들
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // 직접 비디오 ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

