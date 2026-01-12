/**
 * 캠페인 가이드 템플릿 데이터
 * 국가별 뷰티 카테고리 스타일 템플릿 (한국/미국/일본 각 10개)
 * 카테고리별 맞춤형 장면/대사 포함
 */

// 제품 카테고리
export const PRODUCT_CATEGORIES = [
  { id: 'skincare', label: '스킨케어', labelEn: 'Skincare', labelJa: 'スキンケア' },
  { id: 'makeup', label: '메이크업', labelEn: 'Makeup', labelJa: 'メイクアップ' },
  { id: 'haircare', label: '헤어케어', labelEn: 'Haircare', labelJa: 'ヘアケア' },
  { id: 'bodycare', label: '바디케어', labelEn: 'Bodycare', labelJa: 'ボディケア' },
  { id: 'fragrance', label: '향수', labelEn: 'Fragrance', labelJa: 'フレグランス' },
  { id: 'nail', label: '네일', labelEn: 'Nail', labelJa: 'ネイル' },
  { id: 'tool', label: '뷰티 도구', labelEn: 'Beauty Tools', labelJa: 'ビューティーツール' },
]

// 카테고리별 맞춤 장면/대사 (한국)
export const CATEGORY_SCENES_KR = {
  skincare: {
    scenes: ['세안 후 맨 얼굴 상태 보여주기', '토너/에센스 바르는 과정', '제품 텍스처 클로즈업', '흡수되는 과정', '피부 결과 보여주기'],
    dialogues: ['세안 후 피부 상태에요', '이 제품 텍스처가 정말 좋아요', '흡수력이 대박이에요', '피부가 확실히 촉촉해졌죠?', '매일 쓰고 있는 이유예요'],
  },
  makeup: {
    scenes: ['베이스 바르기 전 피부', '파운데이션/쿠션 적용', '포인트 메이크업', '전체 완성 룩', '클로즈업 마무리'],
    dialogues: ['오늘의 메이크업 시작해볼게요', '커버력이 이 정도예요', '자연스러운 발색 보이시죠?', '완성된 모습이에요', '하루종일 무너짐 없이 유지돼요'],
  },
  haircare: {
    scenes: ['샴푸 전 머릿결 상태', '샴푸/린스 사용 과정', '드라이 과정', '스타일링 전후 비교', '완성된 헤어'],
    dialogues: ['원래 제 머릿결이에요', '거품이 풍성하게 나요', '향이 정말 좋아요', '건조 후 확실히 달라요', '윤기가 살아났어요'],
  },
  bodycare: {
    scenes: ['바디 제품 텍스처', '바르는 모습', '흡수되는 과정', '촉촉해진 피부', '향에 대한 반응'],
    dialogues: ['바디 케어 루틴이에요', '발림성이 정말 좋아요', '끈적임 없이 흡수돼요', '피부가 부드러워졌어요', '향이 오래 가요'],
  },
  fragrance: {
    scenes: ['향수병 디자인 보여주기', '손목에 뿌리기', '향 맡는 모습', '지속력 테스트', '어울리는 상황 설명'],
    dialogues: ['오늘 소개할 향수예요', '탑노트는 이런 느낌이에요', '시간이 지나면 이렇게 변해요', '하루종일 은은하게 남아요', '데일리로 딱이에요'],
  },
  nail: {
    scenes: ['베이스 코트', '컬러 1차 도포', '컬러 2차 도포', '탑코트', '완성된 네일'],
    dialogues: ['네일 시작해볼게요', '발색이 정말 예뻐요', '두 번 바르니까 더 선명해요', '광택이 살아요', '완성! 어때요?'],
  },
  tool: {
    scenes: ['도구 소개 및 외관', '사용 방법 시연', '효과 보여주기', '비교 장면', '총평'],
    dialogues: ['오늘 소개할 뷰티템이에요', '이렇게 사용하면 돼요', '효과가 바로 보이죠?', '기존 제품과 비교해볼게요', '가성비 최고예요'],
  },
}

// 카테고리별 맞춤 장면/대사 (미국)
export const CATEGORY_SCENES_US = {
  skincare: {
    scenes: ['Clean face before application', 'Applying serum/moisturizer', 'Texture close-up', 'Absorption process', 'Final skin results'],
    dialogues: ['Starting with clean skin', 'Look at this texture!', 'It absorbs so quickly', 'My skin feels amazing', 'This is why I love it'],
  },
  makeup: {
    scenes: ['Bare face before makeup', 'Foundation application', 'Eye/lip makeup', 'Full look reveal', 'Close-up finish'],
    dialogues: ['Let\'s do my makeup', 'The coverage is insane', 'Look at that color payoff', 'Here\'s the final look', 'Still perfect after 8 hours'],
  },
  haircare: {
    scenes: ['Hair before treatment', 'Applying product', 'Styling process', 'Before/after comparison', 'Final results'],
    dialogues: ['This is my hair before', 'The product smells amazing', 'So easy to work with', 'Look at the difference!', 'So shiny and smooth'],
  },
  bodycare: {
    scenes: ['Product texture', 'Application on skin', 'Absorption demo', 'Skin results', 'Scent reaction'],
    dialogues: ['Body care routine time', 'The texture is so luxurious', 'Absorbs without being greasy', 'My skin is so soft now', 'The scent is heavenly'],
  },
  fragrance: {
    scenes: ['Bottle design', 'Spraying on wrist', 'Smelling reaction', 'Longevity test', 'When to wear it'],
    dialogues: ['This fragrance is everything', 'Opening notes are amazing', 'It develops beautifully', 'Still smelling great hours later', 'Perfect for everyday'],
  },
  nail: {
    scenes: ['Base coat', 'First color coat', 'Second coat', 'Top coat', 'Final nails'],
    dialogues: ['Nail time!', 'This color is gorgeous', 'Building up the color', 'Adding shine', 'How cute are these?'],
  },
  tool: {
    scenes: ['Tool introduction', 'How to use demo', 'Results shown', 'Comparison', 'Final thoughts'],
    dialogues: ['Check out this tool', 'Here\'s how you use it', 'Look at these results!', 'Way better than my old one', 'Total game changer'],
  },
}

