export const CompanyContractTemplate = (data) => {
  const {
    companyName = '',
    ceoName = '',
    businessNumber = '',
    address = '',
    email = '',
    phone = '',
    campaignTitle = '',
    campaignBudget = '',
    campaignPeriod = '',
    contractDate = new Date().toLocaleDateString('ko-KR'),
  } = data

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>크리에이터 섭외 및 콘텐츠 활용 위임 계약서</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 10px 0;
      color: #1e40af;
    }
    .header p {
      font-size: 14px;
      color: #666;
      margin: 5px 0;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .content {
      margin: 15px 0;
      padding-left: 10px;
    }
    .article {
      margin: 20px 0;
    }
    .article-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
      color: #374151;
    }
    .article-content {
      margin-left: 20px;
      line-height: 2;
    }
    .info-box {
      background: #f3f4f6;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      margin: 8px 0;
    }
    .info-label {
      font-weight: bold;
      min-width: 120px;
      color: #374151;
    }
    .info-value {
      flex: 1;
      color: #1f2937;
    }
    .signature-section {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    .signature-box {
      margin: 30px 0;
      padding: 20px;
      border: 2px solid #d1d5db;
      border-radius: 8px;
    }
    .signature-line {
      margin: 15px 0;
      padding: 10px 0;
      border-bottom: 1px solid #9ca3af;
      min-height: 40px;
    }
    .date {
      text-align: center;
      font-size: 16px;
      margin: 40px 0 30px 0;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
    ul {
      margin: 10px 0;
      padding-left: 30px;
    }
    li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>크리에이터 섭외 및 콘텐츠 활용 위임 계약서</h1>
    <p>Creator Recruitment and Content Usage Agreement</p>
  </div>

  <div class="section">
    <div class="section-title">계약 당사자</div>
    <div class="info-box">
      <div class="info-row">
        <div class="info-label">위임자 (갑)</div>
        <div class="info-value">${companyName}</div>
      </div>
      <div class="info-row">
        <div class="info-label">대표자</div>
        <div class="info-value">${ceoName}</div>
      </div>
      <div class="info-row">
        <div class="info-label">사업자등록번호</div>
        <div class="info-value">${businessNumber}</div>
      </div>
      <div class="info-row">
        <div class="info-label">주소</div>
        <div class="info-value">${address}</div>
      </div>
      <div class="info-row">
        <div class="info-label">이메일</div>
        <div class="info-value">${email}</div>
      </div>
      <div class="info-row">
        <div class="info-label">연락처</div>
        <div class="info-value">${phone}</div>
      </div>
    </div>

    <div class="info-box" style="margin-top: 20px;">
      <div class="info-row">
        <div class="info-label">수임자 (을)</div>
        <div class="info-value">주식회사 씨넥</div>
      </div>
      <div class="info-row">
        <div class="info-label">대표자</div>
        <div class="info-value">김민규</div>
      </div>
      <div class="info-row">
        <div class="info-label">사업자등록번호</div>
        <div class="info-value">123-45-67890</div>
      </div>
      <div class="info-row">
        <div class="info-label">주소</div>
        <div class="info-value">서울특별시 강남구 테헤란로 123</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">캠페인 정보</div>
    <div class="info-box">
      <div class="info-row">
        <div class="info-label">캠페인명</div>
        <div class="info-value">${campaignTitle}</div>
      </div>
      <div class="info-row">
        <div class="info-label">예산</div>
        <div class="info-value">${campaignBudget}</div>
      </div>
      <div class="info-row">
        <div class="info-label">계약 기간</div>
        <div class="info-value">${campaignPeriod}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="article">
      <div class="article-title">제1조 (목적)</div>
      <div class="article-content">
        본 계약은 갑이 을에게 크리에이터 섭외 및 콘텐츠 2차 활용에 관한 업무를 위임하고, 
        을이 이를 수행함에 있어 필요한 제반 사항을 정함을 목적으로 합니다.
      </div>
    </div>

    <div class="article">
      <div class="article-title">제2조 (위임 업무의 범위)</div>
      <div class="article-content">
        을은 갑으로부터 다음 각 호의 업무를 위임받습니다:
        <ul>
          <li>캠페인에 적합한 크리에이터 발굴 및 섭외</li>
          <li>크리에이터와의 계약 체결 및 관리</li>
          <li>크리에이터가 제작한 콘텐츠의 2차 활용 권한 확보</li>
          <li>콘텐츠 활용 범위 및 기간 협의</li>
          <li>크리에이터에게 대가 지급</li>
          <li>기타 캠페인 진행에 필요한 제반 업무</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제3조 (콘텐츠 2차 활용 권한)</div>
      <div class="article-content">
        <ul>
          <li>을은 크리에이터로부터 콘텐츠 2차 활용 권한을 확보하여 갑에게 제공합니다.</li>
          <li>갑은 을이 확보한 권한 범위 내에서 콘텐츠를 활용할 수 있습니다.</li>
          <li>콘텐츠 활용 범위: 광고, 마케팅, SNS 게시, 웹사이트 게재 등</li>
          <li>활용 기간: 계약서에 명시된 기간 또는 별도 협의된 기간</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제4조 (대가 및 지급)</div>
      <div class="article-content">
        <ul>
          <li>갑은 을에게 캠페인 예산을 포인트로 충전하여 지급합니다.</li>
          <li>을은 크리에이터에게 합의된 금액을 지급하고, 나머지는 수수료로 정산합니다.</li>
          <li>포인트 충전 시 세금계산서 또는 현금영수증이 발행됩니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제5조 (갑의 의무)</div>
      <div class="article-content">
        <ul>
          <li>갑은 캠페인 진행에 필요한 정보와 자료를 을에게 제공해야 합니다.</li>
          <li>갑은 계약 체결 후 7일 이내에 포인트를 충전해야 합니다.</li>
          <li>갑은 을이 확보한 콘텐츠 활용 권한 범위를 준수해야 합니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제6조 (을의 의무)</div>
      <div class="article-content">
        <ul>
          <li>을은 캠페인 목적에 적합한 크리에이터를 성실히 섭외해야 합니다.</li>
          <li>을은 크리에이터와의 계약 내용을 갑에게 투명하게 공개해야 합니다.</li>
          <li>을은 크리에이터에게 합의된 금액을 정확히 지급해야 합니다.</li>
          <li>을은 콘텐츠 활용 권한을 명확히 확보하여 갑에게 제공해야 합니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제7조 (계약 해지)</div>
      <div class="article-content">
        <ul>
          <li>양 당사자는 상대방이 본 계약을 위반한 경우 계약을 해지할 수 있습니다.</li>
          <li>계약 해지 시 이미 지급된 금액은 환불되지 않습니다.</li>
          <li>단, 을의 귀책사유로 인한 해지 시 갑은 환불을 요청할 수 있습니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제8조 (분쟁 해결)</div>
      <div class="article-content">
        본 계약과 관련하여 분쟁이 발생한 경우, 양 당사자는 상호 협의하여 해결하며, 
        협의가 이루어지지 않을 경우 대한민국 법률에 따라 관할 법원에서 해결합니다.
      </div>
    </div>
  </div>

  <div class="date">
    계약일: ${contractDate}
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="section-title">위임자 (갑) 서명</div>
      <div class="info-row">
        <div class="info-label">회사명</div>
        <div class="info-value">${companyName}</div>
      </div>
      <div class="info-row">
        <div class="info-label">대표자</div>
        <div class="info-value">${ceoName}</div>
      </div>
      <div class="signature-line">
        <div style="text-align: right; color: #6b7280;">서명: _____________________</div>
      </div>
    </div>

    <div class="signature-box">
      <div class="section-title">수임자 (을)</div>
      <div class="info-row">
        <div class="info-label">회사명</div>
        <div class="info-value">주식회사 씨넥</div>
      </div>
      <div class="info-row">
        <div class="info-label">대표자</div>
        <div class="info-value">김민규</div>
      </div>
      <div class="signature-line">
        <div style="text-align: right; color: #6b7280;">서명: _____________________</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>본 계약서는 전자문서 및 전자거래 기본법에 따라 전자적 형태로 작성되었으며, 법적 효력을 가집니다.</p>
    <p>© ${new Date().getFullYear()} CNEC Inc. All rights reserved.</p>
  </div>
</body>
</html>
  `
}

