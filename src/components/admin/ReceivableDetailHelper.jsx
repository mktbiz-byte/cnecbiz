// 미수금 상세 정보 조회 및 계산 헬퍼 함수
import { supabaseBiz } from '../../lib/supabaseClients'

/**
 * 미수금 항목의 남은 금액 계산
 * @param {string} financialRecordId - financial_records의 ID
 * @returns {Promise<{remainingAmount: number, completedAmount: number, totalAmount: number}>}
 */
export async function calculateRemainingAmount(financialRecordId) {
  try {
    const { data, error } = await supabaseBiz
      .from('receivable_details')
      .select('*')
      .eq('financial_record_id', financialRecordId)
      .maybeSingle()
    
    if (error) throw error
    
    if (!data) {
      return {
        remainingAmount: 0,
        completedAmount: 0,
        totalAmount: 0
      }
    }
    
    // 완료 금액 계산
    const completedAmount = 
      (parseInt(data.completed_200k) || 0) * 200000 +
      (parseInt(data.completed_300k) || 0) * 300000 +
      (parseInt(data.completed_400k) || 0) * 400000 +
      (parseInt(data.completed_600k) || 0) * 600000 +
      (parseInt(data.completed_700k) || 0) * 700000
    
    // 남은 금액 계산
    const remainingAmount = 
      ((parseInt(data.price_200k) || 0) - (parseInt(data.completed_200k) || 0)) * 200000 +
      ((parseInt(data.price_300k) || 0) - (parseInt(data.completed_300k) || 0)) * 300000 +
      ((parseInt(data.price_400k) || 0) - (parseInt(data.completed_400k) || 0)) * 400000 +
      ((parseInt(data.price_600k) || 0) - (parseInt(data.completed_600k) || 0)) * 600000 +
      ((parseInt(data.price_700k) || 0) - (parseInt(data.completed_700k) || 0)) * 700000
    
    return {
      remainingAmount,
      completedAmount,
      totalAmount: parseFloat(data.total_amount) || 0
    }
  } catch (error) {
    console.error('남은 금액 계산 오류:', error)
    return {
      remainingAmount: 0,
      completedAmount: 0,
      totalAmount: 0
    }
  }
}

/**
 * 여러 미수금 항목의 남은 금액을 일괄 조회
 * @param {Array<string>} financialRecordIds - financial_records ID 배열
 * @returns {Promise<Map<string, {remainingAmount: number, completedAmount: number}>>}
 */
export async function calculateRemainingAmounts(financialRecordIds) {
  try {
    const { data, error } = await supabaseBiz
      .from('receivable_details')
      .select('*')
      .in('financial_record_id', financialRecordIds)
    
    if (error) throw error
    
    const resultMap = new Map()
    
    // 각 항목별 계산
    data?.forEach(item => {
      const completedAmount = 
        (parseInt(item.completed_200k) || 0) * 200000 +
        (parseInt(item.completed_300k) || 0) * 300000 +
        (parseInt(item.completed_400k) || 0) * 400000 +
        (parseInt(item.completed_600k) || 0) * 600000 +
        (parseInt(item.completed_700k) || 0) * 700000
      
      const remainingAmount = 
        ((parseInt(item.price_200k) || 0) - (parseInt(item.completed_200k) || 0)) * 200000 +
        ((parseInt(item.price_300k) || 0) - (parseInt(item.completed_300k) || 0)) * 300000 +
        ((parseInt(item.price_400k) || 0) - (parseInt(item.completed_400k) || 0)) * 400000 +
        ((parseInt(item.price_600k) || 0) - (parseInt(item.completed_600k) || 0)) * 600000 +
        ((parseInt(item.price_700k) || 0) - (parseInt(item.completed_700k) || 0)) * 700000
      
      resultMap.set(item.financial_record_id, {
        remainingAmount,
        completedAmount,
        totalAmount: parseFloat(item.total_amount) || 0
      })
    })
    
    return resultMap
  } catch (error) {
    console.error('남은 금액 일괄 조회 오류:', error)
    return new Map()
  }
}
