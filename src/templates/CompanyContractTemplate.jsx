export const CompanyContractTemplate = (data) => {
  const {
    companyName = '',
    ceoName = '',
    address = '',
    brandName = '',
    contractDate = new Date().toLocaleDateString('ko-KR'),
  } = data

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>콘텐츠 지식재산권 사용 계약서 (프리미엄 패키지)</title>
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
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 10px 0;
      color: #1e40af;
    }
    .header p {
      font-size: 16px;
      color: #374151;
      margin: 5px 0;
    }
    .article {
      margin: 25px 0;
    }
    .article-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
      color: #1e40af;
    }
    .article-content {
      line-height: 1.9;
      text-align: justify;
    }
    .article-content ol {
      margin: 10px 0;
      padding-left: 25px;
    }
    .article-content li {
      margin: 8px 0;
    }
    .brand-section {
      margin: 40px 0;
      padding: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .brand-label {
      font-weight: bold;
      color: #374151;
      margin-bottom: 10px;
    }
    .brand-value {
      font-size: 18px;
      color: #1e40af;
      padding: 10px;
      background: white;
      border-bottom: 2px solid #2563eb;
      min-height: 30px;
    }
    .signature-section {
      margin-top: 50px;
      display: flex;
      gap: 30px;
    }
    .signature-box {
      flex: 1;
      padding: 20px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
    }
    .signature-title {
      font-weight: bold;
      font-size: 14px;
      color: #1e40af;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .signature-row {
      display: flex;
      margin: 8px 0;
      font-size: 14px;
    }
    .signature-label {
      min-width: 60px;
      color: #6b7280;
    }
    .signature-value {
      flex: 1;
      color: #1f2937;
    }
    .signature-line {
      margin-top: 20px;
      text-align: right;
      color: #6b7280;
      font-size: 14px;
    }
    .company-stamp {
      display: inline-block;
      width: 70px;
      height: 70px;
      border: 3px solid #dc2626;
      border-radius: 50%;
      color: #dc2626;
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      line-height: 1.2;
      padding: 12px 5px;
      margin-top: 10px;
      transform: rotate(-5deg);
    }
    .stamp-area {
      text-align: right;
      margin-top: 15px;
    }
    .signer-signature-area {
      min-height: 80px;
      border: 1px dashed #d1d5db;
      border-radius: 4px;
      margin-top: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 12px;
    }
    .confirmation-section {
      margin-top: 40px;
      padding: 20px;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
    }
    .confirmation-title {
      font-weight: bold;
      color: #92400e;
      margin-bottom: 15px;
    }
    .confirmation-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 12px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    .checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid #d97706;
      border-radius: 3px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>콘텐츠 지식재산권 사용 계약서</h1>
    <p>(프리미엄 패키지)</p>
  </div>

  <div class="article">
    <div class="article-title">제1조 (계약 목적)</div>
    <div class="article-content">
      본 계약은 주식회사 하우파파(이하 "갑")와 콘텐츠 사용자(이하 "을")가 프리미엄 패키지 형태의
      콘텐츠 제작 및 활용에 대해 권리와 의무를 규정함을 목적으로 한다.
    </div>
  </div>

  <div class="article">
    <div class="article-title">제2조 (지식재산권 귀속)</div>
    <div class="article-content">
      <ol>
        <li>콘텐츠에 대한 모든 지식재산권은 갑에게 귀속된다.</li>
        <li>을은 본 계약에 따라 콘텐츠를 사용권한 범위 내에서 활용할 수 있으며, 갑의 사전 서면 동의 없이 제3자에게 권리를 양도할 수 없다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제3조 (콘텐츠 제작 및 인도)</div>
    <div class="article-content">
      <ol>
        <li>갑은 계약 체결 후 정해진 기한 내 콘텐츠를 을에게 제공한다.</li>
        <li>콘텐츠는 완성본(mp4 파일)으로 제공되며, 클린본(원본 영상 파일)은 별도 구매 시 1건당 10만원(VAT 별도)으로 제공한다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제4조 (수정 범위 및 조건)</div>
    <div class="article-content">
      <ol>
        <li>프리미엄 패키지 계약에서는 수정 가능을 원칙으로 하나, 사전에 합의된 가이드에 포함되지 않은 수정은 불가하다.</li>
        <li>을은 납품된 콘텐츠에 대해 1회 무료 수정을 요청할 수 있다.</li>
        <li>무료 수정 범위는 가이드 내에서의 자막, 음성, 색감, 장면 전환 등 경미한 후편집으로 한정된다.</li>
        <li>가이드 외 요청, 기획 변경, 추가 촬영, 2회차 이상 수정이 필요한 경우, 별도 비용이 발생하며 갑과 협의 후 진행한다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제5조 (사용 기간)</div>
    <div class="article-content">
      콘텐츠 사용 권한은 최종 업로드일로부터 1년간 유효하다.
    </div>
  </div>

  <div class="article">
    <div class="article-title">제6조 (사용료 지급)</div>
    <div class="article-content">
      <ol>
        <li>사용료는 견적서 기준으로 산정하며, 세금계산서 발행일로부터 14일 이내 전액 지급한다.</li>
        <li>추가 수정 및 기획 변경, 추가 촬영, 클린본 구매 비용은 별도 합의에 따라 을이 부담한다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제7조 (계약 해제·해지)</div>
    <div class="article-content">
      <ol>
        <li>을이 계약 조건을 위반하거나 업로드 일정을 지연할 경우, 갑은 계약을 해지할 수 있으며 실제 발생한 손해에 대해 손해배상을 청구할 수 있다.</li>
        <li>협의된 일정 내 업로드가 불가한 경우, 갑과 을은 상호 협의하여 스케줄을 조정할 수 있다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제8조 (기타)</div>
    <div class="article-content">
      본 계약에 명시되지 않은 사항은 관련 법령 및 일반 상관례에 따른다.
    </div>
  </div>

  <div class="brand-section">
    <div class="brand-label">진행 브랜드명</div>
    <div class="brand-value">${brandName || '___________________________'}</div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">[지식재산권자 (갑)]</div>
      <div class="signature-row">
        <div class="signature-label">회사명:</div>
        <div class="signature-value">주식회사 하우파파</div>
      </div>
      <div class="signature-row">
        <div class="signature-label">주소:</div>
        <div class="signature-value">서울 중구 퇴계로36길 2 동국대학교 충무로 영상센터 1009호</div>
      </div>
      <div class="signature-row">
        <div class="signature-label">대표자:</div>
        <div class="signature-value">박현용</div>
      </div>
      <div class="stamp-area">
        <div class="company-stamp">
          주식회사<br/>하우파파<br/>대표이사
        </div>
      </div>
    </div>

    <div class="signature-box">
      <div class="signature-title">[콘텐츠 사용자 (을)]</div>
      <div class="signature-row">
        <div class="signature-label">회사명:</div>
        <div class="signature-value" id="signer-company">${companyName || '___________________________'}</div>
      </div>
      <div class="signature-row">
        <div class="signature-label">주소:</div>
        <div class="signature-value" id="signer-address">${address || '___________________________'}</div>
      </div>
      <div class="signature-row">
        <div class="signature-label">대표자:</div>
        <div class="signature-value" id="signer-ceo">${ceoName || '___________________________'}</div>
      </div>
      <div class="signer-signature-area" id="signer-signature">
        서명란
      </div>
    </div>
  </div>

  <div class="confirmation-section">
    <div class="confirmation-title">확인 사항 (체크 필수)</div>
    <div class="confirmation-item">
      <div class="checkbox"></div>
      <div>본 계약의 프리미엄 패키지 콘텐츠는 사전에 합의된 가이드 범위 내에서만 수정 가능하며, 1회 무료 수정을 초과하거나 기획 변경·추가 촬영이 필요한 경우 별도 비용이 발생한다는 점을 확인하였습니다.</div>
    </div>
    <div class="confirmation-item">
      <div class="checkbox"></div>
      <div>본 계약의 콘텐츠는 최종 업로드일로부터 1년간 사용 가능하며, 이후 활용은 별도의 계약 또는 비용 협의가 필요함을 확인하였습니다.</div>
    </div>
  </div>

  <div style="text-align: center; margin-top: 40px; font-size: 14px; color: #6b7280;">
    계약일: ${contractDate}
  </div>

  <div class="footer">
    <p>본 계약서는 전자문서 및 전자거래 기본법에 따라 전자적 형태로 작성되었으며, 법적 효력을 가집니다.</p>
    <p style="margin-top: 10px;">주식회사 하우파파 | 대표 박현용 | 사업자등록번호 575-81-02253</p>
    <p>서울 중구 퇴계로36길 2 동국대학교 충무로 영상센터 1009호</p>
    <p>© ${new Date().getFullYear()} HOWPAPA Inc. All rights reserved.</p>
  </div>
</body>
</html>
  `
}
