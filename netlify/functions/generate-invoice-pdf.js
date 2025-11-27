const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const nodemailer = require('nodemailer');

// 견적서 HTML 템플릿 생성
function generateInvoiceHTML(data) {
  const { campaign, company, packagePrice, subtotal, vat, total } = data;
  const today = new Date().toLocaleDateString('ko-KR');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { 
      font-family: 'Malgun Gothic', sans-serif; 
      margin: 0; 
      padding: 40px;
      font-size: 12pt;
    }
    .header { 
      text-align: center; 
      margin-bottom: 40px;
      border-bottom: 3px solid #333;
      padding-bottom: 20px;
    }
    .header h1 { 
      font-size: 28pt; 
      margin: 0 0 10px 0;
      color: #333;
    }
    .header .date { 
      font-size: 11pt; 
      color: #666;
    }
    .section { 
      margin: 30px 0;
    }
    .section-title { 
      font-size: 14pt; 
      font-weight: bold; 
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f0f0f0;
      border-left: 4px solid #333;
    }
    .info-table { 
      width: 100%; 
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .info-table td { 
      padding: 8px 12px;
      border: 1px solid #ddd;
    }
    .info-table td:first-child { 
      background-color: #f8f8f8; 
      font-weight: bold;
      width: 150px;
    }
    .price-table { 
      width: 100%; 
      border-collapse: collapse;
      margin: 20px 0;
    }
    .price-table th { 
      background-color: #333; 
      color: white; 
      padding: 12px;
      text-align: center;
      font-size: 11pt;
    }
    .price-table td { 
      padding: 10px;
      border: 1px solid #ddd;
      text-align: center;
    }
    .price-table .amount { 
      text-align: right;
      font-weight: bold;
    }
    .total-row { 
      background-color: #f8f8f8;
      font-weight: bold;
      font-size: 13pt;
    }
    .bank-info { 
      background-color: #e3f2fd;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .bank-info h3 { 
      margin: 0 0 10px 0;
      color: #1976d2;
    }
    .footer { 
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 10pt;
      color: #666;
      text-align: center;
    }
    .company-info { 
      text-align: right;
      margin-top: 40px;
      padding: 20px;
      border: 2px solid #333;
    }
    .company-info h3 { 
      margin: 0 0 15px 0;
      font-size: 16pt;
    }
    .company-info p { 
      margin: 5px 0;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>견 적 서</h1>
    <p class="date">발행일: ${today}</p>
  </div>

  <div class="section">
    <div class="section-title">수신자 정보</div>
    <table class="info-table">
      <tr>
        <td>회사명</td>
        <td>${company.company_name || '-'}</td>
      </tr>
      <tr>
        <td>대표자</td>
        <td>${company.representative || '-'}</td>
      </tr>
      <tr>
        <td>사업자등록번호</td>
        <td>${company.business_number || '-'}</td>
      </tr>
      <tr>
        <td>주소</td>
        <td>${company.address || '-'}</td>
      </tr>
      <tr>
        <td>연락처</td>
        <td>${company.phone || '-'}</td>
      </tr>
      <tr>
        <td>이메일</td>
        <td>${company.email || '-'}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">캠페인 정보</div>
    <table class="info-table">
      <tr>
        <td>캠페인명</td>
        <td>${campaign.title || '-'}</td>
      </tr>
      <tr>
        <td>캠페인 타입</td>
        <td>${campaign.campaign_type || '-'}</td>
      </tr>
      <tr>
        <td>모집 인원</td>
        <td>${campaign.total_slots || 0}명</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">견적 내역</div>
    <table class="price-table">
      <thead>
        <tr>
          <th>항목</th>
          <th>단가</th>
          <th>수량</th>
          <th>금액</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>패키지 단가</td>
          <td class="amount">${packagePrice.toLocaleString()}원</td>
          <td>${campaign.total_slots || 0}명</td>
          <td class="amount">${subtotal.toLocaleString()}원</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right; font-weight: bold;">소계</td>
          <td class="amount">${subtotal.toLocaleString()}원</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right; font-weight: bold;">부가세 (10%)</td>
          <td class="amount">${vat.toLocaleString()}원</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">총 결제 금액</td>
          <td class="amount" style="color: #d32f2f; font-size: 14pt;">${total.toLocaleString()}원</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="bank-info">
    <h3>입금 계좌</h3>
    <p><strong>은행:</strong> IBK기업은행</p>
    <p><strong>계좌번호:</strong> 047-122753-04-011</p>
    <p><strong>예금주:</strong> 주식회사 하우파파</p>
  </div>

  <div class="section">
    <div class="section-title">안내 사항</div>
    <ul style="line-height: 1.8;">
      <li>입금 확인 후 캠페인이 시작됩니다.</li>
      <li>문의 사항은 1833-6025로 연락 주시기 바랍니다.</li>
      <li>본 견적서는 발행일로부터 7일간 유효합니다.</li>
    </ul>
  </div>

  <div class="company-info">
    <h3>주식회사 하우파파</h3>
    <p>대표자: 이지훈</p>
    <p>사업자등록번호: 896-86-02569</p>
    <p>주소: 서울특별시 강남구 테헤란로 152, 12층 1205호</p>
    <p>전화: 1833-6025</p>
    <p>이메일: mkt_biz@cnec.co.kr</p>
  </div>

  <div class="footer">
    <p>본 견적서는 전자문서로 발행되었습니다.</p>
    <p>© 2025 CNEC. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

exports.handler = async (event) => {
  let browser = null;
  
  try {
    const { campaign, company, packagePrice, subtotal, vat, total } = JSON.parse(event.body);

    console.log('[generate-invoice-pdf] PDF 생성 시작');

    // Puppeteer 브라우저 실행
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // HTML 생성 및 로드
    const html = generateInvoiceHTML({ campaign, company, packagePrice, subtotal, vat, total });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // PDF 생성
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();
    browser = null;

    console.log('[generate-invoice-pdf] PDF 생성 완료');

    // Gmail 설정
    const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const cleanPassword = gmailAppPassword.trim().replace(/\s/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: cleanPassword
      }
    });

    // 파일명 생성
    const fileName = `견적서_${campaign.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    // 이메일 발송
    const mailOptions = {
      from: `"CNEC" <${gmailEmail}>`,
      to: company.email,
      subject: `[CNEC] ${campaign.campaign_type} 캠페인 견적서 - ${campaign.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">캠페인 견적서를 보내드립니다</h2>
          <p>안녕하세요, <strong>${company.company_name}</strong> 담당자님</p>
          <p><strong>${campaign.title}</strong> 캠페인의 견적서를 첨부 파일로 보내드립니다.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">견적 요약</h3>
            <p><strong>캠페인:</strong> ${campaign.title}</p>
            <p><strong>타입:</strong> ${campaign.campaign_type}</p>
            <p><strong>모집 인원:</strong> ${campaign.total_slots}명</p>
            <p style="font-size: 18px; color: #d32f2f;"><strong>총 금액:</strong> ${total.toLocaleString()}원</p>
          </div>

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1976d2;">입금 계좌</h4>
            <p style="margin: 5px 0;"><strong>은행:</strong> IBK기업은행</p>
            <p style="margin: 5px 0;"><strong>계좌번호:</strong> 047-122753-04-011</p>
            <p style="margin: 5px 0;"><strong>예금주:</strong> 주식회사 하우파파</p>
          </div>

          <p>입금 확인 후 캠페인이 시작됩니다.</p>
          <p>문의사항은 <strong>1833-6025</strong>로 연락 주시기 바랍니다.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            본 메일은 발신 전용입니다. 문의사항은 위 연락처로 부탁드립니다.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    console.log('[generate-invoice-pdf] 이메일 발송 완료:', company.email);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'PDF 견적서가 이메일로 발송되었습니다.',
        to: company.email
      })
    };

  } catch (error) {
    console.error('[generate-invoice-pdf] 오류:', error);
    
    if (browser) {
      await browser.close();
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
