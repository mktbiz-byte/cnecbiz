const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 전자계약서 생성 및 발송
 * 
 * @param {string} contractType - 'campaign' or 'portrait_rights'
 * @param {string} campaignId - 캠페인 ID
 * @param {string} creatorId - 크리에이터 ID
 * @param {string} companyId - 기업 ID
 * @param {string} title - 계약서 제목
 * @param {string} content - 계약서 내용 (HTML)
 * @param {string} companySignatureUrl - 회사 도장 이미지 URL
 */
exports.handler = async (event) => {
  try {
    const { 
      contractType, 
      campaignId, 
      creatorId, 
      companyId, 
      title, 
      content,
      companySignatureUrl 
    } = JSON.parse(event.body);

    if (!contractType || !creatorId || !companyId || !title || !content) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '필수 정보가 누락되었습니다.'
        })
      };
    }

    // 암호화 키 생성 (계약서 암호화용)
    const encryptionKey = crypto.randomBytes(32).toString('hex');

    // 만료일 설정 (발송일로부터 30일)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 계약서 생성
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        contract_type: contractType,
        campaign_id: campaignId,
        creator_id: creatorId,
        company_id: companyId,
        title: title,
        content: content,
        status: 'pending',
        company_signature_url: companySignatureUrl,
        encryption_key: encryptionKey,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (contractError) {
      console.error('[create-contract] Error creating contract:', contractError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: '계약서 생성에 실패했습니다.'
        })
      };
    }

    // 크리에이터 정보 가져오기
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('email, name')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      console.error('[create-contract] Creator not found:', creatorError);
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: '크리에이터를 찾을 수 없습니다.'
        })
      };
    }

    // 서명 페이지 URL 생성
    const signUrl = `${process.env.URL}/sign-contract/${contract.id}`;

    // 이메일 발송
    const emailResponse = await fetch(`${process.env.URL}/.netlify/functions/send-template-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey: contractType === 'campaign' ? 'contract_sign_request' : 'portrait_rights_sign_request',
        to: creator.email,
        variables: {
          creator_name: creator.name || creator.email,
          contract_title: title,
          sign_url: signUrl,
          expires_at: expiresAt.toLocaleDateString('ko-KR')
        }
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResult.success) {
      console.error('[create-contract] Email send failed:', emailResult.error);
      // 이메일 실패해도 계약서는 생성됨
    }

    // 계약서 상태 업데이트 (발송됨)
    await supabase
      .from('contracts')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', contract.id);

    console.log('[create-contract] Contract created and sent:', {
      contractId: contract.id,
      type: contractType,
      creatorEmail: creator.email
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        contract: {
          id: contract.id,
          signUrl: signUrl
        }
      })
    };

  } catch (error) {
    console.error('[create-contract] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

