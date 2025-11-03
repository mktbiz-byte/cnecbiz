const https = require('https');

/**
 * 네이버웍스 메시지 전송 Netlify Function (Bot Secret 방식)
 * 추천 크리에이터 문의를 네이버웍스 메시지방으로 전송
 */

// 메시지 전송 함수
async function sendMessage(botSecret, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      content: {
        type: 'text',
        text: message
      }
    });

    const options = {
      hostname: 'www.worksapis.com',
      path: `/v1.0/bots/${botId}/channels/${channelId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botSecret}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('Sending message to Naver Works API...');
    console.log('Bot ID:', botId);
    console.log('Channel ID:', channelId);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response data:', data);
        
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`메시지 전송 실패 (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(new Error(`메시지 요청 실패: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

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
    console.log('=== Naver Works Message Function Started ===');
    
    const { creators, companyName, brandName } = JSON.parse(event.body);
    console.log('Request data:', { creators: creators?.length, companyName, brandName });

    if (!creators || creators.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '크리에이터를 선택해주세요.' })
      };
    }

    // 환경 변수 확인
    const botSecret = process.env.NAVER_WORKS_BOT_SECRET?.trim();
    const botId = process.env.NAVER_WORKS_BOT_ID?.trim();
    const channelId = process.env.NAVER_WORKS_CHANNEL_ID?.trim();

    console.log('Environment variables check:');
    console.log('- BOT_SECRET:', botSecret ? 'Set' : 'Missing');
    console.log('- BOT_ID:', botId || 'Missing');
    console.log('- CHANNEL_ID:', channelId || 'Missing');

    if (!botSecret || !botId || !channelId) {
      throw new Error('네이버웍스 환경 변수가 설정되지 않았습니다.');
    }

    // 메시지 작성
    const creatorNames = creators.map(c => c.nickname || c.creator_name || c.name).join(', ');
    const koreanDate = new Date().toLocaleString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `${companyName || '기업명 미입력'} / ${brandName || '브랜드명 미입력'} - ${creatorNames}\n\n${companyName || '기업'}의 ${brandName || '브랜드'}가 추천 크리에이터에서 선택하였습니다.\n\n${koreanDate}`;

    console.log('Message content:', message);

    // 메시지 전송
    await sendMessage(botSecret, botId, channelId, message);

    console.log('=== Message sent successfully ===');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: '문의가 성공적으로 전송되었습니다.' 
      })
    };

  } catch (error) {
    console.error('=== Error occurred ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: '메시지 전송에 실패했습니다.',
        details: error.message 
      })
    };
  }
};
