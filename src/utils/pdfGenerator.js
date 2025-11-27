import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * 견적서 PDF 생성 및 다운로드
 * @param {Object} campaign - 캠페인 정보
 * @param {Object} company - 회사 정보
 * @param {Object} pricing - 가격 정보 { packagePrice, creatorCount, subtotal, vat, total }
 * @param {string} campaignType - 캠페인 타입 (기획형/올영/4주/일본/미국)
 * @returns {Promise<Blob>} PDF Blob
 */
export const generateInvoicePDF = async (campaign, company, pricing, campaignType) => {
  // PDF 문서 생성
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // 한글 폰트 지원을 위한 설정
  pdf.setFont('helvetica')
  
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // 제목
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  pdf.text('견 적 서', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  // 날짜
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  const today = new Date().toLocaleDateString('ko-KR')
  pdf.text(`발행일: ${today}`, pageWidth - margin, yPosition, { align: 'right' })
  yPosition += 10

  // 구분선
  pdf.setLineWidth(0.5)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // 회사 정보
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('공급받는자 정보', margin, yPosition)
  yPosition += 7

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`회사명: ${company.company_name || '-'}`, margin, yPosition)
  yPosition += 6
  pdf.text(`대표자: ${company.ceo_name || '-'}`, margin, yPosition)
  yPosition += 6
  pdf.text(`사업자번호: ${company.business_registration_number || '-'}`, margin, yPosition)
  yPosition += 6
  pdf.text(`주소: ${company.company_address || '-'}`, margin, yPosition)
  yPosition += 6
  pdf.text(`연락처: ${company.phone || '-'}`, margin, yPosition)
  yPosition += 6
  pdf.text(`이메일: ${company.email || '-'}`, margin, yPosition)
  yPosition += 10

  // 구분선
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // 캠페인 정보
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('캠페인 정보', margin, yPosition)
  yPosition += 7

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`캠페인명: ${campaign.title || '-'}`, margin, yPosition)
  yPosition += 6
  pdf.text(`캠페인 타입: ${campaignType}`, margin, yPosition)
  yPosition += 6
  
  // 캠페인 타입별 추가 정보
  if (campaign.campaign_type === 'oliveyoung') {
    pdf.text(`콘텐츠 타입: ${campaign.content_type === 'store_visit' ? '매장방문' : '제품배송'}`, margin, yPosition)
    yPosition += 6
  } else if (campaign.campaign_type === '4week') {
    pdf.text(`신청 마감: ${campaign.application_deadline ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR') : '-'}`, margin, yPosition)
    yPosition += 6
  }
  
  pdf.text(`모집 인원: ${pricing.creatorCount || campaign.total_slots || '-'}명`, margin, yPosition)
  yPosition += 10

  // 구분선
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // 견적 내역 테이블
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('견적 내역', margin, yPosition)
  yPosition += 10

  // 테이블 헤더
  const tableStartY = yPosition
  const colWidths = [80, 40, 50]
  const tableWidth = colWidths.reduce((a, b) => a + b, 0)
  const tableStartX = (pageWidth - tableWidth) / 2

  pdf.setFillColor(240, 240, 240)
  pdf.rect(tableStartX, yPosition, tableWidth, 10, 'F')
  
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('항목', tableStartX + 5, yPosition + 7)
  pdf.text('단가', tableStartX + colWidths[0] + 5, yPosition + 7)
  pdf.text('금액', tableStartX + colWidths[0] + colWidths[1] + 5, yPosition + 7)
  yPosition += 10

  // 테이블 내용
  pdf.setFont('helvetica', 'normal')
  
  // 패키지 단가 × 인원
  pdf.text(`${campaignType} 패키지 × ${pricing.creatorCount}명`, tableStartX + 5, yPosition + 7)
  pdf.text(`${pricing.packagePrice.toLocaleString()}원`, tableStartX + colWidths[0] + 5, yPosition + 7)
  pdf.text(`${pricing.subtotal.toLocaleString()}원`, tableStartX + colWidths[0] + colWidths[1] + 5, yPosition + 7)
  yPosition += 10

  // 구분선
  pdf.line(tableStartX, yPosition, tableStartX + tableWidth, yPosition)
  yPosition += 5

  // 소계
  pdf.text('소계', tableStartX + 5, yPosition + 7)
  pdf.text(`${pricing.subtotal.toLocaleString()}원`, tableStartX + colWidths[0] + colWidths[1] + 5, yPosition + 7)
  yPosition += 10

  // 부가세
  pdf.text('부가세 (10%)', tableStartX + 5, yPosition + 7)
  pdf.text(`${pricing.vat.toLocaleString()}원`, tableStartX + colWidths[0] + colWidths[1] + 5, yPosition + 7)
  yPosition += 10

  // 구분선
  pdf.setLineWidth(1)
  pdf.line(tableStartX, yPosition, tableStartX + tableWidth, yPosition)
  yPosition += 5

  // 총 금액
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('총 금액', tableStartX + 5, yPosition + 7)
  pdf.setTextColor(0, 102, 204)
  pdf.text(`${pricing.total.toLocaleString()}원`, tableStartX + colWidths[0] + colWidths[1] + 5, yPosition + 7)
  pdf.setTextColor(0, 0, 0)
  yPosition += 15

  // 구분선
  pdf.setLineWidth(0.5)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // 입금 계좌 정보
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('입금 계좌 정보', margin, yPosition)
  yPosition += 7

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text('은행: IBK기업은행', margin, yPosition)
  yPosition += 6
  pdf.text('계좌번호: 047-122753-04-011', margin, yPosition)
  yPosition += 6
  pdf.text('예금주: 주식회사 하우파파', margin, yPosition)
  yPosition += 10

  // 안내 사항
  pdf.setFontSize(9)
  pdf.setTextColor(100, 100, 100)
  pdf.text('* 입금 확인 후 캠페인이 시작됩니다.', margin, yPosition)
  yPosition += 5
  pdf.text('* 세금계산서가 필요하신 경우 별도로 요청해주세요.', margin, yPosition)
  yPosition += 5
  pdf.text('* 문의: 1833-6025', margin, yPosition)
  yPosition += 15

  // 하단 회사 정보
  pdf.setFontSize(8)
  pdf.setTextColor(150, 150, 150)
  const footerY = pageHeight - 20
  pdf.text('주식회사 하우파파 | 사업자등록번호: 123-45-67890', pageWidth / 2, footerY, { align: 'center' })
  pdf.text('서울특별시 강남구 | Tel: 1833-6025 | Email: contact@cnec.com', pageWidth / 2, footerY + 4, { align: 'center' })

  return pdf
}

/**
 * PDF를 Blob으로 반환
 */
export const getPDFBlob = (pdf) => {
  return pdf.output('blob')
}

/**
 * PDF 다운로드
 */
export const downloadPDF = (pdf, filename) => {
  pdf.save(filename)
}

/**
 * PDF를 Base64로 변환 (이메일 첨부용)
 */
export const getPDFBase64 = (pdf) => {
  return pdf.output('datauristring').split(',')[1]
}