// 카테고리별 맞춤 장면/대사 (일본)
export const CATEGORY_SCENES_JP = {
  skincare: {
    scenes: ['洗顔後の素肌', '化粧水・美容液を塗る', 'テクスチャーのアップ', '浸透していく様子', '仕上がりの肌'],
    dialogues: ['洗顔後の肌です', 'テクスチャーがとても良いです', 'すっと浸透しますね', '肌がもちもちになりました', '毎日使っている理由です'],
  },
  makeup: {
    scenes: ['ベースメイク前の肌', 'ファンデーション塗布', 'ポイントメイク', '完成したルック', 'アップで仕上がり'],
    dialogues: ['今日のメイクを始めます', 'カバー力はこんな感じです', '発色が綺麗ですね', '完成しました', '一日中崩れませんでした'],
  },
  haircare: {
    scenes: ['シャンプー前の髪', 'シャンプー・トリートメント使用', 'ドライの様子', 'ビフォーアフター', '仕上がり'],
    dialogues: ['元の髪質です', '泡立ちが良いです', '香りがとても良いです', '乾かすと全然違います', 'ツヤが出ました'],
  },
  bodycare: {
    scenes: ['製品のテクスチャー', '塗っている様子', '浸透する様子', 'しっとりした肌', '香りへの反応'],
    dialogues: ['ボディケアタイムです', '伸びが良いです', 'べたつかず浸透します', '肌がすべすべになりました', '香りが長続きします'],
  },
  fragrance: {
    scenes: ['香水ボトルのデザイン', '手首につける', '香りを嗅ぐ', '持続力テスト', '使用シーン説明'],
    dialogues: ['今日ご紹介する香水です', 'トップノートはこんな感じ', '時間が経つと変化します', '一日中ふんわり香ります', 'デイリーにぴったりです'],
  },
  nail: {
    scenes: ['ベースコート', '1回目の塗布', '2回目の塗布', 'トップコート', '完成したネイル'],
    dialogues: ['ネイル始めます', '発色がとても綺麗です', '2度塗りで鮮やかに', 'ツヤが出ます', '完成です！いかがですか？'],
  },
  tool: {
    scenes: ['ツールの紹介', '使い方の実演', '効果を見せる', '比較', '総評'],
    dialogues: ['今日ご紹介するアイテムです', 'こうやって使います', '効果がすぐ分かりますね', '以前のものと比較します', 'コスパ最高です'],
  },
}

// 플랫폼
export const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'youtube', label: 'YouTube Shorts', icon: '🎬' },
  { id: 'instagram', label: 'Instagram Reels', icon: '📷' },
]

// 영상 길이
export const VIDEO_DURATIONS = [
  { id: '15s', label: '15초', description: '임팩트 있는 짧은 영상' },
  { id: '30s', label: '30초', description: '핵심 메시지 전달' },
  { id: '60s', label: '60초', description: '상세한 제품 소개' },
  { id: '90s+', label: '90초+', description: '심층 리뷰/튜토리얼' },
]

// 매장 방문 옵션
export const STORE_VISIT_OPTIONS = [
  { id: 'none', label: '방문 없음', labelEn: 'No Visit', labelJa: '訪問なし' },
  { id: 'oliveyoung', label: '올리브영', labelEn: 'Olive Young', labelJa: 'オリーブヤング' },
  { id: 'daiso', label: '다이소', labelEn: 'Daiso', labelJa: 'ダイソー' },
  { id: 'other', label: '기타 매장', labelEn: 'Other Store', labelJa: 'その他店舗' },
]

