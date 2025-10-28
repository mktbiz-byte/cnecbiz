const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Popbill 설정
const LinkID = process.env.POPBILL_LINK_ID;
const SecretKey = process.env.POPBILL_SECRET_KEY;
const CorpNum = process.env.POPBILL_CORP_NUM;
const UserID = process.env.POPBILL_USER_ID;

// Popbill 세금계산서 서비스 초기화
const taxinvoiceService = popbill.TaxinvoiceService(LinkID, SecretKey);

exports.handler = async (event) => {
  try {
    const { chargeRequestId } = JSON.parse(event.body);

    console.log('Issuing tax invoice for:', chargeRequestId);

    // 1. 충전 요청 정보 조회
    const { data: chargeRequest, error: fetchError } = await supabase
      .from('points_charge_requests')
      .select('*, companies(*)')
      .eq('id', chargeRequestId)
      .single();

    if (fetchError || !chargeRequest) {
      throw new Error('충전 요청을 찾을 수 없습니다');
    }

    // 세금계산서 정보가 없으면 발행하지 않음
    if (!chargeRequest.tax_invoice_info) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '세금계산서 정보가 없어 발행하지 않습니다'
        })
      };
    }

    const taxInfo = chargeRequest.tax_invoice_info;

    // 2. 세금계산서 발행
    const invoice = {
      // 작성일자
      writeDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      
      // 과세형태 (1:과세, 2:영세, 3:면세)
      taxType: '1',
      
      // 영수/청구 (1:영수, 2:청구)
      purposeType: '1',
      
      // 공급가액
      supplyCostTotal: Math.floor(chargeRequest.amount / 1.1).toString(),
      
      // 세액
      taxTotal: Math.floor(chargeRequest.amount - (chargeRequest.amount / 1.1)).toString(),
      
      // 합계금액
      totalAmount: chargeRequest.amount.toString(),
      
      // 공급자 정보 (CNEC)
      invoicerCorpNum: CorpNum,
      invoicerCorpName: '주식회사 하우피파',
      invoicerCEOName: '김진수',
      invoicerAddr: '서울특별시 강남구',
      invoicerBizClass: '서비스업',
      invoicerBizType: '정보통신업',
      invoicerContactName: '담당자',
      invoicerEmail: 'info@cnec.co.kr',
      invoicerTEL: '1833-6025',
      
      // 공급받는자 정보
      invoiceeCorpNum: taxInfo.businessNumber.replace(/-/g, ''),
      invoiceeCorpName: taxInfo.companyName,
      invoiceeCEOName: taxInfo.ceoName,
      invoiceeAddr: taxInfo.address || '',
      invoiceeBizClass: taxInfo.bizClass || '',
      invoiceeBizType: taxInfo.bizType || '',
      invoiceeContactName: taxInfo.contactName || taxInfo.ceoName,
      invoiceeEmail: taxInfo.email,
      invoiceeTEL: chargeRequest.companies.phone || '',
      
      // 상세 품목
      detailList: [
        {
          serialNum: 1,
          purchaseDT: new Date().toISOString().split('T')[0].replace(/-/g, ''),
          itemName: '포인트 충전',
          spec: `${chargeRequest.quantity}건`,
          qty: chargeRequest.quantity.toString(),
          unitCost: Math.floor(chargeRequest.package_amount / 1.1).toString(),
          supplyCost: Math.floor(chargeRequest.amount / 1.1).toString(),
          tax: Math.floor(chargeRequest.amount - (chargeRequest.amount / 1.1)).toString(),
          remark: ''
        }
      ]
    };

    // 3. Popbill API로 세금계산서 발행
    const result = await issueTaxInvoice(invoice);

    // 4. 발행 결과 저장
    await supabase
      .from('points_charge_requests')
      .update({
        tax_invoice_issued: true,
        tax_invoice_nts_confirm_num: result.ntsconfirmNum,
        updated_at: new Date().toISOString()
      })
      .eq('id', chargeRequestId);

    console.log('Tax invoice issued:', result);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result
      })
    };

  } catch (error) {
    console.error('Tax invoice error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

// 세금계산서 발행
async function issueTaxInvoice(invoice) {
  return new Promise((resolve, reject) => {
    // 임시 문서번호 생성 (YYYYMMDD-HHMMSS)
    const mgtKey = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    
    taxinvoiceService.register(
      CorpNum,
      invoice,
      mgtKey,
      UserID,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          // 즉시 발행
          taxinvoiceService.issue(
            CorpNum,
            mgtKey,
            '',
            UserID,
            (issueError, issueResult) => {
              if (issueError) {
                reject(issueError);
              } else {
                resolve({
                  mgtKey,
                  ntsconfirmNum: issueResult.ntsconfirmNum
                });
              }
            }
          );
        }
      }
    );
  });
}

