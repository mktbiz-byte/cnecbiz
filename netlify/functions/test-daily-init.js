/**
 * 일일 리포트 초기화 테스트
 */
const { createClient } = require('@supabase/supabase-js');

// 환경변수 체크
const envCheck = {
  VITE_SUPABASE_BIZ_URL: process.env.VITE_SUPABASE_BIZ_URL ? 'set' : 'missing',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
  VITE_SUPABASE_KOREA_URL: process.env.VITE_SUPABASE_KOREA_URL ? 'set' : 'missing',
  SUPABASE_KOREA_SERVICE_ROLE_KEY: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY ? 'set' : 'missing',
  VITE_SUPABASE_JAPAN_URL: process.env.VITE_SUPABASE_JAPAN_URL ? 'set' : 'missing',
  SUPABASE_JAPAN_SERVICE_ROLE_KEY: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY ? 'set' : 'missing',
  VITE_SUPABASE_US_URL: process.env.VITE_SUPABASE_US_URL ? 'set' : 'missing',
  SUPABASE_US_SERVICE_ROLE_KEY: process.env.SUPABASE_US_SERVICE_ROLE_KEY ? 'set' : 'missing'
};

// Supabase 클라이언트 초기화 테스트
let initResults = {};

try {
  const supabaseBiz = createClient(
    process.env.VITE_SUPABASE_BIZ_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  initResults.biz = 'success';
} catch (e) {
  initResults.biz = `error: ${e.message}`;
}

try {
  if (process.env.VITE_SUPABASE_KOREA_URL && process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY) {
    const supabaseKorea = createClient(
      process.env.VITE_SUPABASE_KOREA_URL,
      process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
    );
    initResults.korea = 'success';
  } else {
    initResults.korea = 'skipped (env vars missing)';
  }
} catch (e) {
  initResults.korea = `error: ${e.message}`;
}

try {
  if (process.env.VITE_SUPABASE_JAPAN_URL && process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY) {
    const supabaseJapan = createClient(
      process.env.VITE_SUPABASE_JAPAN_URL,
      process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
    );
    initResults.japan = 'success';
  } else {
    initResults.japan = 'skipped (env vars missing)';
  }
} catch (e) {
  initResults.japan = `error: ${e.message}`;
}

try {
  if (process.env.VITE_SUPABASE_US_URL && process.env.SUPABASE_US_SERVICE_ROLE_KEY) {
    const supabaseUS = createClient(
      process.env.VITE_SUPABASE_US_URL,
      process.env.SUPABASE_US_SERVICE_ROLE_KEY
    );
    initResults.us = 'success';
  } else {
    initResults.us = 'skipped (env vars missing)';
  }
} catch (e) {
  initResults.us = `error: ${e.message}`;
}

exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      envCheck,
      initResults,
      timestamp: new Date().toISOString()
    }, null, 2)
  };
};