// 한국 템플릿
export const KOREA_TEMPLATES = [
  {
    id: 'kr_ugc_review',
    type: 'UGC',
    title: 'UGC 스타일 리얼 후기',
    subtitle: 'UGC Style Real Review',
    description: '필터 없는 솔직한 제품 후기로 신뢰도를 높이는 스타일',
    culturalNotes: '한국 소비자는 진정성과 솔직함을 중시합니다. 자연스러운 표현을 선호합니다.',
    toneGuide: '친근하고 직설적인 톤, "이거 진짜 대박!", "솔직히 말해서..." 같은 강조 표현 사용',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '30분~1시간',
    hashtags: ['#솔직후기', '#리얼리뷰', '#뷰티템추천', '#데일리뷰티'],
    defaultScenes: [
      '제품 언박싱/첫인상 반응',
      '제품 텍스처/제형 클로즈업',
      '사용 전 피부 상태',
      '제품 직접 바르는 장면',
      '사용 후 결과 비교',
    ],
    defaultDialogues: [
      '요즘 난리난 이 제품, 진짜인지 써봤어요!',
      '솔직히 처음엔 기대 안 했는데...',
      '근데 이거 보세요, 진짜 다르죠?',
      '제 피부에는 이렇게 나타났어요',
      '결론은? 재구매 100% 할 것 같아요!',
    ],
  },
  {
    id: 'kr_grwm',
    type: 'GRWM',
    title: 'GRWM (같이 준비해요)',
    subtitle: 'Get Ready With Me',
    description: '함께 준비하는 과정을 공유하며 친근감을 형성하는 스타일',
    culturalNotes: '일상을 공유하며 시청자와의 친밀감을 형성합니다. 캐주얼하고 편안한 분위기를 선호합니다.',
    toneGuide: '친구에게 말하듯 편안한 톤, "같이 준비하자!", "오늘 뭐 발라볼까?" 같은 초대 표현',
    platforms: ['youtube', 'tiktok'],
    duration: '60s',
    estimatedTime: '1~2시간',
    hashtags: ['#GRWM', '#같이준비해요', '#모닝루틴', '#데일리메이크업'],
    defaultScenes: [
      '아침 기상 후 세안 장면',
      '스킨케어 루틴 순서대로',
      '제품 사용하는 모습',
      '완성된 모습 보여주기',
      '외출 준비 완료',
    ],
    defaultDialogues: [
      '좋은 아침! 오늘 같이 준비해요~',
      '요즘 빠지면 안 되는 제품이에요',
      '이거 바르면 하루종일 촉촉해요',
      '오늘의 포인트는 여기!',
      '다 됐다! 오늘도 예쁜 하루 보내요~',
    ],
  },
  {
    id: 'kr_transformation',
    type: 'Transformation',
    title: '메이크업 트랜스포메이션',
    subtitle: 'Makeup Transformation',
    description: '극적인 변신을 보여주는 임팩트 있는 스타일',
    culturalNotes: 'Before/After의 극적인 대비를 선호합니다. 빠른 전환과 드라마틱한 효과를 강조합니다.',
    toneGuide: '흥미를 유발하는 톤, "Wait for it!", "The glow up is real!" 같은 기대감 조성',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '1~2시간',
    hashtags: ['#변신', '#메이크업변신', '#비포애프터', '#글로우업'],
    defaultScenes: [
      'Before 상태 (민낯/정리 안 된 모습)',
      '제품 사용 시작',
      '변신 중간 과정',
      '완성 직전 티저',
      'After 완성 공개 (드라마틱하게)',
    ],
    defaultDialogues: [
      '제가 이렇게 바뀔 줄 몰랐죠?',
      '이 제품 하나로 시작합니다',
      '변신 중... 기다려주세요!',
      '거의 다 됐어요!',
      '짜잔! 어때요? 완전 다른 사람 같죠?',
    ],
  },
  {
    id: 'kr_tutorial',
    type: 'Tutorial',
    title: '꿀팁 튜토리얼',
    subtitle: 'Beauty Tips Tutorial',
    description: '실용적인 팁과 노하우를 전달하는 교육적 스타일',
    culturalNotes: '한국 소비자는 실용적인 팁을 좋아합니다. 구체적인 방법과 순서를 명확히 전달해야 합니다.',
    toneGuide: '전문가처럼 신뢰감 있게, "이렇게 하면 훨씬 좋아요", "꿀팁 알려드릴게요"',
    platforms: ['youtube', 'instagram'],
    duration: '60s',
    estimatedTime: '1~2시간',
    hashtags: ['#꿀팁', '#뷰티팁', '#노하우', '#스킨케어팁'],
    defaultScenes: [
      '오늘의 팁 소개',
      '잘못된 방법 vs 올바른 방법',
      '제품 사용법 시연',
      '핵심 포인트 강조',
      '결과 비교 및 정리',
    ],
    defaultDialogues: [
      '이거 몰랐으면 큰일 날 뻔했어요!',
      '많은 분들이 이렇게 하시는데, 사실은...',
      '이 제품은 이렇게 써야 효과가 있어요',
      '핵심은 바로 이거예요!',
      '오늘 팁 도움 됐으면 저장해두세요!',
    ],
  },
  {
    id: 'kr_vlog',
    type: 'Vlog',
    title: '뷰티 일상 브이로그',
    subtitle: 'Beauty Daily Vlog',
    description: '자연스러운 일상 속 제품 사용을 보여주는 스타일',
    culturalNotes: '일상적이고 편안한 분위기를 선호합니다. 광고 느낌보다 자연스러운 노출이 효과적입니다.',
    toneGuide: '친근하고 일상적인 톤, "오늘 하루 같이 보내요~", "요즘 이것만 써요"',
    platforms: ['youtube', 'tiktok'],
    duration: '90s+',
    estimatedTime: '2~3시간',
    hashtags: ['#일상브이로그', '#뷰티브이로그', '#데일리', '#하루일과'],
    defaultScenes: [
      '아침 기상/루틴',
      '외출 준비',
      '낮 활동 중 터치업',
      '저녁 클렌징',
      '취침 전 스킨케어',
    ],
    defaultDialogues: [
      '오늘 하루 같이 보내요~',
      '요즘 매일 쓰는 제품이에요',
      '외출 전에 꼭 이거 챙겨요',
      '하루 종일 지속력 좋았어요',
      '오늘도 수고했어요, 굿나잇!',
    ],
  },
  {
    id: 'kr_unboxing',
    type: 'Unboxing',
    title: '언박싱 & 첫인상',
    subtitle: 'Unboxing & First Impressions',
    description: '새 제품 개봉과 첫 반응을 공유하는 스타일',
    culturalNotes: 'ASMR 요소와 솔직한 첫인상 반응이 인기입니다. 패키징과 디테일에 관심이 많습니다.',
    toneGuide: '설레는 톤, "드디어 왔다!", "포장 너무 예쁘다" 같은 감탄 표현',
    platforms: ['tiktok', 'youtube'],
    duration: '30s',
    estimatedTime: '30분~1시간',
    hashtags: ['#언박싱', '#첫인상', '#신상', '#하울'],
    defaultScenes: [
      '택배 도착/개봉 시작',
      '패키징 ASMR',
      '제품 하나씩 꺼내기',
      '텍스처/향 첫인상',
      '사용해보기 예고',
    ],
    defaultDialogues: [
      '드디어 기다리던 택배가 왔어요!',
      '패키징부터 너무 예쁘지 않나요?',
      '이게 그 유명한 제품이에요',
      '향이... 와... 이거 대박',
      '직접 써보고 다음에 리뷰 들고 올게요!',
    ],
  },
  {
    id: 'kr_weekly_review',
    type: 'Weekly',
    title: '일주일 사용 후기',
    subtitle: 'One Week Review',
    description: '일주일간 사용 후 변화를 기록하는 스타일',
    culturalNotes: '한국 소비자는 장기 사용 후기를 신뢰합니다. 매일의 변화를 기록하면 신뢰도가 높아집니다.',
    toneGuide: '관찰자적 톤, "1일차에는...", "7일차 결과는?" 같은 시간 경과 표현',
    platforms: ['youtube', 'instagram'],
    duration: '60s',
    estimatedTime: '일주일 (촬영 30분/일)',
    hashtags: ['#일주일후기', '#7일챌린지', '#사용후기', '#피부변화'],
    defaultScenes: [
      '1일차 - 제품 소개 및 피부 상태',
      '3일차 - 중간 점검',
      '5일차 - 변화 확인',
      '7일차 - 최종 결과',
      '총평 및 추천',
    ],
    defaultDialogues: [
      '일주일 동안 이 제품만 써봤어요',
      '1일차, 아직 큰 변화는 없어요',
      '3일차부터 뭔가 달라지기 시작했어요',
      '7일차 결과, 직접 보세요!',
      '결론: 이 제품 추천할까요? 네!',
    ],
  },
  {
    id: 'kr_ba_compare',
    type: 'Before/After',
    title: '비포 & 애프터',
    subtitle: 'Before & After Comparison',
    description: '사용 전후 확실한 비교를 보여주는 스타일',
    culturalNotes: '시각적인 증거를 중요하게 생각합니다. 같은 조명/각도에서 촬영하면 신뢰도가 높아집니다.',
    toneGuide: '객관적인 톤, "똑같은 조건에서 찍었어요", "확실히 달라졌죠?"',
    platforms: ['instagram', 'tiktok'],
    duration: '15s',
    estimatedTime: '1~3일',
    hashtags: ['#비포애프터', '#beforeafter', '#피부변화', '#효과검증'],
    defaultScenes: [
      'Before 상태 (정면/측면)',
      '제품 소개',
      '사용 과정 간단히',
      'After 상태 (같은 각도)',
      '비교 화면',
    ],
    defaultDialogues: [
      '이게 사용 전이에요',
      '이 제품을 사용했고요',
      '같은 조명, 같은 각도예요',
      '이게 사용 후예요',
      '차이가 보이시나요?',
    ],
  },
  {
    id: 'kr_comparison',
    type: 'Comparison',
    title: '비교 리뷰',
    subtitle: 'Product Comparison',
    description: '유사 제품과 비교하여 장단점을 분석하는 스타일',
    culturalNotes: '한국 소비자는 꼼꼼한 비교를 선호합니다. 객관적인 분석이 신뢰를 얻습니다.',
    toneGuide: '분석적인 톤, "A 제품은... B 제품은...", "결론적으로"',
    platforms: ['youtube', 'instagram'],
    duration: '60s',
    estimatedTime: '1~2시간',
    hashtags: ['#비교리뷰', '#제품비교', '#뭐살까', '#추천'],
    defaultScenes: [
      '비교할 제품들 소개',
      '성분/가격 비교',
      '텍스처 비교',
      '사용감 비교',
      '최종 결론',
    ],
    defaultDialogues: [
      '이 두 제품, 뭐가 더 좋을까요?',
      '가격은 A가 더 저렴하지만...',
      '텍스처는 확실히 다르죠?',
      '제 피부에는 이게 더 맞았어요',
      '결론! 이런 분께 추천드려요',
    ],
  },
  {
    id: 'kr_seasonal',
    type: 'Seasonal',
    title: '시즌 스페셜',
    subtitle: 'Seasonal Special',
    description: '계절/이벤트에 맞는 뷰티 컨텐츠 스타일',
    culturalNotes: '한국은 계절 변화가 뚜렷하여 시즌별 뷰티 니즈가 다릅니다. 시즌 키워드가 중요합니다.',
    toneGuide: '시즌감 있는 톤, "겨울철 필수템!", "여름에 딱인 제품"',
    platforms: ['tiktok', 'instagram', 'youtube'],
    duration: '30s',
    estimatedTime: '1시간',
    hashtags: ['#시즌템', '#겨울뷰티', '#여름스킨케어', '#환절기'],
    defaultScenes: [
      '시즌 고민 소개',
      '이 시즌에 맞는 이유',
      '제품 사용법',
      '시즌별 팁',
      '추천 마무리',
    ],
    defaultDialogues: [
      '이 계절에 꼭 필요한 제품이에요',
      '요즘 이런 고민 있으시죠?',
      '이 제품이 딱 맞아요',
      '시즌 팁 하나 더 드릴게요!',
      '이번 시즌은 이거로 준비 끝!',
    ],
  },
]

