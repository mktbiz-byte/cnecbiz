/**
 * 일일 보고서 디버그 함수 - 각 컴포넌트 테스트
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // 1. 환경변수 체크
    results.tests.envVars = {
      VITE_SUPABASE_BIZ_URL: !!process.env.VITE_SUPABASE_BIZ_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
      NAVER_WORKS_CLIENT_ID: !!process.env.NAVER_WORKS_CLIENT_ID,
      NAVER_WORKS_CLIENT_SECRET: !!process.env.NAVER_WORKS_CLIENT_SECRET,
      NAVER_WORKS_BOT_ID: !!process.env.NAVER_WORKS_BOT_ID,
      NAVER_WORKS_CHANNEL_ID: !!process.env.NAVER_WORKS_CHANNEL_ID
    };

    // 2. Supabase 클라이언트 생성 테스트
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 간단한 쿼리 테스트
        const { data, error } = await supabase
          .from('campaigns')
          .select('id')
          .limit(1);

        if (error) {
          results.tests.supabase = { success: false, error: error.message };
        } else {
          results.tests.supabase = { success: true, sampleData: data?.length };
        }
      } else {
        results.tests.supabase = { success: false, error: 'Missing env vars' };
      }
    } catch (supaError) {
      results.tests.supabase = { success: false, error: supaError.message };
    }

    // 3. nodemailer 모듈 테스트
    try {
      const nodemailer = require('nodemailer');
      results.tests.nodemailer = { success: true, version: 'loaded' };
    } catch (nodeErr) {
      results.tests.nodemailer = { success: false, error: nodeErr.message };
    }

    // 4. crypto 테스트
    try {
      const testSign = crypto.createSign('RSA-SHA256');
      results.tests.crypto = { success: true };
    } catch (cryptoErr) {
      results.tests.crypto = { success: false, error: cryptoErr.message };
    }

    // 5. companies 테이블 테스트
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('companies')
          .select('id')
          .limit(1);

        if (error) {
          results.tests.companiesTable = { success: false, error: error.message };
        } else {
          results.tests.companiesTable = { success: true, exists: true };
        }
      }
    } catch (compErr) {
      results.tests.companiesTable = { success: false, error: compErr.message };
    }

    // 6. applications 테이블 테스트
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('applications')
          .select('id, status')
          .limit(1);

        if (error) {
          results.tests.applicationsTable = { success: false, error: error.message };
        } else {
          results.tests.applicationsTable = { success: true, exists: true };
        }
      }
    } catch (appErr) {
      results.tests.applicationsTable = { success: false, error: appErr.message };
    }

    // 모든 테스트 통과 여부
    results.allPassed = Object.values(results.tests).every(t => t.success !== false);

    return {
      statusCode: 200,
      body: JSON.stringify(results, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
