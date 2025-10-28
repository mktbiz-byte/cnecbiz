/**
 * 주민등록번호 암호화 헬퍼
 * Supabase pgcrypto 사용
 */

import { supabaseBiz } from './supabaseClients'

// 암호화 키 (환경변수에서 가져오기, 없으면 기본값)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'cnec-default-encryption-key-2024'

/**
 * 주민등록번호 암호화
 * @param {string} residentNumber - 주민등록번호 (예: 123456-1234567)
 * @returns {Promise<string>} - 암호화된 문자열
 */
export async function encryptResidentNumber(residentNumber) {
  if (!residentNumber) return null

  try {
    const { data, error } = await supabaseBiz.rpc('encrypt_text', {
      plaintext: residentNumber,
      key: ENCRYPTION_KEY
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('암호화 오류:', error)
    throw new Error('주민등록번호 암호화에 실패했습니다.')
  }
}

/**
 * 주민등록번호 복호화
 * @param {string} encryptedText - 암호화된 문자열
 * @returns {Promise<string>} - 복호화된 주민등록번호
 */
export async function decryptResidentNumber(encryptedText) {
  if (!encryptedText) return null

  try {
    const { data, error } = await supabaseBiz.rpc('decrypt_text', {
      encrypted: encryptedText,
      key: ENCRYPTION_KEY
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('복호화 오류:', error)
    throw new Error('주민등록번호 복호화에 실패했습니다.')
  }
}

/**
 * 주민등록번호 마스킹
 * @param {string} residentNumber - 주민등록번호
 * @returns {string} - 마스킹된 주민등록번호 (예: 123456-1******)
 */
export function maskResidentNumber(residentNumber) {
  if (!residentNumber) return ''
  
  const cleaned = residentNumber.replace(/-/g, '')
  if (cleaned.length !== 13) return residentNumber
  
  return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 7)}******`
}

/**
 * 주민등록번호 유효성 검사
 * @param {string} residentNumber - 주민등록번호
 * @returns {boolean} - 유효 여부
 */
export function validateResidentNumber(residentNumber) {
  if (!residentNumber) return false
  
  const cleaned = residentNumber.replace(/-/g, '')
  
  // 길이 체크
  if (cleaned.length !== 13) return false
  
  // 숫자만 포함되어 있는지 체크
  if (!/^\d+$/.test(cleaned)) return false
  
  // 생년월일 유효성 체크
  const year = parseInt(cleaned.slice(0, 2))
  const month = parseInt(cleaned.slice(2, 4))
  const day = parseInt(cleaned.slice(4, 6))
  
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  
  // 성별 코드 체크 (1-4)
  const genderCode = parseInt(cleaned.slice(6, 7))
  if (genderCode < 1 || genderCode > 4) return false
  
  // 검증 번호 체크 (간단한 알고리즘)
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5]
  let sum = 0
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights[i]
  }
  
  const checkDigit = (11 - (sum % 11)) % 10
  const lastDigit = parseInt(cleaned[12])
  
  return checkDigit === lastDigit
}

