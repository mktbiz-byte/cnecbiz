const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * 일본 캠페인 가이드 생성 Function
 * - AI 가이드 생성 (한국과 동일한 로직 + 일본어 번역)
 * - 캠페인 타입별 다중 스텝 지원:
 *   - regular: 1개 가이드
 *   - megawari: 2개 가이드 (step1, step2)
 *   - 4week_challenge: 4개 가이드 (week1~4)
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI 가이드 생성 프롬프트 (한국과 동일한 CNEC 철학)
const GUIDE_GENERATION_PROMPT = `
あなたはインフルエンサーマーケティングの専門家です。以下のブランド情報に基づいて、クリエイター向けの撮影ガイドを日本語で作成してください。

## CNEC コンテンツ哲学
- 「共感型コンテンツ」を重視
- 視聴者が「私も同じ！」と思える瞬間を作る
- 単純なB&A動画や演技的な状況は避ける
- 自然なストーリーテリングフローを重視

## 10シーンフレームワーク
1. フック（共感誘導）- 視聴者の共感を得る最初のシーン
2. 日常の紹介 - クリエイターの実際の状況
3. 悩みの表現 - 正直な問題提起
4. 製品との出会い - 自然な紹介
5. 私だけの使い方 - カスタマイズされた使用法
6. 正直なレビュー - 本物のフィードバック
7. 変化・効果 - 控えめだが効果的
8. 生活への定着 - 日常に溶け込む様子
9. 心からの推薦 - 本当のおすすめ理由
10. 自然な締めくくり - 押し付けないCTA

## 入力情報
ブランド名: {{brand_name}}
製品名: {{product_name}}
製品説明: {{product_description}}
カテゴリ: {{category}}
ターゲットプラットフォーム: {{platforms}}
追加要件: {{additional_requirements}}

## 出力形式 (JSON)
以下の形式でJSONを出力してください。必ず有効なJSONフォーマットで返してください。
{
  "scenes": [
    {
      "scene_number": 1,
      "scene_name": "フック（共感誘導）",
      "description": "具体的な撮影内容",
      "dialogue_suggestion": "推奨セリフ例",
      "duration_seconds": 3,
      "tips": "撮影のコツ"
    }
  ],
  "required_hashtags": ["#PR", "#ブランド名"],
  "video_specs": {
    "duration": "30-60秒",
    "aspect_ratio": "9:16（リール/TikTok）または 16:9（YouTube）",
    "resolution": "1080p以上"
  },
  "creator_tips": [
    "自然体で撮影してください",
    "台本を読んでいるように見えないよう注意"
  ],
  "authenticity_guidelines": [
    "正直な感想を重視",
    "実際の使用感を共有"
  ]
}
`;

// 가이드 번역 프롬프트
const TRANSLATION_PROMPT = `
以下の韓国語のキャンペーンガイド情報を日本語に自然に翻訳してください。
マーケティング用語やブランド名はそのままにし、文化的なニュアンスを考慮して翻訳してください。

韓国語:
{{korean_text}}

日本語のみ出力してください。
`;

