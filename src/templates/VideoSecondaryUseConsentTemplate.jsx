/**
 * 영상 2차 활용 동의서 템플릿
 * 크리에이터가 캠페인 지원 시 이미 동의한 내용을 기반으로 한 통보형 동의서
 * 한국/일본/미국 리전별 언어 지원
 */
export const VideoSecondaryUseConsentTemplate = (data) => {
  const {
    creatorName = '',
    channelName = '',
    snsUploadUrl = '',
    campaignTitle = '',
    companyName = '',
    videoCompletionDate = '',
    consentDate = new Date().toLocaleDateString('ko-KR'),
    region = 'korea',
  } = data

  // 리전별 로케일 설정
  const localeMap = {
    korea: 'ko-KR',
    japan: 'ja-JP',
    us: 'en-US',
  }
  const locale = localeMap[region] || 'ko-KR'
  const lang = region === 'japan' ? 'ja' : region === 'us' ? 'en' : 'ko'

  // 동의일 기준 날짜 계산
  const completionDate = consentDate ? new Date(consentDate.replace(/\./g, '-').replace(/\s/g, '')) : (videoCompletionDate ? new Date(videoCompletionDate) : new Date())
  // consentDate가 한국어 형식(예: 2026. 2. 20.)이면 파싱 실패할 수 있으므로 fallback
  const baseDate = isNaN(completionDate.getTime()) ? new Date() : completionDate

  const expiryDate = new Date(baseDate)
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)
  const expiryDateStr = expiryDate.toLocaleDateString(locale)

  // 6개월 후 날짜 (영상 보관 기한)
  const retentionDate = new Date(baseDate)
  retentionDate.setMonth(retentionDate.getMonth() + 6)
  const retentionDateStr = retentionDate.toLocaleDateString(locale)

  const consentDateStr = consentDate || baseDate.toLocaleDateString(locale)

  // 채널명: SNS 업로드 URL이 있으면 사용, 없으면 channelName
  const displayChannel = snsUploadUrl || channelName || ''

  // 리전별 텍스트
  const t = getTranslations(region)

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: ${region === 'japan' ? "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" : region === 'us' ? "'Helvetica Neue', Arial, sans-serif" : "'Malgun Gothic', '맑은 고딕', sans-serif"};
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
    }
    .signature-box {
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
    .signature-table {
      display: table;
      width: 100%;
    }
    .signature-info {
      display: table-cell;
      vertical-align: middle;
    }
    .signature-seal {
      display: table-cell;
      width: 110px;
      vertical-align: middle;
      text-align: center;
    }
    .signature-seal img {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }
    .notice-section {
      margin-top: 40px;
      padding: 20px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
    }
    .notice-title {
      font-weight: bold;
      color: #0369a1;
      margin-bottom: 15px;
      font-size: 15px;
    }
    .notice-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 12px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    .notice-bullet {
      color: #0284c7;
      font-weight: bold;
      flex-shrink: 0;
      margin-top: 1px;
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
    <h1>${t.title}</h1>
    <p>${t.subtitle}</p>
  </div>

  <div class="info-section">
    <div class="info-title">${t.basicInfo}</div>
    <div class="info-row">
      <div class="info-label">${t.creatorNameLabel}</div>
      <div class="info-value">${creatorName || '___________________________'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t.channelLabel}</div>
      <div class="info-value">${displayChannel || '___________________________'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t.campaignLabel}</div>
      <div class="info-value">${campaignTitle || '___________________________'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t.advertiserLabel}</div>
      <div class="info-value">${companyName || '___________________________'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t.consentDateLabel}</div>
      <div class="info-value">${consentDateStr}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t.consentPeriodLabel}</div>
      <div class="info-value">${consentDateStr} ~ ${expiryDateStr} ${t.oneYear}</div>
    </div>
  </div>

  <div class="article">
    <div class="article-title">${t.article1Title}</div>
    <div class="article-content">
      ${t.article1Content}
    </div>
  </div>

  <div class="article">
    <div class="article-title">${t.article2Title}</div>
    <div class="article-content">
      <ol>
        <li>${t.article2Item1}
          <ol type="a" style="margin-top: 5px;">
            <li>${t.article2Sub1}</li>
            <li>${t.article2Sub2}</li>
            <li>${t.article2Sub3}</li>
            <li>${t.article2Sub4}</li>
          </ol>
        </li>
        <li>${t.article2Item2}</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">${t.article3Title}</div>
    <div class="article-content">
      <ol>
        <li>${t.article3Item1(consentDateStr)}</li>
        <li>${t.article3Item2(consentDateStr, expiryDateStr)}</li>
        <li>${t.article3Item3}</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">${t.article4Title}</div>
    <div class="article-content">
      <ol>
        <li>${t.article4Item1}</li>
        <li>${t.article4Item2(consentDateStr, retentionDateStr)}</li>
        <li>${t.article4Item3}</li>
        <li>${t.article4Item4}</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">${t.article5Title}</div>
    <div class="article-content">
      <ol>
        <li>${t.article5Item1}
          <ol type="a" style="margin-top: 5px;">
            <li>${t.article5Sub1}</li>
            <li>${t.article5Sub2}</li>
            <li>${t.article5Sub3}</li>
          </ol>
        </li>
        <li>${t.article5Item2}</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">${t.article6Title}</div>
    <div class="article-content">
      <ol>
        <li>${t.article6Item1}</li>
        <li>${t.article6Item2(consentDateStr, expiryDateStr)}</li>
        <li>${t.article6Item3}</li>
      </ol>
    </div>
  </div>

  <div class="warning-box">
    <strong>${t.warningLabel}</strong> ${t.warningContent(consentDateStr, expiryDateStr)}
  </div>

  <div class="article">
    <div class="article-title">${t.article7Title}</div>
    <div class="article-content">
      <ol>
        <li>${t.article7Item1}</li>
        <li>${t.article7Item2}</li>
        <li>${t.article7Item3}</li>
      </ol>
    </div>
  </div>

  <div class="article">
    <div class="article-title">${t.article8Title}</div>
    <div class="article-content">
      ${t.article8Content}
    </div>
  </div>

  <div class="notice-section">
    <div class="notice-title">${t.noticeTitle}</div>
    <div class="notice-item">
      <div class="notice-bullet">•</div>
      <div>${t.notice1(consentDateStr)}</div>
    </div>
    <div class="notice-item">
      <div class="notice-bullet">•</div>
      <div>${t.notice2}</div>
    </div>
    <div class="notice-item">
      <div class="notice-bullet">•</div>
      <div>${t.notice3}</div>
    </div>
    <div class="notice-item">
      <div class="notice-bullet">•</div>
      <div>${t.notice4}</div>
    </div>
  </div>

  <div style="text-align: center; margin-top: 40px; font-size: 14px; color: #6b7280;">
    ${t.consentDateFooter}: ${consentDateStr}
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">${t.companySection}</div>
      <div class="signature-table">
        <div class="signature-info">
          <div class="signature-row">
            <div class="signature-label">${t.companyNameLabel}:</div>
            <div class="signature-value">${t.companyNameValue}</div>
          </div>
          <div class="signature-row">
            <div class="signature-label">${t.ceoLabel}:</div>
            <div class="signature-value">${t.ceoValue}</div>
          </div>
          <div class="signature-row">
            <div class="signature-label">${t.bizRegLabel}:</div>
            <div class="signature-value">575-81-02253</div>
          </div>
          <div class="signature-row">
            <div class="signature-label">${t.addressLabel}:</div>
            <div class="signature-value">${t.addressValue}</div>
          </div>
        </div>
        <div class="signature-seal">
          <img src="/company-seal.png" alt="${t.sealAlt}" />
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>${t.footerLine1}</p>
    <p style="margin-top: 10px;">${t.footerLine2}</p>
    <p>${t.footerLine3}</p>
    <p>&copy; ${new Date().getFullYear()} HOWPAPA Inc. All rights reserved.</p>
  </div>
</body>
</html>
  `
}

/**
 * 리전별 번역 텍스트 반환
 */
function getTranslations(region) {
  if (region === 'japan') {
    return {
      title: '映像二次利用同意書',
      subtitle: 'Video Secondary Usage Consent Form',
      basicInfo: '基本情報',
      creatorNameLabel: 'クリエイター名',
      channelLabel: 'チャンネル',
      campaignLabel: 'キャンペーン名',
      advertiserLabel: '広告主',
      consentDateLabel: '二次利用同意日',
      consentPeriodLabel: '二次利用期間',
      oneYear: '(1年間)',
      article1Title: '第1条（同意の目的）',
      article1Content: '本同意書は、クリエイター（以下「クリエイター」）がキャンペーン応募時に同意した映像コンテンツの二次利用について、株式会社ハウパパ（以下「会社」）が広告主に当該映像を提供し活用できるようにする具体的な条件を明示するものです。',
      article2Title: '第2条（二次利用の範囲）',
      article2Item1: '会社はクリエイターが制作した映像を広告主に提供し、以下の目的で活用することができます。',
      article2Sub1: '国内外のオンラインマーケティング（ウェブサイト、バナー、ランディングページ等）',
      article2Sub2: '国内外のオフラインマーケティング（店舗ディスプレイ、展示、印刷物等）',
      article2Sub3: '国内外のSNSチャンネル（Instagram、YouTube、TikTok等）',
      article2Sub4: 'その他広告およびプロモーション目的',
      article2Item2: '活用可能なチャンネルは<span class="highlight">国内外すべてのマーケティングチャンネル</span>を含みます。',
      article3Title: '第3条（二次利用期間）',
      article3Item1: (consentDateStr) => `映像の二次利用期間は<span class="highlight">二次利用同意日（${consentDateStr}）から1年間</span>有効です。`,
      article3Item2: (consentDateStr, expiryDateStr) => `利用期間：${consentDateStr} ~ ${expiryDateStr}`,
      article3Item3: '期間満了後に二次利用の延長が必要な場合、会社とクリエイター間で別途協議の上進行します。',
      article4Title: '第4条（会社の映像保管）',
      article4Item1: '会社はクリエイターが制作した映像原本を<span class="highlight">二次利用同意日から6ヶ月間</span>保管します。',
      article4Item2: (consentDateStr, retentionDateStr) => `保管期限：${consentDateStr} ~ ${retentionDateStr}`,
      article4Item3: '保管期限経過後、会社は保管中の映像原本を削除します。',
      article4Item4: '保管期限内に広告主が映像を受領し直接管理することを原則とします。',
      article5Title: '第5条（利用期間満了後の制限）',
      article5Item1: '二次利用期間（1年）満了後、広告主および会社は当該映像を以下のように制限します。',
      article5Sub1: '新規アップロードまたは再アップロードの禁止',
      article5Sub2: '商業的広告目的での使用禁止',
      article5Sub3: '編集、再加工等による新しいコンテンツ制作の禁止',
      article5Item2: '期間満了後も活用が必要な場合、クリエイターと別途協議の上、二次利用料を支払う必要があります。',
      article6Title: '第6条（SNS投稿の例外条項）',
      article6Item1: 'クリエイターが自身のSNSアカウントにアップロードした映像は、二次利用期間満了後も<span class="highlight">削除義務がなく、継続して掲載</span>することができます。',
      article6Item2: (consentDateStr, expiryDateStr) => `ただし、クリエイターのSNSに掲載された映像をMeta広告（Facebook/Instagram広告）に活用する場合、<span class="highlight">二次利用同意日（${consentDateStr}）以降1年間（${consentDateStr} ~ ${expiryDateStr}）</span>使用可能です。`,
      article6Item3: '<span class="highlight">二次利用期間（1年）満了後</span>、広告主または第三者がクリエイターのSNS投稿をMeta広告に無断利用した場合、別途の二次利用料が発生し、これは会社（CNEC）を通じて協議します。',
      warningLabel: '重要案内：',
      warningContent: (consentDateStr, expiryDateStr) => `Meta広告（Facebook/Instagram広告）にクリエイターの映像を活用する場合、<span class="highlight">二次利用同意日（${consentDateStr}）以降1年間（${consentDateStr} ~ ${expiryDateStr}）</span>使用可能です。1年経過後の活用には、必ず事前に別途の二次利用同意および追加費用の協議が必要であり、無断利用の場合は二次利用料が請求されます。これは株式会社ハウパパ（CNEC）を通じて協議されます。`,
      article7Title: '第7条（著作権および肖像権）',
      article7Item1: '映像コンテンツの著作権はクリエイターに帰属します。',
      article7Item2: '会社および広告主は本同意書に明示された範囲内でのみ映像を活用することができます。',
      article7Item3: '会社および広告主はクリエイターの名誉を毀損する方法で映像を使用しません。',
      article8Title: '第8条（紛争解決）',
      article8Content: '本同意書に関して紛争が発生した場合、両当事者は相互協議により解決し、協議が成立しない場合は日本国の法律に従い管轄裁判所にて解決します。',
      noticeTitle: 'ご案内事項',
      notice1: (consentDateStr) => `映像の二次利用期間は二次利用同意日（${consentDateStr}）から1年間であり、期間満了後は新規アップロードおよび商業的使用が禁止されます。`,
      notice2: 'SNSに掲載された映像は削除義務がありませんが、Meta広告（Facebook/Instagram広告）は二次利用同意日以降1年間のみ使用可能であり、1年経過後の無断利用の場合は二次利用料が発生します。',
      notice3: '会社（CNEC）は二次利用同意日から6ヶ月間のみ映像原本を保管し、その後削除されます。',
      notice4: '本同意はキャンペーン応募時にクリエイターが事前同意した内容に基づいています。',
      consentDateFooter: '二次利用同意日',
      companySection: '【会社】',
      companyNameLabel: '会社名',
      companyNameValue: '株式会社ハウパパ',
      ceoLabel: '代表者',
      ceoValue: 'パク・ヒョンヨン',
      bizRegLabel: '事業者番号',
      addressLabel: '住所',
      addressValue: 'ソウル特別市中区退渓路36ギル2 東国大学校忠武路映像センター1009号',
      sealAlt: '法人印',
      footerLine1: '本同意書はキャンペーン応募時のクリエイターの事前同意に基づいて作成されました。',
      footerLine2: '株式会社ハウパパ | 代表 パク・ヒョンヨン | 事業者登録番号 575-81-02253',
      footerLine3: 'ソウル特別市中区退渓路36ギル2 東国大学校忠武路映像センター1009号',
    }
  }

  if (region === 'us') {
    return {
      title: 'Video Secondary Usage Consent Form',
      subtitle: '영상 2차 활용 동의서',
      basicInfo: 'Basic Information',
      creatorNameLabel: 'Creator Name',
      channelLabel: 'Channel',
      campaignLabel: 'Campaign',
      advertiserLabel: 'Advertiser',
      consentDateLabel: 'Consent Date',
      consentPeriodLabel: 'Usage Period',
      oneYear: '(1 Year)',
      article1Title: 'Article 1 (Purpose of Consent)',
      article1Content: 'This consent form specifies the conditions under which HOWPAPA Inc. (hereinafter "the Company") may provide the video content to the advertiser for secondary use, based on the creator\'s (hereinafter "the Creator") prior consent given at the time of campaign application.',
      article2Title: 'Article 2 (Scope of Secondary Use)',
      article2Item1: 'The Company may provide the video produced by the Creator to the advertiser for the following purposes:',
      article2Sub1: 'Domestic and international online marketing (websites, banners, landing pages, etc.)',
      article2Sub2: 'Domestic and international offline marketing (store displays, exhibitions, printed materials, etc.)',
      article2Sub3: 'Domestic and international SNS channels (Instagram, YouTube, TikTok, etc.)',
      article2Sub4: 'Other advertising and promotional purposes',
      article2Item2: 'Available channels include <span class="highlight">all domestic and international marketing channels</span>.',
      article3Title: 'Article 3 (Secondary Usage Period)',
      article3Item1: (consentDateStr) => `The video secondary usage period is valid for <span class="highlight">one (1) year from the consent date (${consentDateStr})</span>.`,
      article3Item2: (consentDateStr, expiryDateStr) => `Usage period: ${consentDateStr} ~ ${expiryDateStr}`,
      article3Item3: 'If an extension of secondary usage is required after the expiration, it shall be arranged through separate consultation between the Company and the Creator.',
      article4Title: 'Article 4 (Video Retention by Company)',
      article4Item1: 'The Company shall retain the original video produced by the Creator for <span class="highlight">six (6) months from the consent date</span>.',
      article4Item2: (consentDateStr, retentionDateStr) => `Retention period: ${consentDateStr} ~ ${retentionDateStr}`,
      article4Item3: 'After the retention period, the Company shall delete the original video in its possession.',
      article4Item4: 'The advertiser is expected to receive and manage the video directly within the retention period.',
      article5Title: 'Article 5 (Restrictions After Expiration)',
      article5Item1: 'After the expiration of the secondary usage period (1 year), the advertiser and the Company shall restrict the use of the video as follows:',
      article5Sub1: 'No new uploads or re-uploads',
      article5Sub2: 'No use for commercial advertising purposes',
      article5Sub3: 'No creation of new content through editing or reprocessing',
      article5Item2: 'If usage is required after the expiration, a separate agreement must be made with the Creator and secondary usage fees must be paid.',
      article6Title: 'Article 6 (SNS Post Exception)',
      article6Item1: 'Videos uploaded by the Creator to their own SNS accounts <span class="highlight">are not subject to deletion and may remain posted</span> after the secondary usage period expires.',
      article6Item2: (consentDateStr, expiryDateStr) => `However, if videos posted on the Creator's SNS are used for Meta Ads (Facebook/Instagram Ads), they may be used for <span class="highlight">one (1) year from the consent date (${consentDateStr}) to ${expiryDateStr}</span>.`,
      article6Item3: '<span class="highlight">After the secondary usage period (1 year) expires</span>, if the advertiser or third parties use the Creator\'s SNS posts for Meta Ads without authorization, additional secondary usage fees will apply, which shall be negotiated through the Company (CNEC).',
      warningLabel: 'Important Notice:',
      warningContent: (consentDateStr, expiryDateStr) => `When using Creator videos for Meta Ads (Facebook/Instagram Ads), they may be used for <span class="highlight">one (1) year from the consent date (${consentDateStr}) to ${expiryDateStr}</span>. After 1 year, a separate secondary usage agreement and additional cost negotiation are required prior to use. Unauthorized use will result in secondary usage fee charges, negotiated through HOWPAPA Inc. (CNEC).`,
      article7Title: 'Article 7 (Copyright and Portrait Rights)',
      article7Item1: 'The copyright of the video content belongs to the Creator.',
      article7Item2: 'The Company and advertiser may only use the video within the scope specified in this consent form.',
      article7Item3: 'The Company and advertiser shall not use the video in a manner that damages the Creator\'s reputation.',
      article8Title: 'Article 8 (Dispute Resolution)',
      article8Content: 'In the event of a dispute related to this consent form, both parties shall resolve it through mutual consultation. If consultation fails, the dispute shall be resolved in accordance with the laws of the Republic of Korea at the competent court.',
      noticeTitle: 'Notice',
      notice1: (consentDateStr) => `The video secondary usage period is one (1) year from the consent date (${consentDateStr}). After expiration, new uploads and commercial use are prohibited.`,
      notice2: 'Videos posted on SNS are not subject to mandatory deletion. However, Meta Ads (Facebook/Instagram Ads) may only be used for 1 year from the consent date. Unauthorized use after 1 year will incur secondary usage fees.',
      notice3: 'The Company (CNEC) retains the original video for 6 months from the consent date only, after which it will be deleted.',
      notice4: 'This consent is based on the Creator\'s prior agreement given at the time of campaign application.',
      consentDateFooter: 'Consent Date',
      companySection: '[Company]',
      companyNameLabel: 'Company',
      companyNameValue: 'HOWPAPA Inc.',
      ceoLabel: 'CEO',
      ceoValue: 'Hyunyong Park',
      bizRegLabel: 'Biz Reg No.',
      addressLabel: 'Address',
      addressValue: '#1009, Chungmuro Image Center, Dongguk Univ., 2 Toegye-ro 36-gil, Jung-gu, Seoul, Korea',
      sealAlt: 'Company Seal',
      footerLine1: 'This consent form was prepared based on the Creator\'s prior consent at the time of campaign application.',
      footerLine2: 'HOWPAPA Inc. | CEO Hyunyong Park | Biz Reg No. 575-81-02253',
      footerLine3: '#1009, Chungmuro Image Center, Dongguk Univ., 2 Toegye-ro 36-gil, Jung-gu, Seoul, Korea',
    }
  }

  // 한국 (기본)
  return {
    title: '영상 2차 활용 동의서',
    subtitle: 'Video Secondary Usage Consent Form',
    basicInfo: '기본 정보',
    creatorNameLabel: '크리에이터명',
    channelLabel: '채널',
    campaignLabel: '캠페인명',
    advertiserLabel: '광고주',
    consentDateLabel: '2차 활용 동의일',
    consentPeriodLabel: '2차 활용 기간',
    oneYear: '(1년)',
    article1Title: '제1조 (동의 목적)',
    article1Content: '본 동의서는 크리에이터(이하 "크리에이터")가 캠페인 지원 시 동의한 영상 콘텐츠의 2차 활용에 대해, 주식회사 하우파파(이하 "회사")가 광고주에게 해당 영상을 제공하여 활용할 수 있도록 하는 구체적인 조건을 명시합니다.',
    article2Title: '제2조 (2차 활용 범위)',
    article2Item1: '회사는 크리에이터가 제작한 영상을 광고주에게 제공하여 다음과 같은 목적으로 활용할 수 있습니다.',
    article2Sub1: '국내외 온라인 마케팅 (웹사이트, 배너, 랜딩페이지 등)',
    article2Sub2: '국내외 오프라인 마케팅 (매장 디스플레이, 전시, 인쇄물 등)',
    article2Sub3: '국내외 SNS 채널 (인스타그램, 유튜브, 틱톡 등)',
    article2Sub4: '기타 광고 및 프로모션 목적',
    article2Item2: '활용 가능한 채널은 <span class="highlight">국내외 모든 마케팅 채널</span>을 포함합니다.',
    article3Title: '제3조 (2차 활용 기간)',
    article3Item1: (consentDateStr) => `영상 2차 활용 기간은 <span class="highlight">2차 활용 동의일(${consentDateStr})로부터 1년간</span> 유효합니다.`,
    article3Item2: (consentDateStr, expiryDateStr) => `활용 기간: ${consentDateStr} ~ ${expiryDateStr}`,
    article3Item3: '기간 만료 후 2차 활용 연장이 필요한 경우, 회사와 크리에이터 간 별도 협의 후 진행합니다.',
    article4Title: '제4조 (회사의 영상 보관)',
    article4Item1: '회사는 크리에이터가 제작한 영상 원본을 <span class="highlight">2차 활용 동의일로부터 6개월간</span> 보관합니다.',
    article4Item2: (consentDateStr, retentionDateStr) => `보관 기한: ${consentDateStr} ~ ${retentionDateStr}`,
    article4Item3: '보관 기한 경과 후, 회사는 보관 중인 영상 원본을 삭제합니다.',
    article4Item4: '보관 기한 내에 광고주가 영상을 전달받아 직접 관리하는 것을 원칙으로 합니다.',
    article5Title: '제5조 (활용 기간 만료 후 제한)',
    article5Item1: '2차 활용 기간(1년) 만료 후, 광고주 및 회사는 해당 영상을 다음과 같이 제한합니다.',
    article5Sub1: '신규 업로드 또는 재업로드 금지',
    article5Sub2: '상업적 광고 목적으로의 사용 금지',
    article5Sub3: '편집, 재가공 등을 통한 새로운 콘텐츠 제작 금지',
    article5Item2: '기간 만료 후에도 활용이 필요한 경우, 크리에이터와 별도 협의하여 2차 활용료를 지급해야 합니다.',
    article6Title: '제6조 (SNS 게시물 예외 조항)',
    article6Item1: '크리에이터가 자신의 SNS 계정에 업로드한 영상은 2차 활용 기간 만료 후에도 <span class="highlight">삭제 의무가 없으며 계속 게시</span>할 수 있습니다.',
    article6Item2: (consentDateStr, expiryDateStr) => `단, 크리에이터의 SNS에 게시된 영상을 Meta 광고(Facebook/Instagram 광고)에 활용하는 경우, <span class="highlight">2차 활용 동의일(${consentDateStr}) 이후 1년간(${consentDateStr} ~ ${expiryDateStr})</span> 사용 가능합니다.`,
    article6Item3: '<span class="highlight">2차 활용 기간(1년) 만료 후</span>, 광고주 또는 제3자가 크리에이터의 SNS 게시물을 Meta 광고에 무단 활용한 것이 발견될 경우, 별도의 2차 활용료가 발생하며 이는 회사(크넥)를 통해 협의합니다.',
    warningLabel: '중요 안내:',
    warningContent: (consentDateStr, expiryDateStr) => `Meta 광고(Facebook/Instagram 광고)에 크리에이터 영상을 활용하는 경우, <span class="highlight">2차 활용 동의일(${consentDateStr}) 이후 1년간(${consentDateStr} ~ ${expiryDateStr})</span> 사용 가능합니다. 1년 경과 후 활용 시에는 반드시 사전에 별도 2차 활용 동의 및 추가 비용 협의가 필요하며, 무단 활용 시 2차 활용료가 청구됩니다. 이는 주식회사 하우파파(크넥)를 통해 협의됩니다.`,
    article7Title: '제7조 (저작권 및 초상권)',
    article7Item1: '영상 콘텐츠의 저작권은 크리에이터에게 귀속됩니다.',
    article7Item2: '회사 및 광고주는 본 동의서에 명시된 범위 내에서만 영상을 활용할 수 있습니다.',
    article7Item3: '회사 및 광고주는 크리에이터의 명예를 훼손하는 방식으로 영상을 사용하지 않습니다.',
    article8Title: '제8조 (분쟁 해결)',
    article8Content: '본 동의서와 관련하여 분쟁이 발생한 경우, 양 당사자는 상호 협의하여 해결하며, 협의가 이루어지지 않을 경우 대한민국 법률에 따라 관할 법원에서 해결합니다.',
    noticeTitle: '안내 사항',
    notice1: (consentDateStr) => `영상 2차 활용 기간은 2차 활용 동의일(${consentDateStr})로부터 1년이며, 기간 만료 후에는 신규 업로드 및 상업적 사용이 금지됩니다.`,
    notice2: 'SNS에 게시된 영상은 삭제 의무가 없으나, Meta 광고(Facebook/Instagram 광고)는 2차 활용 동의일 이후 1년간만 사용 가능하며, 1년 경과 후 무단 활용 시 2차 활용료가 발생합니다.',
    notice3: '회사(크넥)는 2차 활용 동의일로부터 6개월간만 영상 원본을 보관하며, 이후 삭제됩니다.',
    notice4: '본 동의는 캠페인 지원 시 크리에이터가 사전 동의한 내용에 기반합니다.',
    consentDateFooter: '2차 활용 동의일',
    companySection: '[회사]',
    companyNameLabel: '회사명',
    companyNameValue: '주식회사 하우파파',
    ceoLabel: '대표자',
    ceoValue: '박현용',
    bizRegLabel: '사업자번호',
    addressLabel: '주소',
    addressValue: '서울 중구 퇴계로36길 2 동국대학교 충무로 영상센터 1009호',
    sealAlt: '법인인감',
    footerLine1: '본 동의서는 캠페인 지원 시 크리에이터의 사전 동의에 기반하여 작성되었습니다.',
    footerLine2: '주식회사 하우파파 | 대표 박현용 | 사업자등록번호 575-81-02253',
    footerLine3: '서울 중구 퇴계로36길 2 동국대학교 충무로 영상센터 1009호',
  }
}
