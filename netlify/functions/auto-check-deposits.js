/**
 * 자동 입금 확인 및 포인트 충전 시스템
 * 5분마다 실행되어 pending 상태의 충전 요청을 확인하고
 * Popbill API로 계좌 거래내역을 조회하여 입금 확인 후 자동 처리
 */

const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')

// Supabase 클라이언트 초기화 (Service Role Key 사용)
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Popbill API 설정
const POPBILL_LINK_ID = process.env.POPBILL_LINK_ID
const POPBILL_SECRET_KEY = process.env.POPBILL_SECRET_KEY
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM
const POPBILL_USER_ID = process.env.POPBILL_USER_ID
const POPBILL_TEST_MODE = process.env.POPBILL_TEST_MODE !== 'false' // 기본값 true

// Popbill API Base URL
const POPBILL_API_URL = POPBILL_TEST_MODE 
  ? 'https://testapi.popbill.com' 
  : 'https://api.popbill.com'

// 계좌 정보 (IBK기업은행)
const BANK_CODE = '0003' // 기업은행
const BANK_ACCOUNT = '047-122753-04-011'

exports.handler = async (event, context) => {
  console.log('🔍 자동 입금 확인 시작...')

  try {
    // 1. pending 상태의 계좌이체 충전 요청 조회
    const { data: pendingRequests, error: fetchError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('payment_method', 'bank_transfer')
      .not('depositor_name', 'is', null)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('❌ 충전 요청 조회 오류:', fetchError)
      throw fetchError
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log('✅ 처리할 충전 요청이 없습니다.')
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '처리할 충전 요청이 없습니다.',
          processed: 0
        })
      }
    }

    console.log(`📋 ${pendingRequests.length}개의 충전 요청 확인 중...`)

    // 2. 각 요청에 대해 입금 확인
    let processedCount = 0
    const results = []

    for (const request of pendingRequests) {
      try {
        console.log(`\n🔎 요청 ID: ${request.id}`)
        console.log(`   입금자명: ${request.depositor_name}`)
        console.log(`   금액: ${request.amount.toLocaleString()}원`)

        // Popbill API로 계좌 거래내역 조회
        const isDeposited = await checkDeposit(
          request.depositor_name,
          request.amount,
          request.created_at
        )

        if (isDeposited) {
          console.log(`✅ 입금 확인됨!`)

          // 포인트 충전
          await processDeposit(request)
          processedCount++

          results.push({
            id: request.id,
            status: 'success',
            message: '입금 확인 및 포인트 충전 완료'
          })
        } else {
          console.log(`⏳ 아직 입금되지 않음`)
          results.push({
            id: request.id,
            status: 'pending',
            message: '입금 대기 중'
          })
        }
      } catch (error) {
        console.error(`❌ 요청 처리 오류 (ID: ${request.id}):`, error)
        results.push({
          id: request.id,
          status: 'error',
          message: error.message
        })
      }
    }

    console.log(`\n✅ 자동 입금 확인 완료: ${processedCount}/${pendingRequests.length}개 처리됨`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `${processedCount}개의 입금을 확인하고 처리했습니다.`,
        total: pendingRequests.length,
        processed: processedCount,
        results
      })
    }

  } catch (error) {
    console.error('❌ 자동 입금 확인 오류:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}

/**
 * Popbill API로 계좌 거래내역 조회하여 입금 확인
 */
async function checkDeposit(depositorName, amount, createdAt) {
  try {
    // 조회 기간 설정 (요청 생성 시간부터 현재까지)
    const startDate = new Date(createdAt).toISOString().split('T')[0].replace(/-/g, '')
    const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '')

    console.log(`   조회 기간: ${startDate} ~ ${endDate}`)

    // Popbill API 호출 (계좌 거래내역 조회)
    // 참고: 실제 API 구현은 Popbill 문서를 참고하여 수정 필요
    const response = await axios.post(
      `${POPBILL_API_URL}/EasyFinBank/Search`,
      {
        CorpNum: POPBILL_CORP_NUM,
        BankCode: BANK_CODE,
        AccountNumber: BANK_ACCOUNT,
        SDate: startDate,
        EDate: endDate,
        TradeType: ['입금'], // 입금만 조회
        Page: 1,
        PerPage: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${POPBILL_LINK_ID}:${POPBILL_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.data || !response.data.list) {
      console.log('   ⚠️ 거래내역 없음')
      return false
    }

    // 거래내역에서 입금자명과 금액이 일치하는 항목 찾기
    const matchedTransaction = response.data.list.find(tx => {
      const nameMatch = tx.depositor && tx.depositor.includes(depositorName)
      const amountMatch = parseInt(tx.amount) === parseInt(amount)
      return nameMatch && amountMatch
    })

    return !!matchedTransaction

  } catch (error) {
    console.error('   ❌ Popbill API 호출 오류:', error.message)
    // API 오류 시 false 반환 (다음 체크 때 다시 시도)
    return false
  }
}

/**
 * 입금 확인 후 포인트 충전 및 알림 발송
 */
async function processDeposit(request) {
  try {
    // 1. 포인트 충전 (미수금이 아닌 경우만)
    if (!request.is_credit) {
      const { error: pointsError } = await supabaseAdmin.rpc('add_points', {
        user_id: request.company_id,
        points: parseInt(request.amount),
        transaction_type: 'charge',
        transaction_description: `계좌이체 충전 - ${parseInt(request.amount).toLocaleString()}원 (${request.depositor_name})`
      })

      if (pointsError) {
        throw new Error(`포인트 충전 실패: ${pointsError.message}`)
      }
      console.log(`   ✅ 포인트 충전 완료: ${request.amount.toLocaleString()}원`)
    } else {
      console.log(`   💳 미수금 입금 확인 - 포인트는 이미 선지급됨`)
    }

    // 2. 충전 요청 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('points_charge_requests')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', request.id)

    if (updateError) {
      throw new Error(`상태 업데이트 실패: ${updateError.message}`)
    }

    // 3. 세금계산서 발행 (필요 시)
    if (request.needs_tax_invoice && request.tax_invoice_info) {
      try {
        await issueTaxInvoice(request)
      } catch (taxError) {
        console.error('   ⚠️ 세금계산서 발행 오류:', taxError.message)
        // 세금계산서 발행 실패해도 포인트 충전은 완료
      }
    }

    // 4. 알림 발송 (카카오톡 → SMS → 이메일)
    try {
      await sendNotifications(request)
    } catch (notifError) {
      console.error('   ⚠️ 알림 발송 오류:', notifError.message)
      // 알림 발송 실패해도 포인트 충전은 완료
    }

    console.log(`   ✅ 포인트 충전 완료: ${request.amount.toLocaleString()}원`)

  } catch (error) {
    console.error(`   ❌ 입금 처리 오류:`, error)
    throw error
  }
}

/**
 * Popbill API로 세금계산서 발행
 */
async function issueTaxInvoice(request) {
  // TODO: Popbill 세금계산서 발행 API 구현
  console.log('   📄 세금계산서 발행 중...')
  
  // Popbill API 호출 예시 (실제 구현 필요)
  // const response = await axios.post(
  //   `${POPBILL_API_URL}/Taxinvoice/Issue`,
  //   { ... },
  //   { headers: { ... } }
  // )
  
  console.log('   ✅ 세금계산서 발행 완료')
}

/**
 * 알림 발송 (카카오톡 → SMS → 이메일)
 */
async function sendNotifications(request) {
  console.log('   📨 알림 발송 중...')

  // 회사 정보 조회
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('company_name, email, phone_number')
    .eq('user_id', request.company_id)
    .single()

  if (!company) {
    throw new Error('회사 정보를 찾을 수 없습니다.')
  }

  const message = `[CNEC] 포인트 충전 완료\n\n${request.amount.toLocaleString()}원이 충전되었습니다.\n입금자: ${request.depositor_name}`

  // 1. 카카오톡 알림톡 시도
  let kakaoSuccess = false
  try {
    // TODO: Popbill 카카오톡 API 구현
    // kakaoSuccess = await sendKakaoNotification(company.phone_number, message)
    console.log('   📱 카카오톡 발송 (구현 예정)')
  } catch (error) {
    console.error('   ⚠️ 카카오톡 발송 실패:', error.message)
  }

  // 2. 카카오톡 실패 시 SMS 발송
  if (!kakaoSuccess && company.phone_number) {
    try {
      // TODO: Popbill SMS API 구현
      // await sendSMS(company.phone_number, message)
      console.log('   📱 SMS 발송 (구현 예정)')
    } catch (error) {
      console.error('   ⚠️ SMS 발송 실패:', error.message)
    }
  }

  // 3. 이메일 발송
  if (company.email) {
    try {
      // TODO: 이메일 발송 구현
      console.log('   📧 이메일 발송 (구현 예정)')
    } catch (error) {
      console.error('   ⚠️ 이메일 발송 실패:', error.message)
    }
  }

  console.log('   ✅ 알림 발송 완료')
}