// 다중 스텝 가이드 프롬프트 (메가와리/4주 챌린지)
const MULTI_STEP_PROMPT = `
以下の情報に基づいて、{{step_type}}用の撮影ガイドを日本語で作成してください。

## キャンペーン情報
ブランド名: {{brand_name}}
製品名: {{product_name}}
キャンペーンタイプ: {{campaign_type}}
現在のステップ: {{current_step}}

## {{step_description}}

前のステップの内容と連続性を持たせながら、このステップ特有の内容を作成してください。

## 出力形式 (JSON)
{
  "step_number": {{step_number}},
  "step_name": "{{step_name}}",
  "focus_points": ["このステップで重視するポイント"],
  "scenes": [
    {
      "scene_number": 1,
      "description": "撮影内容",
      "dialogue_suggestion": "セリフ例"
    }
  ],
  "required_hashtags": ["#PR"],
  "deadline_reminder": "提出期限を守ってください"
}
`;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const {
      action, // 'generate', 'translate', 'generate_step'
      campaign_type, // 'regular', 'megawari', '4week_challenge'
      brand_name,
      product_name,
      product_description,
      category,
      platforms,
      additional_requirements,
      korean_text, // for translation
      step_number, // for multi-step
      previous_guides // for continuity
    } = body;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    let result;

    switch (action) {
      case 'generate':
        // 일반 가이드 생성
        const generatePrompt = GUIDE_GENERATION_PROMPT
          .replace('{{brand_name}}', brand_name || '')
          .replace('{{product_name}}', product_name || '')
          .replace('{{product_description}}', product_description || '')
          .replace('{{category}}', category || 'beauty')
          .replace('{{platforms}}', Array.isArray(platforms) ? platforms.join(', ') : (platforms || 'Instagram'))
          .replace('{{additional_requirements}}', additional_requirements || '特になし');

        const generateResponse = await model.generateContent(generatePrompt);
        const generateText = generateResponse.response.text();

        // JSON 파싱 시도
        try {
          const jsonMatch = generateText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = {
              success: true,
              guide: JSON.parse(jsonMatch[0]),
              raw_text: generateText
            };
          } else {
            result = {
              success: true,
              guide: null,
              raw_text: generateText
            };
          }
        } catch (parseError) {
          result = {
            success: true,
            guide: null,
            raw_text: generateText,
            parse_error: parseError.message
          };
        }
        break;

      case 'translate':
        // 한국어 → 일본어 번역
        const translatePrompt = TRANSLATION_PROMPT
          .replace('{{korean_text}}', korean_text || '');

        const translateResponse = await model.generateContent(translatePrompt);
        result = {
          success: true,
          translated_text: translateResponse.response.text().trim()
        };
        break;

      case 'generate_step':
        // 다중 스텝 가이드 생성 (메가와리/4주 챌린지)
        let stepType, stepName, stepDescription;

        if (campaign_type === 'megawari') {
          stepType = 'メガ割キャンペーン';
          stepName = step_number === 1 ? 'ステップ1（認知拡大）' : 'ステップ2（セール促進）';
          stepDescription = step_number === 1
            ? 'ステップ1: 製品の魅力と使用感を紹介する動画。ブランド認知を高めることが目標です。'
            : 'ステップ2: セール開始に合わせた購入促進動画。限定セールの魅力を伝えます。';
        } else if (campaign_type === '4week_challenge') {
          stepType = '4週チャレンジ';
          const weekNames = {
            1: '第1週（出会い）',
            2: '第2週（使用開始）',
            3: '第3週（変化の実感）',
            4: '第4週（総まとめ）'
          };
          const weekDescriptions = {
            1: '第1週: 製品との出会いと第一印象を共有します。',
            2: '第2週: 継続使用中の様子と使い方のコツを紹介します。',
            3: '第3週: 使用後の変化や効果を正直にレビューします。',
            4: '第4週: 4週間の総まとめと最終評価を発表します。'
          };
          stepName = weekNames[step_number] || `第${step_number}週`;
          stepDescription = weekDescriptions[step_number] || '';
        } else {
          stepType = '企画型キャンペーン';
          stepName = 'メイン動画';
          stepDescription = '製品の魅力を伝えるメイン動画を作成します。';
        }

        const stepPrompt = MULTI_STEP_PROMPT
          .replace(/\{\{step_type\}\}/g, stepType)
          .replace('{{brand_name}}', brand_name || '')
          .replace('{{product_name}}', product_name || '')
          .replace('{{campaign_type}}', campaign_type || 'regular')
          .replace('{{current_step}}', `${step_number}`)
          .replace('{{step_description}}', stepDescription)
          .replace('{{step_number}}', step_number)
          .replace('{{step_name}}', stepName);

        const stepResponse = await model.generateContent(stepPrompt);
        const stepText = stepResponse.response.text();

        try {
          const jsonMatch = stepText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = {
              success: true,
              step_guide: JSON.parse(jsonMatch[0]),
              step_number,
              raw_text: stepText
            };
          } else {
            result = {
              success: true,
              step_guide: null,
              step_number,
              raw_text: stepText
            };
          }
        } catch (parseError) {
          result = {
            success: true,
            step_guide: null,
            step_number,
            raw_text: stepText,
            parse_error: parseError.message
          };
        }
        break;

      case 'generate_all_steps':
        // 모든 스텝 가이드 일괄 생성
        const allSteps = [];
        const stepCount = campaign_type === '4week_challenge' ? 4 : (campaign_type === 'megawari' ? 2 : 1);

        for (let i = 1; i <= stepCount; i++) {
          let sType, sName, sDesc;

          if (campaign_type === 'megawari') {
            sType = 'メガ割キャンペーン';
            sName = i === 1 ? 'ステップ1（認知拡大）' : 'ステップ2（セール促進）';
            sDesc = i === 1
              ? 'ステップ1: 製品の魅力と使用感を紹介する動画。'
              : 'ステップ2: セール開始に合わせた購入促進動画。';
          } else if (campaign_type === '4week_challenge') {
            sType = '4週チャレンジ';
            const wNames = { 1: '第1週（出会い）', 2: '第2週（使用開始）', 3: '第3週（変化の実感）', 4: '第4週（総まとめ）' };
            const wDescs = {
              1: '第1週: 製品との出会いと第一印象。',
              2: '第2週: 継続使用中の様子。',
              3: '第3週: 変化や効果をレビュー。',
              4: '第4週: 4週間の総まとめ。'
            };
            sName = wNames[i];
            sDesc = wDescs[i];
          } else {
            sType = '企画型';
            sName = 'メイン動画';
            sDesc = '製品紹介動画。';
          }

          const sPrompt = MULTI_STEP_PROMPT
            .replace(/\{\{step_type\}\}/g, sType)
            .replace('{{brand_name}}', brand_name || '')
            .replace('{{product_name}}', product_name || '')
            .replace('{{campaign_type}}', campaign_type || 'regular')
            .replace('{{current_step}}', `${i}`)
            .replace('{{step_description}}', sDesc)
            .replace('{{step_number}}', i)
            .replace('{{step_name}}', sName);

          const sResponse = await model.generateContent(sPrompt);
          const sText = sResponse.response.text();

          try {
            const jsonMatch = sText.match(/\{[\s\S]*\}/);
            allSteps.push({
              step_number: i,
              step_name: sName,
              guide: jsonMatch ? JSON.parse(jsonMatch[0]) : null,
              raw_text: sText
            });
          } catch {
            allSteps.push({
              step_number: i,
              step_name: sName,
              guide: null,
              raw_text: sText
            });
          }
        }

        result = {
          success: true,
          campaign_type,
          total_steps: stepCount,
          guides: allSteps
        };
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action. Use: generate, translate, generate_step, generate_all_steps' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('[generate-japan-guide] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
