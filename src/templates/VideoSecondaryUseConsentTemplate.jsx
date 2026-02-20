/**
 * 영상 2차 활용 동의서 템플릿
 * 크리에이터가 제작한 영상의 2차 활용에 대한 동의서
 */
export const VideoSecondaryUseConsentTemplate = (data) => {
  const {
    creatorName = '',
    channelName = '',
    campaignTitle = '',
    companyName = '',
    videoCompletionDate = '',
    consentDate = new Date().toLocaleDateString('ko-KR'),
  } = data

  // 1년 후 날짜 계산
  const completionDate = videoCompletionDate ? new Date(videoCompletionDate) : new Date()
  const expiryDate = new Date(completionDate)
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)
  const expiryDateStr = expiryDate.toLocaleDateString('ko-KR')

  // 6개월 후 날짜 (영상 보관 기한)
  const retentionDate = new Date(completionDate)
  retentionDate.setMonth(retentionDate.getMonth() + 6)
  const retentionDateStr = retentionDate.toLocaleDateString('ko-KR')

  const completionDateStr = completionDate.toLocaleDateString('ko-KR')

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>영상 2차 활용 동의서</title>
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
      font-size: 26px;
      font-weight: bold;
      margin: 0 0 8px 0;
      color: #1e40af;
    }
    .header p {
      font-size: 14px;
      color: #6b7280;
      margin: 4px 0;
    }
    .info-section {
      margin: 30px 0;
      padding: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .info-title {
      font-weight: bold;
      font-size: 16px;
      color: #1e40af;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .info-row {
      display: flex;
      margin: 8px 0;
      font-size: 14px;
    }
    .info-label {
      font-weight: bold;
      min-width: 140px;
      color: #374151;
    }
    .info-value {
      flex: 1;
      color: #1f2937;
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
      font-size: 14px;
    }
    .article-content ol {
      margin: 10px 0;
      padding-left: 25px;
    }
    .article-content li {
      margin: 8px 0;
    }
    .highlight {
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }
    .warning-box {
      margin: 20px 0;
      padding: 15px;
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      border-radius: 4px;
      font-size: 14px;
    }
    .warning-box strong {
      color: #dc2626;
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
      min-width: 80px;
      color: #6b7280;
    }
    .signature-value {
      flex: 1;
      color: #1f2937;
    }
    .company-stamp {
      display: inline-block;
      width: 75px;
      height: 75px;
      border: 3px solid #c41e3a;
      color: #c41e3a;
      font-weight: bold;
      text-align: center;
      position: relative;
      background:
        linear-gradient(#c41e3a, #c41e3a) center/calc(100% - 10px) 2px no-repeat,
        linear-gradient(#c41e3a, #c41e3a) center/2px calc(100% - 10px) no-repeat;
    }
    .company-stamp::before {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      right: 3px;
      bottom: 3px;
      border: 1.5px solid #c41e3a;
    }
    .stamp-text {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(4, 1fr);
      height: 100%;
      padding: 6px;
      box-sizing: border-box;
    }
    .stamp-text span {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-family: '바탕', 'Batang', serif;
      font-weight: 900;
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
    <h1>영상 2차 활용 동의서</h1>
    <p>Video Secondary Usage Consent Form</p>
  </div>

  <div class="info-section">
    <div class="info-title">기본 정보</div>
    <div class="info-row">
      <div class="info-label">크리에이터명</div>
      <div class="info-value">${creatorName || '___________________________'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">채널명</div>
      <div class="info-value">${channelName || '___________________________'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">캠페인명</div>
      <div class="info-value">${campaignTitle || '___________________________'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">광고주</div>
      <div class="info-value">${companyName || '___________________________'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">영상 완료일</div>
      <div class="info-value">${completionDateStr}</div>
    </div>
    <div class="info-row">
      <div class="info-label">2차 활용 기간</div>
      <div class="info-value">${completionDateStr} ~ ${expiryDateStr} (1년)</div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제1조 (동의 목적)</div>
    <div class="article-content">
      본 동의서는 크리에이터(이하 "크리에이터")가 제작한 영상 콘텐츠를 주식회사 하우파파(이하 "회사")가
      광고주에게 2차적으로 활용할 수 있도록 제공하는 것에 대한 동의를 목적으로 합니다.
    </div>
  </div>

  <div class="article">
    <div class="article-title">제2조 (2차 활용 범위)</div>
    <div class="article-content">
      <ol>
        <li>회사는 크리에이터가 제작한 영상을 광고주에게 제공하여 다음과 같은 목적으로 활용할 수 있습니다.
          <ol type="a" style="margin-top: 5px;">
            <li>국내외 온라인 마케팅 (웹사이트, 배너, 랜딩페이지 등)</li>
            <li>국내외 오프라인 마케팅 (매장 디스플레이, 전시, 인쇄물 등)</li>
            <li>국내외 SNS 채널 (인스타그램, 유튜브, 틱톡 등)</li>
            <li>기타 광고 및 프로모션 목적</li>
          </ol>
        </li>
        <li>활용 가능한 채널은 <span class="highlight">국내외 모든 마케팅 채널</span>을 포함합니다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제3조 (2차 활용 기간)</div>
    <div class="article-content">
      <ol>
        <li>영상 2차 활용 기간은 <span class="highlight">영상 완료일(${completionDateStr})로부터 1년간</span> 유효합니다.</li>
        <li>활용 기간: ${completionDateStr} ~ ${expiryDateStr}</li>
        <li>기간 만료 후 2차 활용 연장이 필요한 경우, 회사와 크리에이터 간 별도 협의 후 진행합니다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제4조 (회사의 영상 보관)</div>
    <div class="article-content">
      <ol>
        <li>회사는 크리에이터가 제작한 영상 원본을 <span class="highlight">영상 완료일로부터 6개월간</span> 보관합니다.</li>
        <li>보관 기한: ${completionDateStr} ~ ${retentionDateStr}</li>
        <li>보관 기한 경과 후, 회사는 보관 중인 영상 원본을 삭제합니다.</li>
        <li>보관 기한 내에 광고주가 영상을 전달받아 직접 관리하는 것을 원칙으로 합니다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제5조 (활용 기간 만료 후 제한)</div>
    <div class="article-content">
      <ol>
        <li>2차 활용 기간(1년) 만료 후, 광고주 및 회사는 해당 영상을 다음과 같이 제한합니다.
          <ol type="a" style="margin-top: 5px;">
            <li>신규 업로드 또는 재업로드 금지</li>
            <li>상업적 광고 목적으로의 사용 금지</li>
            <li>편집, 재가공 등을 통한 새로운 콘텐츠 제작 금지</li>
          </ol>
        </li>
        <li>기간 만료 후에도 활용이 필요한 경우, 크리에이터와 별도 협의하여 2차 활용료를 지급해야 합니다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제6조 (SNS 게시물 예외 조항)</div>
    <div class="article-content">
      <ol>
        <li>크리에이터가 자신의 SNS 계정에 업로드한 영상은 2차 활용 기간 만료 후에도 <span class="highlight">삭제 의무가 없으며 계속 게시</span>할 수 있습니다.</li>
        <li>단, 크리에이터의 SNS에 게시된 영상을 활용하여 <span class="highlight">Meta 광고(Facebook/Instagram 광고) 집행은 금지</span>합니다.</li>
        <li>광고주 또는 제3자가 크리에이터의 SNS 게시물을 Meta 광고에 무단 활용한 것이 발견될 경우, 별도의 2차 활용료가 발생하며 이는 회사(크넥)를 통해 협의합니다.</li>
      </ol>
    </div>
  </div>

  <div class="warning-box">
    <strong>중요 안내:</strong> Meta 광고(Facebook/Instagram 광고)에 크리에이터 영상을 활용하는 경우,
    반드시 사전에 별도 2차 활용 동의 및 추가 비용 협의가 필요합니다.
    무단 활용 시 2차 활용료가 청구되며, 이는 주식회사 하우파파(크넥)를 통해 협의됩니다.
  </div>

  <div class="article">
    <div class="article-title">제7조 (저작권 및 초상권)</div>
    <div class="article-content">
      <ol>
        <li>영상 콘텐츠의 저작권은 크리에이터에게 귀속됩니다.</li>
        <li>회사 및 광고주는 본 동의서에 명시된 범위 내에서만 영상을 활용할 수 있습니다.</li>
        <li>회사 및 광고주는 크리에이터의 명예를 훼손하는 방식으로 영상을 사용하지 않습니다.</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">제8조 (분쟁 해결)</div>
    <div class="article-content">
      본 동의서와 관련하여 분쟁이 발생한 경우, 양 당사자는 상호 협의하여 해결하며,
      협의가 이루어지지 않을 경우 대한민국 법률에 따라 관할 법원에서 해결합니다.
    </div>
  </div>

  <div class="confirmation-section">
    <div class="confirmation-title">확인 사항 (체크 필수)</div>
    <div class="confirmation-item">
      <div class="checkbox"></div>
      <div>영상 2차 활용 기간은 영상 완료일로부터 1년이며, 기간 만료 후에는 신규 업로드 및 상업적 사용이 금지됨을 확인합니다.</div>
    </div>
    <div class="confirmation-item">
      <div class="checkbox"></div>
      <div>SNS에 게시된 영상은 삭제 의무가 없으나, Meta 광고(Facebook/Instagram 광고)에는 활용할 수 없으며, 위반 시 2차 활용료가 발생함을 확인합니다.</div>
    </div>
    <div class="confirmation-item">
      <div class="checkbox"></div>
      <div>회사(크넥)는 영상 완료일로부터 6개월간만 영상 원본을 보관하며, 이후 삭제됨을 확인합니다.</div>
    </div>
  </div>

  <div style="text-align: center; margin-top: 40px; font-size: 14px; color: #6b7280;">
    동의일: ${consentDate}
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">[회사 (갑)]</div>
      <div class="signature-row">
        <div class="signature-label">회사명:</div>
        <div class="signature-value">주식회사 하우파파</div>
      </div>
      <div class="signature-row">
        <div class="signature-label">대표자:</div>
        <div class="signature-value">박현용</div>
      </div>
      <div class="signature-row">
        <div class="signature-label">사업자번호:</div>
        <div class="signature-value">575-81-02253</div>
      </div>
      <div class="signature-row">
        <div class="signature-label">주소:</div>
        <div class="signature-value">서울 중구 퇴계로36길 2 동국대학교 충무로 영상센터 1009호</div>
      </div>
      <div class="stamp-area">
        <div class="company-stamp">
          <div class="stamp-text">
            <span>하</span><span>주</span>
            <span>우</span><span>식</span>
            <span>파</span><span>회</span>
            <span>파</span><span>사</span>
          </div>
        </div>
      </div>
    </div>

    <div class="signature-box">
      <div class="signature-title">[크리에이터 (을)]</div>
      <div class="signature-row">
        <div class="signature-label">크리에이터명:</div>
        <div class="signature-value" id="signer-name">${creatorName || '___________________________'}</div>
      </div>
      <div class="signature-row">
        <div class="signature-label">채널명:</div>
        <div class="signature-value" id="signer-channel">${channelName || '___________________________'}</div>
      </div>
      <div class="signer-signature-area" id="signer-signature">
        서명란
      </div>
    </div>
  </div>

  <div class="footer">
    <p>본 동의서는 전자문서 및 전자거래 기본법에 따라 전자적 형태로 작성되었으며, 법적 효력을 가집니다.</p>
    <p style="margin-top: 10px;">주식회사 하우파파 | 대표 박현용 | 사업자등록번호 575-81-02253</p>
    <p>서울 중구 퇴계로36길 2 동국대학교 충무로 영상센터 1009호</p>
    <p>&copy; ${new Date().getFullYear()} HOWPAPA Inc. All rights reserved.</p>
  </div>
</body>
</html>
  `
}
