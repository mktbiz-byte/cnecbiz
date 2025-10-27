// Netlify Serverless Function for Instagram Views Scraping
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

    // Instagram URL 검증
    if (!url.includes('instagram.com')) {
      return res.status(400).json({ error: 'Invalid Instagram URL' });
    }

    // Instagram 페이지 HTML 가져오기 (공개 게시물만 가능)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();

    // 뷰수 추출
    let views = null;
    let likes = null;

    // 패턴 1: video_view_count
    const viewPattern1 = /"video_view_count":(\d+)/;
    const viewMatch1 = html.match(viewPattern1);
    if (viewMatch1) {
      views = parseInt(viewMatch1[1]);
    }

    // 패턴 2: edge_media_preview_like (좋아요 수)
    const likePattern = /"edge_media_preview_like":\{"count":(\d+)\}/;
    const likeMatch = html.match(likePattern);
    if (likeMatch) {
      likes = parseInt(likeMatch[1]);
    }

    // 패턴 3: edge_liked_by
    if (!likes) {
      const likePattern2 = /"edge_liked_by":\{"count":(\d+)\}/;
      const likeMatch2 = html.match(likePattern2);
      if (likeMatch2) {
        likes = parseInt(likeMatch2[1]);
      }
    }

    // 릴스의 경우 조회수, 일반 게시물의 경우 좋아요 수
    const engagementCount = views || likes;

    if (!engagementCount) {
      return res.status(404).json({ 
        error: 'Could not extract engagement data',
        note: 'Instagram may require login for this content'
      });
    }

    return res.status(200).json({
      platform: 'instagram',
      url,
      views: views || null,
      likes: likes || null,
      engagementCount,
      type: views ? 'video' : 'post',
      scrapedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Instagram scraping error:', error);
    return res.status(500).json({ 
      error: 'Failed to scrape Instagram data',
      message: error.message 
    });
  }
}

