import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const POPBILL_LINK_ID = Deno.env.get('POPBILL_LINK_ID')!
const POPBILL_SECRET_KEY = Deno.env.get('POPBILL_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 팝빌 API 인증 토큰 생성
async function generateToken(linkID: string, secretKey: string) {
  const timestamp = new Date().getTime()
  const message = linkID + timestamp
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const signatureArray = Array.from(new Uint8Array(signatureBuffer))
  const signature = btoa(String.fromCharCode(...signatureArray))
  
  return {
    'Authorization': `Bearer ${signature}`,
    'x-pb-linkid': linkID,
    'x-pb-timestamp': timestamp.toString(),
    'Content-Type': 'application/json'
  }
}

// 팝빌 계좌조회 API 호출
async function checkDeposits(startDate: string, endDate: string) {
  const headers = await generateToken(POPBILL_LINK_ID, POPBILL_SECRET_KEY)
  
  const response = await fetch('https://popbill.linkhub.co.kr/EasyFin/Bank/Search', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      CorpNum: '5758102253',
      BankCode: '',
      AccountNumber: '',
      SDate: startDate,
      EDate: endDate,
      Order: 'D'
    })
  })
  
  if (!response.ok) {
    throw new Error(`Popbill API error: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.list?.filter((item: any) => item.TradeType === '입금' || item.TradeType === '1') || []
}

// 세금계산서 발행
async function issueTaxInvoice(invoiceData: any, amount: number) {
  const headers = await generateToken(POPBILL_LINK_ID, POPBILL_SECRET_KEY)
  
  const taxInvoiceData = {
    writeDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
    chargeDirection: '정과금',
    purposeType: '영수',
    taxType: '과세',
    
    invoicerCorpNum: '5758102253',
    invoicerCorpName: '(주)CNEC',
    invoicerCEOName: 'CNEC 대표',
    invoicerAddr: '서울시 강남구',
    invoicerEmail: 'admin@cnec.co.kr',
    
    invoiceeCorpNum: invoiceData.business_number?.replace(/-/g, '') || '',
    invoiceeCorpName: invoiceData.company_name,
    invoiceeCEOName: invoiceData.representative,
    invoiceeAddr: invoiceData.address,
    invoiceeEmail: invoiceData.email,
    invoiceeContactName: invoiceData.representative,
    invoiceeTEL: invoiceData.contact,
    
    supplyCostTotal: Math.floor(amount / 1.1),
    taxTotal: amount - Math.floor(amount / 1.1),
    totalAmount: amount,
    
    detailList: [{
      serialNum: 1,
      itemName: '포인트 충전',
      spec: '',
      qty: 1,
      unitCost: Math.floor(amount / 1.1),
      supplyCost: Math.floor(amount / 1.1),
      tax: amount - Math.floor(amount / 1.1),
      remark: invoiceData.memo || ''
    }],
    
    remark1: invoiceData.memo || '',
    businessType: invoiceData.business_type || '',
    businessCategory: invoiceData.business_category || ''
  }
  
  const response = await fetch('https://popbill.linkhub.co.kr/TaxInvoice/Issue', {
    method: 'POST',
    headers,
    body: JSON.stringify(taxInvoiceData)
  })
  
  if (!response.ok) {
    throw new Error(`Tax invoice issuance failed: ${response.statusText}`)
  }
  
  return await response.json()
}

// 현금영수증 발행
async function issueCashbill(invoiceData: any, amount: number) {
  const headers = await generateToken(POPBILL_LINK_ID, POPBILL_SECRET_KEY)
  
  const cashbillData = {
    franchiseCorpNum: '5758102253',
    franchiseCorpName: '(주)CNEC',
    franchiseCEOName: 'CNEC 대표',
    franchiseAddr: '서울시 강남구',
    franchiseTEL: '02-1234-5678',
    
    tradeDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
    tradeUsage: invoiceData.cashbill_usage || '1',
    tradeType: '승인거래',
    
    identityNum: invoiceData.cashbill_identity_num,
    customerName: invoiceData.company_name || '',
    itemName: '포인트 충전',
    
    supplyCost: amount,
    tax: 0,
    totalAmount: amount,
    
    email: invoiceData.email || '',
    remark: invoiceData.memo || ''
  }
  
  const response = await fetch('https://popbill.linkhub.co.kr/Cashbill/Issue', {
    method: 'POST',
    headers,
    body: JSON.stringify(cashbillData)
  })
  
  if (!response.ok) {
    throw new Error(`Cashbill issuance failed: ${response.statusText}`)
  }
  
  return await response.json()
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // 미확인 충전 요청 조회
    const { data: pendingRequests, error: fetchError } = await supabase
      .from('points_charge_requests')
      .select('*')
      .eq('status', 'pending')
    
    if (fetchError) throw fetchError
    
    if (!pendingRequests || pendingRequests.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending requests' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 최근 3일 입금 내역 조회
    const today = new Date()
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
    const startDate = threeDaysAgo.toISOString().split('T')[0].replace(/-/g, '')
    const endDate = today.toISOString().split('T')[0].replace(/-/g, '')
    
    const deposits = await checkDeposits(startDate, endDate)
    
    let processedCount = 0
    
    // 각 충전 요청과 입금 내역 매칭
    for (const request of pendingRequests) {
      const expectedDepositor = request.invoice_data?.depositor_name || request.invoice_data?.company_name
      const expectedAmount = request.amount
      
      // 입금 내역에서 매칭되는 항목 찾기
      const matchedDeposit = deposits.find((deposit: any) => {
        const amountMatch = parseInt(deposit.Amount) === expectedAmount
        const depositorMatch = expectedDepositor && deposit.Briefs?.includes(expectedDepositor)
        return amountMatch && depositorMatch
      })
      
      if (!matchedDeposit) continue
      
      console.log(`[Matched] Request ${request.id} with deposit ${matchedDeposit.Briefs}`)
      
      // 세금계산서 또는 현금영수증 발행
      let receiptResult
      const receiptType = request.invoice_data?.receipt_type || 'tax_invoice'
      
      try {
        if (receiptType === 'tax_invoice') {
          receiptResult = await issueTaxInvoice(request.invoice_data, request.amount)
        } else {
          receiptResult = await issueCashbill(request.invoice_data, request.amount)
        }
        
        // 충전 요청 상태 업데이트
        await supabase
          .from('points_charge_requests')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            payment_confirmed_at: new Date().toISOString(),
            receipt_issued: true,
            receipt_type: receiptType,
            receipt_data: receiptResult
          })
          .eq('id', request.id)
        
        // 포인트 지급
        const { data: companyData } = await supabase
          .from('companies')
          .select('points')
          .eq('id', request.company_id)
          .single()
        
        const newPoints = (companyData?.points || 0) + (request.points || request.amount)
        
        await supabase
          .from('companies')
          .update({ points: newPoints })
          .eq('id', request.company_id)
        
        processedCount++
        console.log(`[Processed] Request ${request.id} - Points credited: ${request.points || request.amount}`)
        
      } catch (error) {
        console.error(`[Error] Failed to process request ${request.id}:`, error)
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} deposits`,
      processedCount
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('[Error]', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

