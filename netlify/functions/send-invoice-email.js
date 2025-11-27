const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer');

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

    // PDF 생성
    const pdfBuffer = await generateInvoicePDF(campaign, company, pricing, campaignType);

    // Gmail SMTP 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailAppPassword.replace(/\s/g, '')
      }
    });

    // 이메일 발송
    const mailOptions = {
      from: `"${senderName}" <${gmailEmail}>`,
      to: recipientEmail,
      subject: `[CNEC] ${campaignType} 캠페인 견적서 - ${campaign.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">[CNEC] 캠페인 견적서</h2>
          <p><strong>${company.company_name || '고객사'}</strong>님, 요청하신 캠페인 견적서를 보내드립니다.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>캠페인명:</strong> ${campaign.title}</p>
            <p style="margin: 10px 0;"><strong>캠페인 타입:</strong> ${campaignType}</p>
            <p style="margin: 10px 0;"><strong>총 금액:</strong> <span style="font-size: 18px; color: #4CAF50;">${pricing.total.toLocaleString()}원</span></p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">입금 계좌 정보</h3>
            <p style="margin: 5px 0;">은행: IBK기업은행</p>
            <p style="margin: 5px 0;">계좌번호: 047-122753-04-011</p>
            <p style="margin: 5px 0;">예금주: 주식회사 하우파파</p>
          </div>
          
          <p style="color: #666;">첨부된 견적서를 확인해주세요.</p>
          <p style="color: #666;">입금 확인 후 캠페인이 시작됩니다.</p>
          <p style="color: #666;">문의: <strong>1833-6025</strong></p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `견적서_${campaign.title}_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
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

// PDF 생성 함수
async function generateInvoicePDF(campaign, company, pricing, campaignType) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;

      // 제목
      doc.fontSize(24).font('Helvetica-Bold').text('견 적 서', margin, margin, {
        align: 'center'
      });
      doc.moveDown(1);

      // 날짜
      doc.fontSize(10).font('Helvetica').text(`발행일: ${new Date().toLocaleDateString('ko-KR')}`, {
        align: 'right'
      });
      doc.moveDown(1);

      // 구분선
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(1);

      // 회사 정보
      doc.fontSize(12).font('Helvetica-Bold').text('공급받는자 정보');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`회사명: ${company.company_name || '-'}`);
      doc.text(`대표자: ${company.ceo_name || '-'}`);
      doc.text(`사업자번호: ${company.business_registration_number || '-'}`);
      doc.text(`주소: ${company.company_address || '-'}`);
      doc.text(`연락처: ${company.phone || '-'}`);
      doc.text(`이메일: ${company.email || '-'}`);
      doc.moveDown(1);

      // 구분선
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(1);

      // 캠페인 정보
      doc.fontSize(12).font('Helvetica-Bold').text('캠페인 정보');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`캠페인명: ${campaign.title || '-'}`);
      doc.text(`캠페인 타입: ${campaignType}`);
      
      if (campaign.campaign_type === 'oliveyoung') {
        doc.text(`콘텐츠 타입: ${campaign.content_type === 'store_visit' ? '매장방문' : '제품배송'}`);
      } else if (campaign.campaign_type === '4week') {
        doc.text(`신청 마감: ${campaign.application_deadline ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR') : '-'}`);
      }
      
      doc.text(`모집 인원: ${pricing.creatorCount || campaign.total_slots || '-'}명`);
      doc.moveDown(1);

      // 구분선
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(1);

      // 견적 내역
      doc.fontSize(12).font('Helvetica-Bold').text('견적 내역');
      doc.moveDown(1);

      // 테이블
      const tableTop = doc.y;
      const col1X = margin + 20;
      const col2X = pageWidth - margin - 150;
      const col3X = pageWidth - margin - 80;

      // 테이블 헤더
      doc.rect(margin, tableTop, pageWidth - 2 * margin, 25).fill('#f0f0f0');
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
      doc.text('항목', col1X, tableTop + 8);
      doc.text('단가', col2X, tableTop + 8);
      doc.text('금액', col3X, tableTop + 8);

      let currentY = tableTop + 25;

      // 패키지 항목
      doc.font('Helvetica').fontSize(10);
      doc.text(`${campaignType} 패키지 × ${pricing.creatorCount}명`, col1X, currentY + 8);
      doc.text(`${pricing.packagePrice.toLocaleString()}원`, col2X, currentY + 8);
      doc.text(`${pricing.subtotal.toLocaleString()}원`, col3X, currentY + 8);
      currentY += 25;

      // 구분선
      doc.moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
      currentY += 5;

      // 소계
      doc.text('소계', col1X, currentY + 8);
      doc.text(`${pricing.subtotal.toLocaleString()}원`, col3X, currentY + 8);
      currentY += 20;

      // 부가세
      doc.text('부가세 (10%)', col1X, currentY + 8);
      doc.text(`${pricing.vat.toLocaleString()}원`, col3X, currentY + 8);
      currentY += 20;

      // 굵은 구분선
      doc.lineWidth(2).moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
      doc.lineWidth(1);
      currentY += 5;

      // 총 금액
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('총 금액', col1X, currentY + 8);
      doc.fillColor('#0066cc').text(`${pricing.total.toLocaleString()}원`, col3X, currentY + 8);
      doc.fillColor('#000000');
      currentY += 30;

      // 구분선
      doc.moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
      currentY += 15;

      // 입금 계좌 정보
      doc.fontSize(12).font('Helvetica-Bold').text('입금 계좌 정보', margin, currentY);
      currentY += 20;
      doc.fontSize(10).font('Helvetica');
      doc.text('은행: IBK기업은행', margin, currentY);
      currentY += 15;
      doc.text('계좌번호: 047-122753-04-011', margin, currentY);
      currentY += 15;
      doc.text('예금주: 주식회사 하우파파', margin, currentY);
      currentY += 25;

      // 안내 사항
      doc.fontSize(9).fillColor('#666666');
      doc.text('* 입금 확인 후 캠페인이 시작됩니다.', margin, currentY);
      currentY += 12;
      doc.text('* 세금계산서가 필요하신 경우 별도로 요청해주세요.', margin, currentY);
      currentY += 12;
      doc.text('* 문의: 1833-6025', margin, currentY);

      // 하단 회사 정보
      const footerY = doc.page.height - 50;
      doc.fontSize(8).fillColor('#999999');
      doc.text('주식회사 하우파파 | 사업자등록번호: 123-45-67890', margin, footerY, {
        align: 'center',
        width: pageWidth - 2 * margin
      });
      doc.text('서울특별시 강남구 | Tel: 1833-6025 | Email: contact@cnec.com', margin, footerY + 10, {
        align: 'center',
        width: pageWidth - 2 * margin
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