// 미국 템플릿
export const US_TEMPLATES = [
  {
    id: 'us_ugc_review',
    type: 'UGC',
    title: 'Honest Product Review',
    titleKr: 'UGC 스타일 리얼 후기',
    subtitle: 'Real, Unfiltered Review',
    description: 'Authentic, no-filter product review to build trust with viewers',
    culturalNotes: 'US consumers value authenticity and transparency. Direct, honest opinions are preferred.',
    toneGuide: 'Casual and direct tone. Use phrases like "This is legit!", "You NEED this!", "Honest review"',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '30 min - 1 hour',
    hashtags: ['#HonestReview', '#BeautyReview', '#RealResults', '#NotSponsored'],
    defaultScenes: [
      'Product unboxing and first reaction',
      'Close-up of texture and packaging',
      'Before skin condition',
      'Application process',
      'After results comparison',
    ],
    defaultDialogues: [
      'Okay so everyone\'s been talking about this product...',
      'Let me tell you, I was skeptical at first...',
      'But look at this difference!',
      'Here\'s what it did for my skin',
      'Verdict? 10/10 would repurchase!',
    ],
  },
  {
    id: 'us_grwm',
    type: 'GRWM',
    title: 'Get Ready With Me',
    titleKr: 'GRWM (같이 준비해요)',
    subtitle: 'Morning/Night Routine',
    description: 'Share your getting ready process and connect with viewers',
    culturalNotes: 'Americans enjoy relatable, everyday content. Casual conversation and storytelling work well.',
    toneGuide: 'Friendly, conversational. "Let\'s get ready together!", "Come with me!"',
    platforms: ['youtube', 'tiktok'],
    duration: '60s',
    estimatedTime: '1-2 hours',
    hashtags: ['#GRWM', '#GetReadyWithMe', '#MorningRoutine', '#BeautyRoutine'],
    defaultScenes: [
      'Morning wake-up or getting ready start',
      'Skincare routine step by step',
      'Applying the featured product',
      'Final look reveal',
      'Ready to go out',
    ],
    defaultDialogues: [
      'Good morning! Get ready with me today',
      'This product has been my go-to lately',
      'It makes such a difference, look!',
      'Almost done with the look',
      'All done! What do you think?',
    ],
  },
  {
    id: 'us_transformation',
    type: 'Transformation',
    title: 'Glow Up Transformation',
    titleKr: '메이크업 트랜스포메이션',
    subtitle: 'Dramatic Before/After',
    description: 'Show dramatic transformation to create impact',
    culturalNotes: 'Americans love dramatic reveals and confidence-boosting content.',
    toneGuide: 'Exciting, confident. "Wait for it!", "The glow up is REAL!"',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '1-2 hours',
    hashtags: ['#GlowUp', '#Transformation', '#BeforeAndAfter', '#MakeupMagic'],
    defaultScenes: [
      'Before state (bare face)',
      'Starting the transformation',
      'Mid-process tease',
      'Almost there...',
      'Final dramatic reveal',
    ],
    defaultDialogues: [
      'You won\'t believe this transformation',
      'Starting with this product',
      'Wait for it...',
      'Almost there!',
      'OKAY but the glow up is insane!',
    ],
  },
  {
    id: 'us_tutorial',
    type: 'Tutorial',
    title: 'Beauty Hacks & Tips',
    titleKr: '뷰티 팁 튜토리얼',
    subtitle: 'Pro Tips Tutorial',
    description: 'Share practical beauty tips and techniques',
    culturalNotes: 'Americans appreciate quick, actionable tips they can immediately use.',
    toneGuide: 'Informative yet casual. "Game changer!", "You\'ve been doing it wrong!"',
    platforms: ['youtube', 'instagram'],
    duration: '60s',
    estimatedTime: '1-2 hours',
    hashtags: ['#BeautyTips', '#BeautyHacks', '#ProTips', '#TutorialTime'],
    defaultScenes: [
      'Introduce the tip/hack',
      'Show wrong vs right way',
      'Demonstrate with product',
      'Highlight key point',
      'Show final results',
    ],
    defaultDialogues: [
      'Stop doing this! Here\'s a better way',
      'Most people don\'t know this trick',
      'Use this product like THIS instead',
      'See the difference?',
      'Save this for later!',
    ],
  },
  {
    id: 'us_storytime',
    type: 'Storytime',
    title: 'Storytime Review',
    titleKr: '스토리타임 리뷰',
    subtitle: 'Story-driven Content',
    description: 'Tell a story while showcasing the product',
    culturalNotes: 'Americans love storytelling and personal narratives in content.',
    toneGuide: 'Engaging, narrative. "So basically...", "You guys won\'t believe what happened"',
    platforms: ['tiktok', 'youtube'],
    duration: '60s',
    estimatedTime: '1-2 hours',
    hashtags: ['#Storytime', '#BeautyStorytime', '#StoryTime', '#MyExperience'],
    defaultScenes: [
      'Hook with intriguing story opener',
      'Set the scene/context',
      'Introduce product in story',
      'Show the turning point',
      'Happy ending/results',
    ],
    defaultDialogues: [
      'Okay so this is how I discovered this product...',
      'I was struggling with my skin and then...',
      'Someone recommended this to me',
      'And honestly? It changed everything',
      'Now look at my skin!',
    ],
  },
  {
    id: 'us_unboxing',
    type: 'Unboxing',
    title: 'Unboxing & First Impressions',
    titleKr: '언박싱 & 첫인상',
    subtitle: 'First Look Review',
    description: 'Share genuine first reactions to new products',
    culturalNotes: 'Americans enjoy authentic, unscripted reactions and ASMR elements.',
    toneGuide: 'Excited, genuine. "Just got this!", "First impressions!"',
    platforms: ['tiktok', 'youtube'],
    duration: '30s',
    estimatedTime: '30 min - 1 hour',
    hashtags: ['#Unboxing', '#FirstImpressions', '#NewIn', '#BeautyHaul'],
    defaultScenes: [
      'Package arrival/unboxing',
      'Packaging appreciation',
      'Taking out products',
      'First texture/scent reaction',
      'Will test and report back',
    ],
    defaultDialogues: [
      'My order finally came!',
      'The packaging is so cute',
      'This is what I got',
      'Omg the texture is amazing',
      'Can\'t wait to try this properly!',
    ],
  },
  {
    id: 'us_drugstore',
    type: 'Drugstore',
    title: 'Drugstore Finds',
    titleKr: '드럭스토어 추천',
    subtitle: 'Affordable Beauty Picks',
    description: 'Highlight affordable products available at drugstores',
    culturalNotes: 'Americans love finding affordable alternatives and drugstore gems.',
    toneGuide: 'Relatable, budget-friendly. "Under $20!", "Drugstore dupe!"',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '1 hour',
    hashtags: ['#DrugstoreBeauty', '#AffordableBeauty', '#BudgetFriendly', '#DrugstoreFinds'],
    defaultScenes: [
      'Introduce as budget find',
      'Show price point',
      'Compare to high-end',
      'Apply and show results',
      'Final verdict',
    ],
    defaultDialogues: [
      'This $15 product changed my life',
      'Works just as good as the $50 version',
      'Found this at Target/CVS/Walgreens',
      'Look at how well it works!',
      'Trust me, you need this',
    ],
  },
  {
    id: 'us_clean_beauty',
    type: 'Clean Beauty',
    title: 'Clean Beauty Review',
    titleKr: '클린 뷰티 리뷰',
    subtitle: 'Conscious Beauty',
    description: 'Focus on clean, sustainable, or conscious beauty',
    culturalNotes: 'Growing US market for clean, sustainable beauty. Ingredient awareness is important.',
    toneGuide: 'Informed, conscious. "Clean ingredients!", "Sustainable packaging"',
    platforms: ['instagram', 'youtube'],
    duration: '60s',
    estimatedTime: '1-2 hours',
    hashtags: ['#CleanBeauty', '#SustainableBeauty', '#GreenBeauty', '#ConsciousBeauty'],
    defaultScenes: [
      'Introduce clean beauty focus',
      'Highlight key ingredients',
      'Show sustainable packaging',
      'Apply and demonstrate',
      'Discuss why it matters',
    ],
    defaultDialogues: [
      'Let\'s talk about clean beauty',
      'Look at these ingredients - all natural',
      'Love that it\'s sustainably packaged',
      'And it actually works!',
      'Better for you and the planet',
    ],
  },
  {
    id: 'us_routine',
    type: 'Routine',
    title: 'My Current Routine',
    titleKr: '마이 루틴',
    subtitle: 'Full Routine Breakdown',
    description: 'Share your complete skincare or makeup routine',
    culturalNotes: 'Americans enjoy detailed routine content with product recommendations.',
    toneGuide: 'Organized, detailed. "Step by step", "My holy grail"',
    platforms: ['youtube', 'tiktok'],
    duration: '90s+',
    estimatedTime: '2-3 hours',
    hashtags: ['#SkincareRoutine', '#MyRoutine', '#MorningRoutine', '#NightRoutine'],
    defaultScenes: [
      'Introduce the routine',
      'Show all products used',
      'Step by step application',
      'Highlight featured product',
      'Final results',
    ],
    defaultDialogues: [
      'Here\'s my current routine',
      'These are all the products I use',
      'First step is always...',
      'This product is the star of the show',
      'And that\'s the finished routine!',
    ],
  },
  {
    id: 'us_dupe',
    type: 'Dupe',
    title: 'Dupe Alert',
    titleKr: '듀프 리뷰',
    subtitle: 'High-End vs Drugstore',
    description: 'Compare affordable alternatives to expensive products',
    culturalNotes: 'Dupe culture is huge in the US. People love finding affordable alternatives.',
    toneGuide: 'Exciting, money-saving. "Save your money!", "Same results!"',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '1 hour',
    hashtags: ['#Dupe', '#DupeAlert', '#BeautyDupe', '#SaveYourMoney'],
    defaultScenes: [
      'Show expensive product',
      'Introduce the dupe',
      'Side by side comparison',
      'Apply both products',
      'Reveal they\'re the same!',
    ],
    defaultDialogues: [
      'Don\'t buy the expensive one!',
      'This is the perfect dupe',
      'Let\'s compare side by side',
      'Can you even tell the difference?',
      'Save your money and get this instead!',
    ],
  },
]

