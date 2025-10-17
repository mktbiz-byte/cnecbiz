import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

// Package information
const PACKAGES = {
  200000: {
    name: '기본형 패키지',
    price: 200000,
    features: [
      '일반 퀄리티 지원자',
      '영상 수정 불가'
    ]
  },
  300000: {
    name: '스탠다드 패키지',
    price: 300000,
    features: [
      '향상된 퀄리티 지원자',
      '영상 수정 1회 가능'
    ]
  },
  400000: {
    name: '프리미엄 패키지',
    price: 400000,
    features: [
      '최고 퀄리티 지원자',
      '영상 수정 1회 가능',
      '우선 지원'
    ]
  },
  600000: {
    name: '4주 연속 패키지',
    price: 600000,
    features: [
      '매주 1건씩 총 4주간 진행',
      '프리미엄 퀄리티 지원자',
      '영상 수정 1회 가능',
      '전담 매니저 배정'
    ]
  }
}

// Region names
const REGION_NAMES = {
  japan: '일본',
  jp: '일본',
  us: '미국',
  usa: '미국',
  taiwan: '대만',
  tw: '대만'
}

// Generate Quotation PDF
export const generateQuotationPDF = (campaignData, companyData) => {
  const doc = new jsPDF()
  
  // Set font (Korean support)
  doc.setFont('helvetica')
  
  // Title
  doc.setFontSize(20)
  doc.text('견적서', 105, 20, { align: 'center' })
  
  // Date
  doc.setFontSize(10)
  const today = format(new Date(), 'yyyy년 MM월 dd일')
  doc.text(today, 105, 30, { align: 'center' })
  
  // Company Information
  doc.setFontSize(12)
  doc.text('수신: ' + (companyData.company_name || ''), 20, 45)
  doc.text('담당자: ' + (companyData.contact_name || ''), 20, 52)
  
  // Campaign Information
  doc.setFontSize(11)
  doc.text('캠페인 정보', 20, 65)
  doc.setFontSize(10)
  doc.text('캠페인명: ' + (campaignData.title || ''), 20, 72)
  doc.text('브랜드명: ' + (campaignData.brand_name || ''), 20, 79)
  doc.text('제품명: ' + (campaignData.product_name || ''), 20, 86)
  
  // Selected Regions
  const regions = campaignData.regions || []
  const regionText = regions.map(r => REGION_NAMES[r] || r).join(', ')
  doc.text('진행 지역: ' + regionText, 20, 93)
  
  // Package Information
  const packageInfo = PACKAGES[campaignData.package_type] || {}
  doc.text('선택 패키지: ' + packageInfo.name, 20, 100)
  
  // Table for pricing
  const tableData = []
  
  // Add package price
  tableData.push([
    packageInfo.name,
    '1',
    packageInfo.price.toLocaleString() + '원',
    packageInfo.price.toLocaleString() + '원'
  ])
  
  // If multiple regions, add region multiplier
  if (regions.length > 1) {
    tableData.push([
      '추가 지역 (' + (regions.length - 1) + '개)',
      regions.length - 1,
      packageInfo.price.toLocaleString() + '원',
      (packageInfo.price * (regions.length - 1)).toLocaleString() + '원'
    ])
  }
  
  const totalAmount = packageInfo.price * regions.length
  
  autoTable(doc, {
    startY: 110,
    head: [['항목', '수량', '단가', '금액']],
    body: tableData,
    foot: [['', '', '합계', totalAmount.toLocaleString() + '원']],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    footStyles: { fillColor: [236, 240, 241], textColor: [0, 0, 0], fontStyle: 'bold' }
  })
  
  // Package Features
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(11)
  doc.text('패키지 포함 사항', 20, finalY)
  doc.setFontSize(9)
  
  let featureY = finalY + 7
  packageInfo.features.forEach((feature, index) => {
    doc.text('• ' + feature, 25, featureY)
    featureY += 5
  })
  
  // Payment Information
  const paymentY = featureY + 10
  doc.setFontSize(11)
  doc.text('입금 정보', 20, paymentY)
  doc.setFontSize(9)
  doc.text('은행: 국민은행', 20, paymentY + 7)
  doc.text('계좌번호: 123-456-789012', 20, paymentY + 12)
  doc.text('예금주: (주)크넥', 20, paymentY + 17)
  
  // Footer
  doc.setFontSize(8)
  doc.text('본 견적서는 발행일로부터 30일간 유효합니다.', 105, 270, { align: 'center' })
  doc.text('(주)크넥 | 사업자등록번호: 123-45-67890 | 대표: 홍길동', 105, 275, { align: 'center' })
  doc.text('주소: 서울특별시 강남구 테헤란로 123 | 전화: 02-1234-5678', 105, 280, { align: 'center' })
  
  return doc
}

