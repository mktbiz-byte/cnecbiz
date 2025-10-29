/**
 * 캠페인 입금 자동 확인 Edge Function
 * 5분마다 실행되어 pending 상태의 캠페인 입금을 확인하고 자동 처리
 * Popbill API로 계좌 거래내역을 조회하여 입금 확인
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Popbill API 설정
const POPBILL_LINK_ID = Deno.env.get('POPBILL_LINK_ID')
const POPBILL_SECRET_KEY = Deno.env.get('POPBILL_SECRET_KEY')
const POPBILL_CORP_NUM = Deno.env.get('POPBILL_CORP_NUM')
const POPBILL_TEST_MODE = Deno.env.get('POPBILL_TEST_MODE') !== 'false'

const POPBILL_API_URL = POPBILL_TEST_MODE 
  ? 'https://testapi.popbill.com' 
  : 'https://api.popbill.com'

// 계좌 정보 (IBK기업은행)
const BANK_CODE = '0003'
const BANK_ACCOUNT = '047-122753-04-011'

interface CampaignPayment {
  id: string
  company_id: string
  company_email: string
  estimated_cost: number
  payment_status: string
  invoice_data?: {
    company_name?: string
    depositor_name?: string
  }
  created_at: string
  payment_requested_at?: string
}

Deno.serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 캠페인 입금 자동 확인 시작...')

    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. pending 상태의 캠페인 조회 (Korea 데이터베이스)
    const { data: pendingCampaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, company_id, company_email, estimated_cost, payment_status, invoice_data, created_at, payment_requested_at')
      .eq('payment_status', 'pending')
      .eq('region', 'korea')
      .not('invoice_data', 'is', null)
      .order('payment_requested_at', { ascending: true })

    if (fetchError) {
      console.error('❌ 캠페인 조회 오류:', fetchError)
      throw fetchError
    }

    if (!pendingCampaigns || pendingCampaigns.length === 0) {
      console.log('✅ 처리할 캠페인이 없습니다.')
      return new Response(
        JSON.stringify({
          success: true,
          message: '처리할 캠페인이 없습니다.',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 ${pendingCampaigns.length}개의 캠페인 입금 확인 중...`)

    // 2. 각 캠페인에 대해 입금 확인
    let processedCount = 0
    const results = []

    for (const campaign of pendingCampaigns) {
      try {
        const depositorName = campaign.invoice_data?.depositor_name || campaign.invoice_data?.company_name
        
        if (!depositorName) {
          console.log(`⚠️ 캠페인 ${campaign.id}: 입금자명 없음`)
          results.push({
            id: campaign.id,
            status: 'skipped',
            message: '입금자명 없음'
          })
          continue
        }

        console.log(`\n🔎 캠페인 ID: ${campaign.id}`)
        console.log(`   입금자명: ${depositorName}`)
        console.log(`   금액: ${campaign.estimated_cost.toLocaleString()}원`)

        // Popbill API로 계좌 거래내역 조회
        const isDeposited = await checkDeposit(
          depositorName,
          campaign.estimated_cost,
          campaign.payment_requested_at || campaign.created_at
        )

        if (isDeposited) {
          console.log(`✅ 입금 확인됨!`)

          // 입금 확인 처리
          await processPayment(supabase, campaign)
          processedCount++

          results.push({
            id: campaign.id,
            status: 'success',
            message: '입금 확인 및 처리 완료'
          })
        } else {
          console.log(`⏳ 아직 입금되지 않음`)
          results.push({
            id: campaign.id,
            status: 'pending',
            message: '입금 대기 중'
          })
        }
      } catch (error) {
        console.error(`❌ 캠페인 처리 오류 (ID: ${campaign.id}):`, error)
        results.push({
          id: campaign.id,
          status: 'error',
          message: error.message
        })
      }
    }

    console.log(`\n✅ 자동 입금 확인 완료: ${processedCount}/${pendingCampaigns.length}개 처리됨`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${processedCount}개의 입금을 확인하고 처리했습니다.`,
        total: pendingCampaigns.length,
        processed: processedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ 자동 입금 확인 오류:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Popbill API로 계좌 거래내역 조회하여 입금 확인
 */
async function checkDeposit(
  depositorName: string,
  amount: number,
  createdAt: string
): Promise<boolean> {
  try {
    // 조회 기간 설정 (요청 생성 시간부터 현재까지)
    const startDate = new Date(createdAt).toISOString().split('T')[0].replace(/-/g, '')
    const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '')

    console.log(`   조회 기간: ${startDate} ~ ${endDate}`)

    // Popbill API 호출 (계좌 거래내역 조회)
    const response = await fetch(
      `${POPBILL_API_URL}/EasyFinBank/Search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${POPBILL_LINK_ID}:${POPBILL_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          CorpNum: POPBILL_CORP_NUM,
          BankCode: BANK_CODE,
          AccountNumber: BANK_ACCOUNT,
          SDate: startDate,
          EDate: endDate,
          TradeType: ['입금'],
          Page: 1,
          PerPage: 100
        })
      }
    )

    if (!response.ok) {
      console.log('   ⚠️ Popbill API 오류:', response.status)
      return false
    }

    const data = await response.json()

    if (!data || !data.list || data.list.length === 0) {
      console.log('   ⚠️ 거래내역 없음')
      return false
    }

    // 거래내역에서 입금자명과 금액이 일치하는 항목 찾기
    const matchedTransaction = data.list.find((tx: any) => {
      const nameMatch = tx.depositor && tx.depositor.includes(depositorName)
      const amountMatch = parseInt(tx.amount) === parseInt(amount.toString())
      return nameMatch && amountMatch
    })

    return !!matchedTransaction

  } catch (error) {
    console.error('   ❌ Popbill API 호출 오류:', error.message)
    return false
  }
}

/**
 * 입금 확인 후 캠페인 상태 업데이트
 */
async function processPayment(supabase: any, campaign: CampaignPayment) {
  try {
    // 캠페인 상태 업데이트
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        payment_status: 'confirmed',
        payment_confirmed_at: new Date().toISOString(),
        approval_status: 'pending' // 입금 확인 후 승인 대기 상태로 변경
      })
      .eq('id', campaign.id)

    if (updateError) {
      throw new Error(`상태 업데이트 실패: ${updateError.message}`)
    }

    console.log(`   ✅ 캠페인 상태 업데이트 완료`)

    // TODO: 알림 발송 (카카오톡/이메일/SMS)
    // await sendNotification(campaign)

  } catch (error) {
    console.error(`   ❌ 입금 처리 오류:`, error)
    throw error
  }
}

