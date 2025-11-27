const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  try {
    const { campaign, company, pricing, campaignType, recipientEmail } = JSON.parse(event.body);

    if (!campaign || !company || !pricing || !campaignType || !recipientEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '필수 정보가 누락되었습니다.'
        })
      };
    }

    // 환경변수에서 Gmail 설정 가져오기
    const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const senderName = process.env.GMAIL_SENDER_NAME || 'cnec';

    if (!gmailAppPassword) {
      console.error('[send-invoice-email] GMAIL_APP_PASSWORD 환경변수가 설정되지 않았습니다.');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Gmail 설정이 완료되지 않았습니다.'
        })
      };
    }

    // Gmail SMTP 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailAppPassword.replace(/\s/g, '')
      }
    });

    const today = new Date().toLocaleDateString('ko-KR');
    
    // HTML 견적서 생성
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 32px; margin: 0; color: #333; }
          .date { text-align: right; color: #666; margin-bottom: 20px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
          .info-row { display: flex; padding: 8px 0; }
          .info-label { width: 150px; color: #666; }
          .info-value { flex: 1; color: #333; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f0f0f0; padding: 12px; text-align: left; border: 1px solid #ddd; }
          td { padding: 12px; border: 1px solid #ddd; }
          .text-right { text-align: right; }
          .total-row { background-color: #f9f9f9; font-weight: bold; font-size: 16px; }
          .total-amount { color: #0066cc; font-size: 20px; }
          .bank-info { background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .bank-info h3 { margin-top: 0; color: #1976d2; }
          .notes { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>견 적 서</h1>
          </div>
          
          <div class="date">발행일: ${today}</div>
          
          <div class="section">
            <div class="section-title">공급받는자 정보</div>
            <div class="info-row">
              <div class="info-label">회사명</div>
              <div class="info-value">${company.company_name || '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">대표자</div>
              <div class="info-value">${company.ceo_name || '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">사업자번호</div>
              <div class="info-value">${company.business_registration_number || '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">주소</div>
              <div class="info-value">${company.company_address || '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">연락처</div>
              <div class="info-value">${company.phone || '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">이메일</div>
              <div class="info-value">${company.email || '-'}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">캠페인 정보</div>
            <div class="info-row">
              <div class="info-label">캠페인명</div>
              <div class="info-value">${campaign.title || '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">캠페인 타입</div>
              <div class="info-value">${campaignType}</div>
            </div>
            ${campaign.campaign_type === 'oliveyoung' ? `
            <div class="info-row">
              <div class="info-label">콘텐츠 타입</div>
              <div class="info-value">${campaign.content_type === 'store_visit' ? '매장방문' : '제품배송'}</div>
            </div>
            ` : ''}
            ${campaign.campaign_type === '4week' && campaign.application_deadline ? `
            <div class="info-row">
              <div class="info-label">신청 마감</div>
              <div class="info-value">${new Date(campaign.application_deadline).toLocaleDateString('ko-KR')}</div>
            </div>
            ` : ''}
            <div class="info-row">
              <div class="info-label">모집 인원</div>
              <div class="info-value">${pricing.creatorCount}명</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">견적 내역</div>
            <table>
              <thead>
                <tr>
                  <th>항목</th>
                  <th class="text-right">단가</th>
                  <th class="text-right">금액</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${campaignType} 패키지 × ${pricing.creatorCount}명</td>
                  <td class="text-right">${pricing.packagePrice.toLocaleString()}원</td>
                  <td class="text-right">${pricing.subtotal.toLocaleString()}원</td>
                </tr>
                <tr>
                  <td colspan="2">소계</td>
                  <td class="text-right">${pricing.subtotal.toLocaleString()}원</td>
                </tr>
                <tr>
                  <td colspan="2">부가세 (10%)</td>
                  <td class="text-right">${pricing.vat.toLocaleString()}원</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2">총 금액</td>
                  <td class="text-right total-amount">${pricing.total.toLocaleString()}원</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="bank-info">
            <h3>입금 계좌 정보</h3>
            <div class="info-row">
              <div class="info-label">은행</div>
              <div class="info-value">IBK기업은행</div>
            </div>
            <div class="info-row">
              <div class="info-label">계좌번호</div>
              <div class="info-value">047-122753-04-011</div>
            </div>
            <div class="info-row">
              <div class="info-label">예금주</div>
              <div class="info-value">주식회사 하우파파</div>
            </div>
          </div>
          
          <div class="notes">
            <p>* 입금 확인 후 캠페인이 시작됩니다.</p>
            <p>* 세금계산서가 필요하신 경우 별도로 요청해주세요.</p>
            <p>* 문의: 1833-6025</p>
          </div>
          
          <div class="footer">
            <p>주식회사 하우파파 | 사업자등록번호: 123-45-67890</p>
            <p>서울특별시 강남구 | Tel: 1833-6025 | Email: contact@cnec.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 이메일 발송
    const mailOptions = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: recipientEmail,
      subject: `[CNEC] ${campaignType} 캠페인 견적서 - ${campaign.title}`,
      html: invoiceHTML
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('[send-invoice-email] 견적서 이메일 발송 성공:', info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: info.messageId,
        to: recipientEmail
      })
    };

  } catch (error) {
    console.error('[send-invoice-email] 견적서 이메일 발송 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
