// netlify/functions/lib/supabase.js
// 모든 Netlify Functions에서 이 모듈로 Supabase 클라이언트를 생성할 것
const { createClient } = require('@supabase/supabase-js');

// ═══ 표준 환경변수명 ═══
// BIZ:   VITE_SUPABASE_BIZ_URL + SUPABASE_SERVICE_ROLE_KEY
// Korea: VITE_SUPABASE_KOREA_URL + SUPABASE_KOREA_SERVICE_ROLE_KEY
// Japan: VITE_SUPABASE_JAPAN_URL + SUPABASE_JAPAN_SERVICE_ROLE_KEY
// US:    VITE_SUPABASE_US_URL + SUPABASE_US_SERVICE_ROLE_KEY

function getBizClient() {
  const url = process.env.VITE_SUPABASE_BIZ_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('BIZ Supabase 환경변수 누락: VITE_SUPABASE_BIZ_URL, SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

function getKoreaClient() {
  const url = process.env.VITE_SUPABASE_KOREA_URL;
  const key = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Korea Supabase 환경변수 누락: VITE_SUPABASE_KOREA_URL, SUPABASE_KOREA_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

function getJapanClient() {
  const url = process.env.VITE_SUPABASE_JAPAN_URL;
  const key = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Japan Supabase 환경변수 누락: VITE_SUPABASE_JAPAN_URL, SUPABASE_JAPAN_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

function getUSClient() {
  const url = process.env.VITE_SUPABASE_US_URL;
  const key = process.env.SUPABASE_US_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('US Supabase 환경변수 누락: VITE_SUPABASE_US_URL, SUPABASE_US_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

function getTaiwanClient() {
  const url = process.env.VITE_SUPABASE_TAIWAN_URL;
  const key = process.env.SUPABASE_TAIWAN_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Taiwan Supabase 환경변수 누락');
  return createClient(url, key);
}

// 리전 이름으로 클라이언트 가져오기
function getRegionClient(region) {
  const map = {
    biz: getBizClient,
    korea: getKoreaClient,
    japan: getJapanClient,
    us: getUSClient,
    taiwan: getTaiwanClient,
  };
  const fn = map[region?.toLowerCase()];
  if (!fn) throw new Error(`알 수 없는 리전: ${region}`);
  return fn();
}

// CORS 헤더 (모든 함수 공통)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

// OPTIONS 핸들러
function handleOptions() {
  return { statusCode: 204, headers: CORS_HEADERS, body: '' };
}

// 에러 응답 생성
function errorResponse(statusCode, message) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: message }),
  };
}

// 성공 응답 생성
function successResponse(data) {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

module.exports = {
  getBizClient,
  getKoreaClient,
  getJapanClient,
  getUSClient,
  getTaiwanClient,
  getRegionClient,
  CORS_HEADERS,
  handleOptions,
  errorResponse,
  successResponse,
};
