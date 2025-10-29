const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 계약서 서명 완료 처리
 * 
 * @param {string} contractId - 계약서 ID
 * @param {string} signatureType - 'stamp', 'image', 'draw'
 * @param {string} signatureData - 서명 데이터 (base64 또는 URL)
 * @param {string} ipAddress - 서명자 IP
 * @param {string} userAgent - 서명자 User Agent
 */
exports.handler = async (event) => {
  try {
    const { 
      contractId, 
      signatureType, 
      signatureData,
      ipAddress,
      userAgent
    } = JSON.parse(event.body);

    if (!contractId || !signatureType || !signatureData) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '필수 정보가 누락되었습니다.'
        })
      };
    }

    // 계약서 정보 가져오기
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      console.error('[sign-contract] Contract not found:', contractError);
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: '계약서를 찾을 수 없습니다.'
        })
      };
    }

    // 계약서 상태 확인
    if (contract.status !== 'sent') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '서명할 수 없는 계약서입니다.'
        })
      };
    }

    // 만료일 확인
    if (new Date(contract.expires_at) < new Date()) {
      await supabase
        .from('contracts')
        .update({ status: 'expired' })
        .eq('id', contractId);

      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '계약서가 만료되었습니다.'
        })
      };
    }

    // 서명 이미지 저장 (Supabase Storage)
    let signatureUrl = signatureData;

    if (signatureType === 'draw' || signatureType === 'image') {
      // base64 데이터를 Buffer로 변환
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const fileName = `${contractId}_${Date.now()}.png`;
      const filePath = `signatures/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('[sign-contract] Upload error:', uploadError);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: '서명 이미지 업로드에 실패했습니다.'
          })
        };
      }

      // Public URL 생성
      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(filePath);

      signatureUrl = urlData.publicUrl;
    }

    // 계약서 업데이트 (서명 완료)
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        creator_signature_url: signatureUrl,
        signature_type: signatureType,
        signed_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('[sign-contract] Update error:', updateError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: '계약서 업데이트에 실패했습니다.'
        })
      };
    }

    // 서명 로그 저장
    await supabase
      .from('contract_signature_logs')
      .insert({
        contract_id: contractId,
        signer_type: 'creator',
        signer_id: contract.creator_id,
        signature_url: signatureUrl,
        signature_type: signatureType,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    // TODO: 서명 완료된 계약서 PDF 생성 및 암호화
    // TODO: 기업에게 서명 완료 이메일 발송

    console.log('[sign-contract] Contract signed successfully:', {
      contractId,
      signatureType
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '계약서 서명이 완료되었습니다.',
        contract: {
          id: contractId,
          signedAt: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('[sign-contract] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

