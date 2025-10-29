export const CreatorConsentTemplate = (data) => {
  const {
    creatorName = '',
    channelName = '',
    email = '',
    phone = '',
    contentTitle = '',
    usagePeriod = '',
    compensation = '',
    consentDate = new Date().toLocaleDateString('ko-KR'),
  } = data

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>크리에이터 콘텐츠 2차 활용 동의서</title>
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
      border-bottom: 3px solid #f59e0b;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 10px 0;
      color: #d97706;
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
      color: #d97706;
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
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
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
      border: 2px solid #fbbf24;
      border-radius: 8px;
      background: #fffbeb;
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
    .highlight {
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>크리에이터 콘텐츠 2차 활용 동의서</h1>
    <p>Creator Content Secondary Usage Consent Form</p>
  </div>

  <div class="section">
    <div class="section-title">크리에이터 정보</div>
    <div class="info-box">
      <div class="info-row">
        <div class="info-label">크리에이터명</div>
        <div class="info-value">${creatorName}</div>
      </div>
      <div class="info-row">
        <div class="info-label">채널명</div>
        <div class="info-value">${channelName}</div>
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
  </div>

  <div class="section">
    <div class="section-title">콘텐츠 정보</div>
    <div class="info-box">
      <div class="info-row">
        <div class="info-label">콘텐츠 제목</div>
        <div class="info-value">${contentTitle}</div>
      </div>
      <div class="info-row">
        <div class="info-label">활용 기간</div>
        <div class="info-value">${usagePeriod}</div>
      </div>
      <div class="info-row">
        <div class="info-label">대가</div>
        <div class="info-value">${compensation}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="article">
      <div class="article-title">제1조 (동의 내용)</div>
      <div class="article-content">
        본인(이하 "크리에이터")은 주식회사 씨넥(이하 "회사")이 아래 명시된 콘텐츠를 
        2차적으로 활용하는 것에 동의합니다.
      </div>
    </div>

    <div class="article">
      <div class="article-title">제2조 (콘텐츠 활용 범위)</div>
      <div class="article-content">
        회사는 크리에이터가 제작한 콘텐츠를 다음과 같이 활용할 수 있습니다:
        <ul>
          <li><span class="highlight">광고 및 마케팅 목적</span>으로 사용</li>
          <li><span class="highlight">SNS 및 온라인 플랫폼</span>에 게시</li>
          <li><span class="highlight">기업 고객에게 제공</span>하여 상업적으로 활용</li>
          <li><span class="highlight">편집 및 재가공</span>하여 사용</li>
          <li><span class="highlight">다국어 자막 추가</span> 및 번역</li>
          <li>기타 캠페인 목적에 부합하는 활용</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제3조 (활용 기간)</div>
      <div class="article-content">
        <ul>
          <li>콘텐츠 활용 기간: <span class="highlight">${usagePeriod}</span></li>
          <li>기간 만료 후에는 회사는 콘텐츠 사용을 중단합니다.</li>
          <li>기간 연장이 필요한 경우 크리에이터와 별도 협의합니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제4조 (대가 및 지급)</div>
      <div class="article-content">
        <ul>
          <li>회사는 크리에이터에게 <span class="highlight">${compensation}</span>을 지급합니다.</li>
          <li>대가는 콘텐츠 제공 완료 후 7영업일 이내에 지급됩니다.</li>
          <li>지급 방법: 크리에이터가 지정한 계좌로 입금</li>
          <li>세금 및 수수료는 관련 법령에 따라 처리됩니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제5조 (저작권 및 초상권)</div>
      <div class="article-content">
        <ul>
          <li>콘텐츠의 저작권은 크리에이터에게 있습니다.</li>
          <li>회사는 본 동의서에 명시된 범위 내에서만 콘텐츠를 사용할 수 있습니다.</li>
          <li>크리에이터는 콘텐츠에 등장하는 인물의 초상권 사용에 대한 동의를 확보해야 합니다.</li>
          <li>제3자의 권리를 침해하지 않는 콘텐츠임을 보증합니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제6조 (크리에이터의 의무)</div>
      <div class="article-content">
        <ul>
          <li>크리에이터는 고품질의 콘텐츠를 제공해야 합니다.</li>
          <li>콘텐츠는 법령 및 플랫폼 정책을 준수해야 합니다.</li>
          <li>허위, 과장, 비방 등의 내용이 포함되어서는 안 됩니다.</li>
          <li>제3자의 저작권, 초상권, 상표권 등을 침해해서는 안 됩니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제7조 (회사의 의무)</div>
      <div class="article-content">
        <ul>
          <li>회사는 크리에이터의 명예를 훼손하는 방식으로 콘텐츠를 사용하지 않습니다.</li>
          <li>회사는 합의된 대가를 정확히 지급합니다.</li>
          <li>회사는 콘텐츠 활용 범위를 준수합니다.</li>
          <li>회사는 크리에이터의 개인정보를 보호합니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제8조 (동의 철회)</div>
      <div class="article-content">
        <ul>
          <li>크리에이터는 콘텐츠 제공 전까지 동의를 철회할 수 있습니다.</li>
          <li>콘텐츠 제공 후에는 활용 기간 동안 동의를 철회할 수 없습니다.</li>
          <li>단, 회사의 귀책사유로 인한 경우 크리에이터는 동의를 철회하고 손해배상을 청구할 수 있습니다.</li>
        </ul>
      </div>
    </div>

    <div class="article">
      <div class="article-title">제9조 (분쟁 해결)</div>
      <div class="article-content">
        본 동의서와 관련하여 분쟁이 발생한 경우, 양 당사자는 상호 협의하여 해결하며, 
        협의가 이루어지지 않을 경우 대한민국 법률에 따라 관할 법원에서 해결합니다.
      </div>
    </div>
  </div>

  <div class="date">
    동의일: ${consentDate}
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="section-title">크리에이터 동의</div>
      <div class="content">
        본인은 위 내용을 충분히 이해하였으며, 콘텐츠 2차 활용에 동의합니다.
      </div>
      <div class="info-row" style="margin-top: 20px;">
        <div class="info-label">크리에이터명</div>
        <div class="info-value">${creatorName}</div>
      </div>
      <div class="info-row">
        <div class="info-label">채널명</div>
        <div class="info-value">${channelName}</div>
      </div>
      <div class="signature-line">
        <div style="text-align: right; color: #6b7280;">서명: _____________________</div>
      </div>
    </div>

    <div class="signature-box">
      <div class="section-title">주식회사 씨넥</div>
      <div class="info-row">
        <div class="info-label">대표자</div>
        <div class="info-value">김민규</div>
      </div>
      <div class="info-row">
        <div class="info-label">사업자등록번호</div>
        <div class="info-value">123-45-67890</div>
      </div>
      <div class="signature-line">
        <div style="text-align: right; color: #6b7280;">서명: _____________________</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>본 동의서는 전자문서 및 전자거래 기본법에 따라 전자적 형태로 작성되었으며, 법적 효력을 가집니다.</p>
    <p>© ${new Date().getFullYear()} CNEC Inc. All rights reserved.</p>
  </div>
</body>
</html>
  `
}

