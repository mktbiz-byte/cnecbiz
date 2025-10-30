/**
 * 전자계약서 템플릿
 * 기업용 계약서 및 크리에이터용 동의서 템플릿
 */

/**
 * 기업용 계약서 템플릿 (기업 ↔ CNEC)
 * @param {Object} data - 계약서 데이터
 * @param {string} data.companyName - 기업명
 * @param {string} data.ceoName - 대표자명
 * @param {string} data.businessNumber - 사업자등록번호
 * @param {string} data.address - 사업장 주소
 * @param {string} data.campaignTitle - 캠페인명
 * @param {string} data.amount - 계약 금액
 * @param {string} data.startDate - 계약 시작일
 * @param {string} data.endDate - 계약 종료일
 * @returns {string} HTML 계약서
 */
export const getCompanyContractTemplate = (data = {}) => {
  const {
    companyName = '[기업명]',
    ceoName = '[대표자명]',
    businessNumber = '[사업자등록번호]',
    address = '[사업장 주소]',
    campaignTitle = '[캠페인명]',
    amount = '[계약금액]',
    startDate = '[시작일]',
    endDate = '[종료일]',
    contractDate = new Date().toLocaleDateString('ko-KR')
  } = data;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>광고 대행 계약서</title>
  <style>
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      line-height: 1.8;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 {
      text-align: center;
      font-size: 28px;
      margin-bottom: 40px;
      font-weight: bold;
    }
    h2 {
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      font-weight: bold;
    }
    .parties {
      margin: 30px 0;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .party {
      margin-bottom: 15px;
    }
    .party-label {
      font-weight: bold;
      display: inline-block;
      width: 100px;
    }
    .article {
      margin: 25px 0;
    }
    .article-title {
      font-weight: bold;
      margin-bottom: 10px;
    }
    .article-content {
      margin-left: 20px;
    }
    .clause {
      margin: 10px 0;
    }
    .signature-area {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }
    .signature-box {
      flex: 1;
      text-align: center;
      padding: 30px;
      border: 2px solid #ddd;
      border-radius: 8px;
    }
    .signature-title {
      font-weight: bold;
      margin-bottom: 20px;
      font-size: 16px;
    }
    .signature-info {
      text-align: left;
      margin: 15px 0;
      line-height: 2;
    }
    .stamp-placeholder {
      width: 120px;
      height: 120px;
      border: 2px dashed #ccc;
      margin: 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 14px;
    }
    .date {
      text-align: center;
      margin: 40px 0;
      font-size: 16px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>광고 대행 계약서</h1>

  <div class="parties">
    <div class="party">
      <span class="party-label">갑 (광고주)</span>
      <span>${companyName}</span>
    </div>
    <div class="party">
      <span class="party-label">을 (대행사)</span>
      <span>주식회사 씨넥</span>
    </div>
  </div>

  <p>
    갑과 을은 아래와 같이 글로벌 크리에이터 마케팅 광고 대행 계약을 체결하며, 
    본 계약서에 명시된 조건에 따라 성실히 이행할 것을 약정한다.
  </p>

  <div class="article">
    <div class="article-title">제1조 (계약의 목적)</div>
    <div class="article-content">
      <div class="clause">
        본 계약은 갑이 을에게 글로벌 크리에이터를 활용한 광고 마케팅 대행을 의뢰하고, 
        을은 이를 성실히 수행함으로써 갑의 브랜드 및 제품을 홍보하는 것을 목적으로 한다.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제2조 (계약 내용)</div>
    <div class="article-content">
      <div class="clause">① 캠페인명: ${campaignTitle}</div>
      <div class="clause">② 계약 기간: ${startDate} ~ ${endDate}</div>
      <div class="clause">③ 계약 금액: ${amount}원 (부가세 별도)</div>
      <div class="clause">④ 대행 범위: 크리에이터 섭외, 콘텐츠 제작 가이드 제공, 영상 검수, 업로드 관리</div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제3조 (을의 의무)</div>
    <div class="article-content">
      <div class="clause">① 을은 갑이 요청한 타겟 지역 및 크리에이터 조건에 맞는 크리에이터를 섭외한다.</div>
      <div class="clause">② 을은 크리에이터에게 제공할 콘텐츠 가이드를 작성하여 갑의 승인을 받는다.</div>
      <div class="clause">③ 을은 크리에이터가 제작한 영상을 검수하고, 갑의 피드백을 반영하여 수정을 요청한다.</div>
      <div class="clause">④ 을은 영상 업로드 후 성과 리포트를 갑에게 제공한다.</div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제4조 (갑의 의무)</div>
    <div class="article-content">
      <div class="clause">① 갑은 을이 요청하는 브랜드 정보, 제품 정보, 레퍼런스 자료를 제공한다.</div>
      <div class="clause">② 갑은 을이 제공하는 콘텐츠 가이드 및 영상 검수 요청에 대해 영업일 기준 3일 이내에 피드백을 제공한다.</div>
      <div class="clause">③ 갑은 계약 금액을 계약서에 명시된 일정에 따라 을에게 지급한다.</div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제5조 (대금 지급)</div>
    <div class="article-content">
      <div class="clause">① 계약금: 계약 체결 시 총 계약 금액의 50%</div>
      <div class="clause">② 잔금: 캠페인 완료 후 7일 이내 총 계약 금액의 50%</div>
      <div class="clause">③ 지급 방법: 세금계산서 발행 후 계좌 이체</div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제6조 (지적재산권)</div>
    <div class="article-content">
      <div class="clause">
        ① 본 계약에 따라 제작된 콘텐츠의 저작권은 해당 크리에이터에게 있으며, 
        갑은 을을 통해 크리에이터로부터 사용 권한을 부여받는다.
      </div>
      <div class="clause">
        ② 갑은 계약 기간 및 계약 종료 후 1년간 해당 콘텐츠를 자사 마케팅 목적으로 사용할 수 있다.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제7조 (비밀유지)</div>
    <div class="article-content">
      <div class="clause">
        갑과 을은 본 계약 수행 과정에서 알게 된 상대방의 영업 비밀 및 기밀 정보를 
        제3자에게 누설하거나 본 계약 목적 외의 용도로 사용하지 않는다.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제8조 (계약 해지)</div>
    <div class="article-content">
      <div class="clause">
        ① 갑 또는 을은 상대방이 본 계약의 중요한 조항을 위반하고 7일 이내에 시정하지 않을 경우 
        서면 통지로 본 계약을 해지할 수 있다.
      </div>
      <div class="clause">
        ② 계약 해지 시 이미 지급된 대금은 수행된 업무 범위에 따라 정산한다.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제9조 (분쟁 해결)</div>
    <div class="article-content">
      <div class="clause">
        본 계약과 관련하여 발생하는 분쟁은 갑과 을이 상호 협의하여 해결하며, 
        협의가 이루어지지 않을 경우 서울중앙지방법원을 관할 법원으로 한다.
      </div>
    </div>
  </div>

  <div class="date">${contractDate}</div>

  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-title">갑 (광고주)</div>
      <div class="signature-info">
        상호: ${companyName}<br>
        대표자: ${ceoName}<br>
        사업자등록번호: ${businessNumber}<br>
        주소: ${address}
      </div>
      <div class="stamp-placeholder">
        (인)
      </div>
    </div>

    <div class="signature-box">
      <div class="signature-title">을 (대행사)</div>
      <div class="signature-info">
        상호: 주식회사 씨넥<br>
        대표자: 김민수<br>
        사업자등록번호: 123-45-67890<br>
        주소: 서울특별시 강남구 테헤란로 123
      </div>
      <div class="stamp-placeholder">
        (인)
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * 크리에이터용 동의서 템플릿 (크리에이터 ↔ CNEC)
 * @param {Object} data - 동의서 데이터
 * @param {string} data.creatorName - 크리에이터명
 * @param {string} data.creatorEmail - 크리에이터 이메일
 * @param {string} data.creatorCountry - 크리에이터 국가
 * @param {string} data.campaignTitle - 캠페인명
 * @param {string} data.brandName - 브랜드명
 * @param {string} data.compensation - 보상금액
 * @returns {string} HTML 동의서
 */
export const getCreatorConsentTemplate = (data = {}) => {
  const {
    creatorName = '[크리에이터명]',
    creatorEmail = '[이메일]',
    creatorCountry = '[국가]',
    campaignTitle = '[캠페인명]',
    brandName = '[브랜드명]',
    compensation = '[보상금액]',
    contractDate = new Date().toLocaleDateString('ko-KR')
  } = data;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>초상권 사용 동의서</title>
  <style>
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      line-height: 1.8;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 {
      text-align: center;
      font-size: 28px;
      margin-bottom: 40px;
      font-weight: bold;
    }
    h2 {
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      font-weight: bold;
    }
    .parties {
      margin: 30px 0;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .party {
      margin-bottom: 15px;
    }
    .party-label {
      font-weight: bold;
      display: inline-block;
      width: 100px;
    }
    .article {
      margin: 25px 0;
    }
    .article-title {
      font-weight: bold;
      margin-bottom: 10px;
    }
    .article-content {
      margin-left: 20px;
    }
    .clause {
      margin: 10px 0;
    }
    .consent-items {
      margin: 20px 0;
      padding: 20px;
      background: #f0f8ff;
      border-left: 4px solid #4a90e2;
      border-radius: 4px;
    }
    .consent-item {
      margin: 10px 0;
      display: flex;
      align-items: flex-start;
    }
    .consent-checkbox {
      margin-right: 10px;
      margin-top: 5px;
    }
    .signature-area {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }
    .signature-box {
      flex: 1;
      text-align: center;
      padding: 30px;
      border: 2px solid #ddd;
      border-radius: 8px;
    }
    .signature-title {
      font-weight: bold;
      margin-bottom: 20px;
      font-size: 16px;
    }
    .signature-info {
      text-align: left;
      margin: 15px 0;
      line-height: 2;
    }
    .stamp-placeholder {
      width: 120px;
      height: 120px;
      border: 2px dashed #ccc;
      margin: 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 14px;
    }
    .date {
      text-align: center;
      margin: 40px 0;
      font-size: 16px;
      font-weight: bold;
    }
    .highlight {
      background: #fff3cd;
      padding: 2px 4px;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <h1>초상권 사용 동의서</h1>

  <div class="parties">
    <div class="party">
      <span class="party-label">갑 (크리에이터)</span>
      <span>${creatorName}</span>
    </div>
    <div class="party">
      <span class="party-label">을 (대행사)</span>
      <span>주식회사 씨넥</span>
    </div>
  </div>

  <p>
    본인(갑)은 을이 진행하는 <span class="highlight">${brandName}</span> 브랜드의 
    <span class="highlight">${campaignTitle}</span> 캠페인에 참여하며, 
    아래 조건에 따라 초상권 사용에 동의합니다.
  </p>

  <div class="article">
    <div class="article-title">제1조 (동의의 목적)</div>
    <div class="article-content">
      <div class="clause">
        본인은 을이 의뢰한 광고 콘텐츠 제작을 위해 본인의 초상, 음성, 이름, 이미지 등을 
        사용하는 것에 동의합니다.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제2조 (사용 범위)</div>
    <div class="article-content">
      <div class="clause">① 사용 목적: ${brandName} 브랜드 광고 및 마케팅</div>
      <div class="clause">② 사용 매체: YouTube, TikTok, Instagram 등 소셜 미디어 플랫폼</div>
      <div class="clause">③ 사용 기간: 콘텐츠 업로드일로부터 2년</div>
      <div class="clause">④ 사용 지역: 전 세계</div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제3조 (보상)</div>
    <div class="article-content">
      <div class="clause">
        본인은 본 캠페인 참여에 대한 보상으로 <span class="highlight">${compensation}</span>을(를) 
        을로부터 지급받습니다.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제4조 (크리에이터의 의무)</div>
    <div class="article-content">
      <div class="clause">① 본인은 을이 제공하는 콘텐츠 가이드에 따라 성실히 영상을 제작합니다.</div>
      <div class="clause">② 본인은 브랜드 이미지를 훼손하지 않도록 주의하며, 허위 또는 과장된 내용을 포함하지 않습니다.</div>
      <div class="clause">③ 본인은 을의 검수 및 수정 요청에 협조합니다.</div>
      <div class="clause">④ 본인은 영상 업로드 후 을이 요청하는 성과 데이터를 제공합니다.</div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제5조 (저작권)</div>
    <div class="article-content">
      <div class="clause">
        ① 본인이 제작한 콘텐츠의 저작권은 본인에게 있으며, 
        을 및 광고주는 본 동의서에 명시된 범위 내에서 사용할 수 있습니다.
      </div>
      <div class="clause">
        ② 본인은 을 및 광고주가 본 콘텐츠를 2차 가공하여 광고 목적으로 사용하는 것에 동의합니다.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제6조 (개인정보 처리)</div>
    <div class="article-content">
      <div class="clause">
        본인은 을이 본 계약 이행을 위해 본인의 개인정보(이름, 이메일, 국가, 계좌정보 등)를 
        수집·이용하는 것에 동의합니다.
      </div>
    </div>
  </div>

  <div class="consent-items">
    <h3 style="margin-top: 0;">동의 항목</h3>
    <div class="consent-item">
      <input type="checkbox" class="consent-checkbox" checked disabled>
      <label>본인의 초상, 음성, 이름을 광고 콘텐츠에 사용하는 것에 동의합니다.</label>
    </div>
    <div class="consent-item">
      <input type="checkbox" class="consent-checkbox" checked disabled>
      <label>제작된 콘텐츠를 소셜 미디어 플랫폼에 업로드하는 것에 동의합니다.</label>
    </div>
    <div class="consent-item">
      <input type="checkbox" class="consent-checkbox" checked disabled>
      <label>을 및 광고주가 콘텐츠를 2차 가공하여 사용하는 것에 동의합니다.</label>
    </div>
    <div class="consent-item">
      <input type="checkbox" class="consent-checkbox" checked disabled>
      <label>개인정보 수집 및 이용에 동의합니다.</label>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제7조 (계약 해지)</div>
    <div class="article-content">
      <div class="clause">
        본인 또는 을은 상대방이 본 동의서의 중요한 조항을 위반할 경우 
        서면 통지로 본 계약을 해지할 수 있습니다.
      </div>
    </div>
  </div>

  <div class="date">${contractDate}</div>

  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-title">갑 (크리에이터)</div>
      <div class="signature-info">
        이름: ${creatorName}<br>
        이메일: ${creatorEmail}<br>
        국가: ${creatorCountry}
      </div>
      <div class="stamp-placeholder">
        서명란
      </div>
    </div>

    <div class="signature-box">
      <div class="signature-title">을 (대행사)</div>
      <div class="signature-info">
        상호: 주식회사 씨넥<br>
        대표자: 김민수<br>
        사업자등록번호: 123-45-67890<br>
        주소: 서울특별시 강남구 테헤란로 123
      </div>
      <div class="stamp-placeholder">
        (인)
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * 계약서 템플릿 목록
 */
export const CONTRACT_TEMPLATES = {
  company: {
    name: '기업용 계약서',
    description: '기업 ↔ CNEC 간 광고 대행 계약서',
    template: getCompanyContractTemplate
  },
  creator: {
    name: '크리에이터용 동의서',
    description: '크리에이터 ↔ CNEC 간 초상권 사용 동의서',
    template: getCreatorConsentTemplate
  }
};