// 일본 템플릿
export const JAPAN_TEMPLATES = [
  {
    id: 'jp_ugc_review',
    type: 'UGC',
    title: 'リアルレビュー',
    titleKr: 'UGC 스타일 리얼 후기',
    subtitle: 'Real Product Review',
    description: '正直な使用感をシェアするスタイル',
    culturalNotes: '日本の消費者は詳細で丁寧なレビューを好みます。控えめながらも正直な表現が効果的です。',
    toneGuide: '丁寧で控えめなトーン。「正直に言うと...」「個人的には...」のような表現',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '30分〜1時間',
    hashtags: ['#正直レビュー', '#コスメレビュー', '#購入品', '#スキンケア'],
    defaultScenes: [
      '商品の開封・第一印象',
      'テクスチャーのクローズアップ',
      '使用前の肌状態',
      '実際に使用する様子',
      '使用後の比較',
    ],
    defaultDialogues: [
      '話題のこちらの商品、使ってみました',
      '正直、最初は半信半疑でしたが...',
      'テクスチャーはこんな感じです',
      '実際に使ってみると...',
      '個人的にはリピートしたいと思います',
    ],
  },
  {
    id: 'jp_grwm',
    type: 'GRWM',
    title: '一緒に準備しよう',
    titleKr: 'GRWM (같이 준비해요)',
    subtitle: 'Get Ready With Me',
    description: '一緒に準備する過程を共有するスタイル',
    culturalNotes: '日本では「ゆるい」雰囲気のコンテンツが人気。親しみやすさが重要です。',
    toneGuide: '親しみやすく穏やかなトーン。「一緒に準備しましょう〜」',
    platforms: ['youtube', 'tiktok'],
    duration: '60s',
    estimatedTime: '1〜2時間',
    hashtags: ['#GRWM', '#朝の準備', '#モーニングルーティン', '#メイク動画'],
    defaultScenes: [
      '朝起きてからの様子',
      'スキンケアルーティン',
      '商品を使用する場面',
      '完成した姿',
      'お出かけ準備完了',
    ],
    defaultDialogues: [
      'おはようございます〜一緒に準備しましょう',
      '最近のお気に入りはこちらです',
      'これを使うと一日中潤います',
      'ほぼ完成です！',
      '準備できました〜行ってきます！',
    ],
  },
  {
    id: 'jp_transformation',
    type: 'Transformation',
    title: 'ビフォーアフター変身',
    titleKr: '메이크업 트랜스포메이션',
    subtitle: 'Before/After Transformation',
    description: '劇的な変身を見せるインパクトのあるスタイル',
    culturalNotes: '日本ではナチュラルからの変身が好まれます。派手すぎない上品な仕上がりが人気。',
    toneGuide: '期待感を持たせるトーン。「変わりますよ〜」「どうでしょう？」',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '1〜2時間',
    hashtags: ['#ビフォーアフター', '#整形メイク', '#変身', '#メイクアップ'],
    defaultScenes: [
      'Before状態（すっぴん）',
      '変身開始',
      '途中経過',
      '完成間近',
      'After完成お披露目',
    ],
    defaultDialogues: [
      'すっぴんからスタートです',
      'この商品を使っていきます',
      '少しずつ変わってきました',
      'もう少しで完成です',
      '完成です！いかがでしょうか？',
    ],
  },
  {
    id: 'jp_tutorial',
    type: 'Tutorial',
    title: '美容テクニック',
    titleKr: '뷰티 팁 튜토리얼',
    subtitle: 'Beauty Tips Tutorial',
    description: '実用的なテクニックを伝える教育的スタイル',
    culturalNotes: '日本の消費者は詳細で丁寧な説明を好みます。ステップバイステップが効果的。',
    toneGuide: '丁寧で分かりやすいトーン。「こうすると〇〇になります」',
    platforms: ['youtube', 'instagram'],
    duration: '60s',
    estimatedTime: '1〜2時間',
    hashtags: ['#美容テク', '#スキンケア方法', '#メイクテク', '#コツ'],
    defaultScenes: [
      '今日のテクニック紹介',
      '間違った方法 vs 正しい方法',
      '商品の使い方実演',
      'ポイント解説',
      '結果比較',
    ],
    defaultDialogues: [
      'このテクニック、知っていますか？',
      '多くの方がこうしがちですが...',
      'この商品はこう使うと効果的です',
      'ポイントはここです',
      '参考になれば嬉しいです',
    ],
  },
  {
    id: 'jp_vlog',
    type: 'Vlog',
    title: '美容日常Vlog',
    titleKr: '뷰티 일상 브이로그',
    subtitle: 'Beauty Daily Vlog',
    description: '自然な日常の中で商品を紹介するスタイル',
    culturalNotes: '日本では「丁寧な暮らし」コンテンツが人気。落ち着いた雰囲気が好まれます。',
    toneGuide: '穏やかで日常的なトーン。「今日も一日頑張りましょう」',
    platforms: ['youtube', 'tiktok'],
    duration: '90s+',
    estimatedTime: '2〜3時間',
    hashtags: ['#Vlog', '#日常', '#ナイトルーティン', '#美容Vlog'],
    defaultScenes: [
      '朝の様子',
      'お出かけ準備',
      '日中のタッチアップ',
      '夜のクレンジング',
      '就寝前スキンケア',
    ],
    defaultDialogues: [
      'おはようございます、今日の一日です',
      '最近毎日使っている商品です',
      'お出かけ前の必需品です',
      '一日中持ちが良かったです',
      'お疲れ様でした、おやすみなさい',
    ],
  },
  {
    id: 'jp_unboxing',
    type: 'Unboxing',
    title: '開封レビュー',
    titleKr: '언박싱 & 첫인상',
    subtitle: 'Unboxing & First Impressions',
    description: '新商品開封と最初の感想を共有するスタイル',
    culturalNotes: '日本ではパッケージへのこだわりが強い。ASMR要素も人気です。',
    toneGuide: 'ワクワク感のあるトーン。「届きました！」「パッケージ可愛い」',
    platforms: ['tiktok', 'youtube'],
    duration: '30s',
    estimatedTime: '30分〜1時間',
    hashtags: ['#開封', '#購入品紹介', '#新作コスメ', '#ハウル'],
    defaultScenes: [
      '届いた荷物/開封開始',
      'パッケージ紹介',
      '中身を取り出す',
      'テクスチャー・香りの第一印象',
      '使用予告',
    ],
    defaultDialogues: [
      '届きました〜開けていきます',
      'パッケージがとても可愛いです',
      '中身はこちらです',
      'テクスチャーは...わ、すごい',
      '使ってみてまたレビューしますね',
    ],
  },
  {
    id: 'jp_comparison',
    type: 'Comparison',
    title: '徹底比較レビュー',
    titleKr: '비교 리뷰',
    subtitle: 'Detailed Comparison',
    description: '類似商品と詳細に比較するスタイル',
    culturalNotes: '日本の消費者は詳細な比較を好みます。客観的なデータが信頼されます。',
    toneGuide: '分析的で丁寧なトーン。「Aは...Bは...」「結論として」',
    platforms: ['youtube', 'instagram'],
    duration: '60s',
    estimatedTime: '1〜2時間',
    hashtags: ['#比較', '#コスメ比較', '#どっちがいい', '#レビュー'],
    defaultScenes: [
      '比較する商品紹介',
      '成分・価格比較',
      'テクスチャー比較',
      '使用感比較',
      '最終結論',
    ],
    defaultDialogues: [
      'この2つの商品を比較してみました',
      '価格はAの方がお手頃ですが...',
      'テクスチャーは明らかに違いますね',
      '私の肌にはこちらが合いました',
      '結論！こういう方にはこちらがおすすめです',
    ],
  },
  {
    id: 'jp_drugstore',
    type: 'Drugstore',
    title: 'プチプラコスメ',
    titleKr: '드럭스토어 추천',
    subtitle: 'Affordable Beauty',
    description: 'ドラッグストアで買えるお手頃商品を紹介',
    culturalNotes: '日本ではプチプラコスメが大人気。コスパ重視の消費者が多い。',
    toneGuide: 'お得感を伝えるトーン。「この価格でこの品質！」「コスパ最強」',
    platforms: ['tiktok', 'instagram'],
    duration: '30s',
    estimatedTime: '1時間',
    hashtags: ['#プチプラ', '#ドラコス', '#プチプラコスメ', '#コスパ'],
    defaultScenes: [
      'プチプラ商品として紹介',
      '価格を見せる',
      'デパコスと比較',
      '使用して結果を見せる',
      '最終評価',
    ],
    defaultDialogues: [
      'この1000円以下の商品が凄いんです',
      '高級品と同じくらい良いです',
      'ドラッグストアで買えます',
      '見てください、この仕上がり！',
      'コスパ最強です、ぜひ試してみて',
    ],
  },
  {
    id: 'jp_seasonal',
    type: 'Seasonal',
    title: '季節のスキンケア',
    titleKr: '시즌 스페셜',
    subtitle: 'Seasonal Beauty',
    description: '季節に合わせた美容コンテンツ',
    culturalNotes: '日本は四季がはっきりしており、季節ごとの美容ニーズが異なります。',
    toneGuide: '季節感のあるトーン。「冬の乾燥対策に」「夏のベタつき解消」',
    platforms: ['tiktok', 'instagram', 'youtube'],
    duration: '30s',
    estimatedTime: '1時間',
    hashtags: ['#季節のケア', '#冬スキンケア', '#夏コスメ', '#季節美容'],
    defaultScenes: [
      '季節の悩み紹介',
      'この季節に合う理由',
      '商品の使い方',
      '季節別のコツ',
      'おすすめまとめ',
    ],
    defaultDialogues: [
      'この季節に欠かせない商品です',
      '今の時期、こんな悩みありませんか？',
      'この商品がぴったりなんです',
      '季節のコツをお伝えしますね',
      'この季節はこれで決まりです',
    ],
  },
  {
    id: 'jp_kawaii',
    type: 'Kawaii',
    title: 'かわいいコスメ紹介',
    titleKr: '카와이 코스메',
    subtitle: 'Cute Cosmetics',
    description: 'パッケージが可愛い商品を紹介するスタイル',
    culturalNotes: '日本では「かわいい」が重要な購買動機。パッケージデザインも重視されます。',
    toneGuide: '可愛らしいトーン。「めっちゃ可愛い！」「パケ買いしちゃった」',
    platforms: ['tiktok', 'instagram'],
    duration: '15s',
    estimatedTime: '30分',
    hashtags: ['#かわいいコスメ', '#パケ買い', '#コスメ収集', '#可愛い'],
    defaultScenes: [
      '可愛いパッケージ紹介',
      '細部のデザイン',
      '中身を見せる',
      '使用感',
      'コレクション感',
    ],
    defaultDialogues: [
      'このパッケージ、可愛すぎません？',
      'この細かいデザインが好きです',
      '中身もちゃんと良いんです',
      '使い心地も最高です',
      '飾っておきたいくらい可愛い',
    ],
  },
]

