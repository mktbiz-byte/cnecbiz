/**
 * 모듈 로딩 테스트 함수
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 모든 모듈이 로드되었는지 테스트
exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      test: 'modules',
      supabase: typeof createClient === 'function',
      https: typeof https.request === 'function',
      crypto: typeof crypto.sign === 'function',
      nodemailer: typeof nodemailer.createTransport === 'function',
      timestamp: new Date().toISOString()
    })
  };
};