// Generate Contract PDF
export const generateContractPDF = (campaignData, companyData) => {
  const doc = new jsPDF()
  
  // Set font
  doc.setFont('helvetica')
  
  // Title
  doc.setFontSize(20)
  doc.text('인플루언서 마케팅 캠페인 계약서', 105, 20, { align: 'center' })
  
  // Date
  doc.setFontSize(10)
  const today = format(new Date(), 'yyyy년 MM월 dd일')
  doc.text('계약일: ' + today, 105, 30, { align: 'center' })
  
  // Parties
  doc.setFontSize(12)
  doc.text('갑: (주)크넥', 20, 45)
  doc.text('을: ' + (companyData.company_name || ''), 20, 52)
  doc.text('    사업자등록번호: ' + (companyData.business_number || ''), 20, 59)
  doc.text('    담당자: ' + (companyData.contact_name || ''), 20, 66)
  
  // Contract Terms
  doc.setFontSize(11)
  doc.text('제1조 (목적)', 20, 80)
  doc.setFontSize(9)
  const purpose = '본 계약은 갑이 을에게 인플루언서 마케팅 캠페인 서비스를 제공하고, 을이 이에 대한 대가를 지급하는 것을 목적으로 한다.'
  const purposeLines = doc.splitTextToSize(purpose, 170)
  doc.text(purposeLines, 20, 87)
  
  // Campaign Details
  doc.setFontSize(11)
  doc.text('제2조 (캠페인 정보)', 20, 100)
  doc.setFontSize(9)
  doc.text('1. 캠페인명: ' + (campaignData.title || ''), 25, 107)
  doc.text('2. 브랜드명: ' + (campaignData.brand_name || ''), 25, 112)
  doc.text('3. 제품명: ' + (campaignData.product_name || ''), 25, 117)
  
  const regions = campaignData.regions || []
  const regionText = regions.map(r => REGION_NAMES[r] || r).join(', ')
  doc.text('4. 진행 지역: ' + regionText, 25, 122)
  
  const packageInfo = PACKAGES[campaignData.package_type] || {}
  doc.text('5. 패키지: ' + packageInfo.name, 25, 127)
  
  // Service Details
  doc.setFontSize(11)
  doc.text('제3조 (서비스 내용)', 20, 140)
  doc.setFontSize(9)
  doc.text('갑은 을에게 다음의 서비스를 제공한다:', 20, 147)
  
  let serviceY = 152
  packageInfo.features.forEach((feature, index) => {
    doc.text((index + 1) + '. ' + feature, 25, serviceY)
    serviceY += 5
  })
  
  // Payment Terms
  const paymentY = serviceY + 8
  doc.setFontSize(11)
  doc.text('제4조 (대금 및 지급)', 20, paymentY)
  doc.setFontSize(9)
  
  const totalAmount = packageInfo.price * regions.length
  doc.text('1. 계약금액: ' + totalAmount.toLocaleString() + '원', 25, paymentY + 7)
  doc.text('2. 지급방법: 계약 체결 후 7일 이내 전액 선불', 25, paymentY + 12)
  doc.text('3. 입금계좌: 국민은행 123-456-789012 (주)크넥', 25, paymentY + 17)
  
  // Contract Period
  const periodY = paymentY + 30
  doc.setFontSize(11)
  doc.text('제5조 (계약기간)', 20, periodY)
  doc.setFontSize(9)
  
  const duration = campaignData.package_type === 600000 ? '4주' : '2주'
  doc.text('본 계약의 유효기간은 계약 체결일로부터 ' + duration + '로 한다.', 20, periodY + 7)
  
  // Signatures
  doc.setFontSize(10)
  doc.text('갑: (주)크넥', 30, 250)
  doc.text('대표이사: _______________ (인)', 35, 257)
  
  doc.text('을: ' + (companyData.company_name || ''), 120, 250)
  doc.text('대표자: _______________ (인)', 125, 257)
  
  // Footer
  doc.setFontSize(8)
  doc.text('(주)크넥 | 사업자등록번호: 123-45-67890 | 주소: 서울특별시 강남구 테헤란로 123', 105, 280, { align: 'center' })
  
  return doc
}

// Download PDF
export const downloadPDF = (doc, filename) => {
  doc.save(filename)
}

// Generate and download quotation
export const generateAndDownloadQuotation = (campaignData, companyData) => {
  const doc = generateQuotationPDF(campaignData, companyData)
  const filename = `견적서_${campaignData.brand_name || 'campaign'}_${format(new Date(), 'yyyyMMdd')}.pdf`
  downloadPDF(doc, filename)
}

// Generate and download contract
export const generateAndDownloadContract = (campaignData, companyData) => {
  const doc = generateContractPDF(campaignData, companyData)
  const filename = `계약서_${campaignData.brand_name || 'campaign'}_${format(new Date(), 'yyyyMMdd')}.pdf`
  downloadPDF(doc, filename)
}