// 미국 주별 특성 (주소 기반 커스터마이징용)
export const US_STATE_CHARACTERISTICS = {
  // 서부
  CA: { climate: 'sunny', style: 'casual', focus: ['sun-protection', 'natural-beauty', 'clean-beauty'] },
  WA: { climate: 'rainy', style: 'minimal', focus: ['hydration', 'natural-look'] },
  OR: { climate: 'rainy', style: 'eco-conscious', focus: ['sustainable', 'clean-beauty'] },
  // 동부
  NY: { climate: 'varied', style: 'trendy', focus: ['latest-trends', 'bold-looks'] },
  FL: { climate: 'humid', style: 'beachy', focus: ['waterproof', 'sun-protection', 'light-texture'] },
  MA: { climate: 'cold', style: 'classic', focus: ['hydration', 'professional-look'] },
  // 중부
  TX: { climate: 'hot', style: 'bold', focus: ['long-lasting', 'heat-resistant'] },
  IL: { climate: 'varied', style: 'practical', focus: ['all-season', 'versatile'] },
  // 남부
  GA: { climate: 'humid', style: 'southern-charm', focus: ['humidity-proof', 'natural-glow'] },
  NC: { climate: 'mild', style: 'balanced', focus: ['everyday-beauty', 'natural'] },
}

// 전체 템플릿 가져오기
export const getAllTemplates = (country) => {
  switch (country) {
    case 'kr':
      return KOREA_TEMPLATES
    case 'us':
      return US_TEMPLATES
    case 'jp':
      return JAPAN_TEMPLATES
    default:
      return KOREA_TEMPLATES
  }
}

// 템플릿에서 가이드 데이터 생성 (카테고리별 맞춤 장면/대사 적용)
export const generateGuideFromTemplate = (template, productCategory, options = {}) => {
  const {
    storeVisit = 'none',
    customStore = '',
    platforms = template.platforms,
    duration = template.duration,
    additionalScenes = [],
    additionalDialogues = [],
    country = 'kr',
    brandName = '',
    productName = '',
    productDescription = '',
  } = options

  // 국가별 카테고리 장면/대사 가져오기
  const getCategoryScenes = () => {
    const categoryData = country === 'us'
      ? CATEGORY_SCENES_US[productCategory]
      : country === 'jp'
      ? CATEGORY_SCENES_JP[productCategory]
      : CATEGORY_SCENES_KR[productCategory]

    return categoryData || { scenes: template.defaultScenes, dialogues: template.defaultDialogues }
  }

  const categoryData = getCategoryScenes()

  // 카테고리별 장면과 템플릿 기본 장면을 합성
  let scenes = [...categoryData.scenes]
  let dialogues = [...categoryData.dialogues]

  // 템플릿 고유 장면도 추가 (중복 제거)
  template.defaultScenes.forEach(scene => {
    if (!scenes.includes(scene)) {
      scenes.push(scene)
    }
  })
  template.defaultDialogues.forEach(dialogue => {
    if (!dialogues.includes(dialogue)) {
      dialogues.push(dialogue)
    }
  })

  // 브랜드/제품명 치환
  if (brandName || productName) {
    const productRef = productName || '이 제품'
    const brandRef = brandName ? `${brandName}의 ` : ''

    scenes = scenes.map(scene =>
      scene.replace(/제품|상품|이 제품/g, `${brandRef}${productRef}`)
        .replace(/product|this product/gi, `${brandRef}${productRef}`)
        .replace(/商品|この商品/g, `${brandRef}${productRef}`)
    )
    dialogues = dialogues.map(dialogue =>
      dialogue.replace(/제품|상품|이 제품/g, `${brandRef}${productRef}`)
        .replace(/product|this product/gi, `${brandRef}${productRef}`)
        .replace(/商品|この商品/g, `${brandRef}${productRef}`)
    )
  }

  // 매장 방문 장면/대사 추가
  if (storeVisit !== 'none') {
    const storeLabel = storeVisit === 'other' ? customStore : STORE_VISIT_OPTIONS.find(s => s.id === storeVisit)?.label
    if (country === 'us') {
      scenes.unshift(`Visit ${storeLabel} and explore products`)
      dialogues.unshift(`Found this amazing product at ${storeLabel}!`)
    } else if (country === 'jp') {
      scenes.unshift(`${storeLabel}を訪問して商品を探す`)
      dialogues.unshift(`今日は${storeLabel}でこの商品を見つけました！`)
    } else {
      scenes.unshift(`${storeLabel} 매장 방문 및 제품 탐색`)
      dialogues.unshift(`오늘은 ${storeLabel}에서 이 제품을 발견했어요!`)
    }
  }

  // 추가 장면/대사 병합
  scenes = [...scenes, ...additionalScenes.filter(s => s.trim())]
  dialogues = [...dialogues, ...additionalDialogues.filter(d => d.trim())]

  // 해시태그에 브랜드/제품명 추가
  let hashtags = [...template.hashtags]
  if (brandName) {
    hashtags.unshift(`#${brandName.replace(/\s/g, '')}`)
  }
  if (productName) {
    hashtags.unshift(`#${productName.replace(/\s/g, '')}`)
  }

  return {
    templateId: template.id,
    templateType: template.type,
    productCategory,
    platforms,
    duration,
    estimatedTime: template.estimatedTime,
    hashtags,
    scenes,
    dialogues,
    storeVisit,
    customStore,
    culturalNotes: template.culturalNotes,
    toneGuide: template.toneGuide,
    brandName,
    productName,
    productDescription,
  }
}
