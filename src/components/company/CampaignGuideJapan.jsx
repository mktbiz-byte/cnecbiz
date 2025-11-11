import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { X, Plus } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

const CampaignGuideJapan = () => {
  const supabase = getSupabaseClient('japan')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')

  const [campaignTitle, setCampaignTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)

  // ガイド詳細フィールド
  const [requiredDialogues, setRequiredDialogues] = useState([''])
  const [requiredScenes, setRequiredScenes] = useState([''])
  const [requiredHashtags, setRequiredHashtags] = useState([''])
  const [videoDuration, setVideoDuration] = useState('')
  const [videoTempo, setVideoTempo] = useState('')
  const [videoTone, setVideoTone] = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('')

  // 必須撮影シーンチェックボックス
  const [shootingScenes, setShootingScenes] = useState({
    baPhoto: false,
    noMakeup: false,
    closeup: false,
    productCloseup: false,
    productTexture: false,
    outdoor: false,
    couple: false,
    child: false,
    troubledSkin: false,
    wrinkles: false
  })

  // 追加リクエスト
  const [additionalShootingRequests, setAdditionalShootingRequests] = useState('')

  // Meta広告コード発行リクエスト
  const [metaAdCodeRequested, setMetaAdCodeRequested] = useState(false)

  // キャンペーン情報とガイド読み込み
  useEffect(() => {
    if (campaignId) {
      loadCampaignGuide()
    }
  }, [campaignId])

  // 自動保存（10秒ごと）
  useEffect(() => {
    if (!campaignId) return

    const timer = setTimeout(() => {
      autoSaveGuide()
    }, 10000)

    return () => clearTimeout(timer)
  }, [requiredDialogues, requiredScenes, requiredHashtags, videoDuration, videoTempo, videoTone, additionalDetails, shootingScenes, additionalShootingRequests, metaAdCodeRequested, campaignId])

  const loadCampaignGuide = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          title, 
          required_dialogues, 
          required_scenes, 
          required_hashtags, 
          video_duration, 
          video_tempo, 
          video_tone, 
          additional_details,
          shooting_scenes_ba_photo,
          shooting_scenes_no_makeup,
          shooting_scenes_closeup,
          shooting_scenes_product_closeup,
          shooting_scenes_product_texture,
          shooting_scenes_outdoor,
          shooting_scenes_couple,
          shooting_scenes_child,
          shooting_scenes_troubled_skin,
          shooting_scenes_wrinkles,
          additional_shooting_requests,
          meta_ad_code_requested
        `)
        .eq('id', campaignId)
        .single()

      if (error) throw error

      if (data) {
        setCampaignTitle(data.title)
        setRequiredDialogues(data.required_dialogues || [''])
        setRequiredScenes(data.required_scenes || [''])
        setRequiredHashtags(data.required_hashtags || [''])
        setVideoDuration(data.video_duration || '')
        setVideoTempo(data.video_tempo || '')
        setVideoTone(data.video_tone || '')
        setAdditionalDetails(data.additional_details || '')
        setShootingScenes({
          baPhoto: data.shooting_scenes_ba_photo || false,
          noMakeup: data.shooting_scenes_no_makeup || false,
          closeup: data.shooting_scenes_closeup || false,
          productCloseup: data.shooting_scenes_product_closeup || false,
          productTexture: data.shooting_scenes_product_texture || false,
          outdoor: data.shooting_scenes_outdoor || false,
          couple: data.shooting_scenes_couple || false,
          child: data.shooting_scenes_child || false,
          troubledSkin: data.shooting_scenes_troubled_skin || false,
          wrinkles: data.shooting_scenes_wrinkles || false
        })
        setAdditionalShootingRequests(data.additional_shooting_requests || '')
        setMetaAdCodeRequested(data.meta_ad_code_requested || false)
      }
    } catch (err) {
      console.error('キャンペーン情報読み込み失敗：', err)
      setError('キャンペーン情報の読み込みに失敗しました。')
    }
  }

  const autoSaveGuide = async () => {
    setAutoSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          required_dialogues: requiredDialogues.filter(d => d.trim()),
          required_scenes: requiredScenes.filter(s => s.trim()),
          required_hashtags: requiredHashtags.filter(h => h.trim()),
          video_duration: videoDuration,
          video_tempo: videoTempo,
          video_tone: videoTone,
          additional_details: additionalDetails,
          shooting_scenes_ba_photo: shootingScenes.baPhoto,
          shooting_scenes_no_makeup: shootingScenes.noMakeup,
          shooting_scenes_closeup: shootingScenes.closeup,
          shooting_scenes_product_closeup: shootingScenes.productCloseup,
          shooting_scenes_product_texture: shootingScenes.productTexture,
          shooting_scenes_outdoor: shootingScenes.outdoor,
          shooting_scenes_couple: shootingScenes.couple,
          shooting_scenes_child: shootingScenes.child,
          shooting_scenes_troubled_skin: shootingScenes.troubledSkin,
          shooting_scenes_wrinkles: shootingScenes.wrinkles,
          additional_shooting_requests: additionalShootingRequests,
          meta_ad_code_requested: metaAdCodeRequested
        })
        .eq('id', campaignId)

      if (error) throw error
    } catch (err) {
      console.error('自動保存失敗：', err)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSave = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          required_dialogues: requiredDialogues.filter(d => d.trim()),
          required_scenes: requiredScenes.filter(s => s.trim()),
          required_hashtags: requiredHashtags.filter(h => h.trim()),
          video_duration: videoDuration,
          video_tempo: videoTempo,
          video_tone: videoTone,
          additional_details: additionalDetails,
          shooting_scenes_ba_photo: shootingScenes.baPhoto,
          shooting_scenes_no_makeup: shootingScenes.noMakeup,
          shooting_scenes_closeup: shootingScenes.closeup,
          shooting_scenes_product_closeup: shootingScenes.productCloseup,
          shooting_scenes_product_texture: shootingScenes.productTexture,
          shooting_scenes_outdoor: shootingScenes.outdoor,
          shooting_scenes_couple: shootingScenes.couple,
          shooting_scenes_child: shootingScenes.child,
          shooting_scenes_troubled_skin: shootingScenes.troubledSkin,
          shooting_scenes_wrinkles: shootingScenes.wrinkles,
          additional_shooting_requests: additionalShootingRequests,
          meta_ad_code_requested: metaAdCodeRequested
        })
        .eq('id', campaignId)

      if (error) throw error

      setSuccess('クリエイターガイドが保存されました！')
      setTimeout(() => {
        navigate(`/company/campaigns/${campaignId}/review`)
      }, 1500)
    } catch (err) {
      console.error('ガイド保存失敗：', err)
      setError('ガイド保存に失敗しました： ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleSkip = () => {
    navigate('/company/campaigns')
  }

  // 配列フィールド追加/削除関数
  const addDialogue = () => setRequiredDialogues([...requiredDialogues, ''])
  const removeDialogue = (index) => setRequiredDialogues(requiredDialogues.filter((_, i) => i !== index))
  const updateDialogue = (index, value) => {
    const newDialogues = [...requiredDialogues]
    newDialogues[index] = value
    setRequiredDialogues(newDialogues)
  }

  const addScene = () => setRequiredScenes([...requiredScenes, ''])
  const removeScene = (index) => setRequiredScenes(requiredScenes.filter((_, i) => i !== index))
  const updateScene = (index, value) => {
    const newScenes = [...requiredScenes]
    newScenes[index] = value
    setRequiredScenes(newScenes)
  }

  const addHashtag = () => setRequiredHashtags([...requiredHashtags, ''])
  const removeHashtag = (index) => setRequiredHashtags(requiredHashtags.filter((_, i) => i !== index))
  const updateHashtag = (index, value) => {
    const newHashtags = [...requiredHashtags]
    newHashtags[index] = value
    setRequiredHashtags(newHashtags)
  }

  // 撮影シーンチェックボックス変更関数
  const handleShootingSceneChange = (scene, checked) => {
    setShootingScenes(prev => ({
      ...prev,
      [scene]: checked
    }))
  }

  return (
    <>
      <CompanyNavigation />
      <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">クリエイターガイド作成</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            {campaignTitle && <span className="font-semibold">{campaignTitle}</span>}
          </p>
          {autoSaving && (
            <p className="text-xs text-blue-600 mt-1">自動保存中...</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 必須セリフ */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">必須セリフ</Label>
              <Button type="button" size="sm" variant="outline" onClick={addDialogue}>
                <Plus className="w-4 h-4 mr-1" /> 追加
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">クリエイターが必ず言うべきセリフを入力してください</p>
            {requiredDialogues.map((dialogue, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={dialogue}
                  onChange={(e) => updateDialogue(index, e.target.value)}
                  placeholder={`必須セリフ ${index + 1}`}
                  className="flex-1"
                />
                {requiredDialogues.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeDialogue(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 必須シーン */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">必須シーン</Label>
              <Button type="button" size="sm" variant="outline" onClick={addScene}>
                <Plus className="w-4 h-4 mr-1" /> 追加
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">動画に必ず含めるべきシーンを説明してください</p>
            {requiredScenes.map((scene, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={scene}
                  onChange={(e) => updateScene(index, e.target.value)}
                  placeholder={`必須シーン ${index + 1} (예: 製品クローズアップ 촬영)`}
                  className="flex-1"
                />
                {requiredScenes.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeScene(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 必須撮影シーンチェックボックス */}
          <div>
            <Label className="text-base font-semibold mb-3 block">必須撮影シーン</Label>
            <p className="text-sm text-gray-600 mb-3">必要な撮影シーンを選択してください</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ba-photo" 
                  checked={shootingScenes.baPhoto}
                  onCheckedChange={(checked) => handleShootingSceneChange('baPhoto', checked)}
                />
                <label htmlFor="ba-photo" className="text-sm cursor-pointer">
                  確実なB&A撮影
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="no-makeup" 
                  checked={shootingScenes.noMakeup}
                  onCheckedChange={(checked) => handleShootingSceneChange('noMakeup', checked)}
                />
                <label htmlFor="no-makeup" className="text-sm cursor-pointer">
                  ノーメイク
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="closeup" 
                  checked={shootingScenes.closeup}
                  onCheckedChange={(checked) => handleShootingSceneChange('closeup', checked)}
                />
                <label htmlFor="closeup" className="text-sm cursor-pointer">
                  クローズアップ
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="product-closeup" 
                  checked={shootingScenes.productCloseup}
                  onCheckedChange={(checked) => handleShootingSceneChange('productCloseup', checked)}
                />
                <label htmlFor="product-closeup" className="text-sm cursor-pointer">
                  製品クローズアップ
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="product-texture" 
                  checked={shootingScenes.productTexture}
                  onCheckedChange={(checked) => handleShootingSceneChange('productTexture', checked)}
                />
                <label htmlFor="product-texture" className="text-sm cursor-pointer">
                  製品テクスチャークローズアップ
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="outdoor" 
                  checked={shootingScenes.outdoor}
                  onCheckedChange={(checked) => handleShootingSceneChange('outdoor', checked)}
                />
                <label htmlFor="outdoor" className="text-sm cursor-pointer">
                  屋外撮影（カフェ、外出など）
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="couple" 
                  checked={shootingScenes.couple}
                  onCheckedChange={(checked) => handleShootingSceneChange('couple', checked)}
                />
                <label htmlFor="couple" className="text-sm cursor-pointer">
                  カップル出演
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="child" 
                  checked={shootingScenes.child}
                  onCheckedChange={(checked) => handleShootingSceneChange('child', checked)}
                />
                <label htmlFor="child" className="text-sm cursor-pointer">
                  子供出演
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="troubled-skin" 
                  checked={shootingScenes.troubledSkin}
                  onCheckedChange={(checked) => handleShootingSceneChange('troubledSkin', checked)}
                />
                <label htmlFor="troubled-skin" className="text-sm cursor-pointer">
                  トラブル肌露出
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="wrinkles" 
                  checked={shootingScenes.wrinkles}
                  onCheckedChange={(checked) => handleShootingSceneChange('wrinkles', checked)}
                />
                <label htmlFor="wrinkles" className="text-sm cursor-pointer">
                  肌のシワ露出
                </label>
              </div>
            </div>
          </div>

          {/* 追加撮影リクエスト */}
          <div>
            <Label className="text-base font-semibold">追加撮影リクエスト</Label>
            <p className="text-sm text-gray-600 mb-2">上記以外に追加でリクエストしたい撮影シーンや要求事項を記入してください</p>
            <Textarea
              value={additionalShootingRequests}
              onChange={(e) => setAdditionalShootingRequests(e.target.value)}
              placeholder="例：自然光で撮影してください、明るい背景で撮影をお願いします"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 必須ハッシュタグ */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">必須ハッシュタグ</Label>
              <Button type="button" size="sm" variant="outline" onClick={addHashtag}>
                <Plus className="w-4 h-4 mr-1" /> 追加
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">投稿に必ず含めるべきハッシュタグを入力してください</p>
            {requiredHashtags.map((hashtag, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={hashtag}
                  onChange={(e) => updateHashtag(index, e.target.value)}
                  placeholder={`#해시태그${index + 1}`}
                  className="flex-1"
                />
                {requiredHashtags.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeHashtag(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 希望動画時間 */}
          <div>
            <Label className="text-base font-semibold">希望動画時間</Label>
            <Select value={videoDuration} onValueChange={setVideoDuration}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="영상 시간을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="15sec">15초</SelectItem>
                <SelectItem value="30sec">30초</SelectItem>
                <SelectItem value="45sec">45초</SelectItem>
                <SelectItem value="1min">1분</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 動画テンポ */}
          <div>
            <Label className="text-base font-semibold">動画テンポ</Label>
            <Select value={videoTempo} onValueChange={setVideoTempo}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="動画テンポ를 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="fast">빠름 (역동적, 빠른 편집)</SelectItem>
                <SelectItem value="normal">普通 (자연스러운 속도)</SelectItem>
                <SelectItem value="slow">느림 (차분하고 여유로운)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 動画トーン앤매너 */}
          <div>
            <Label className="text-base font-semibold">動画トーン앤매너</Label>
            <Select value={videoTone} onValueChange={setVideoTone}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="영상 분위기를 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="bright">밝고 경쾌한</SelectItem>
                <SelectItem value="calm">차분하고 진지한</SelectItem>
                <SelectItem value="emotional">감성적인</SelectItem>
                <SelectItem value="humorous">유머러스한</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 기타 디테일 요청사항 */}
          <div>
            <Label className="text-base font-semibold">기타 디테일 요청사항</Label>
            <p className="text-sm text-gray-600 mb-2">追加로 요청하고 싶은 사항을 自由に 작성하세요</p>
            <Textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="예: 밝은 조명에서 촬영해주세요, 배경 음악은 경쾌한 느낌으로 부탁드립니다"
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Meta広告コード発行リクエスト */}
          <div className="border-t pt-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="meta-ad-code" 
                checked={metaAdCodeRequested}
                onCheckedChange={setMetaAdCodeRequested}
              />
              <label htmlFor="meta-ad-code" className="text-base font-semibold cursor-pointer">
                Meta広告コード発行リクエスト
              </label>
            </div>
            <p className="text-sm text-gray-600 mt-2 ml-6">
              체크하시면 메타(Facebook/Instagram) 광고 코드를 발급해드립니다
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={processing}
              className="flex-1"
            >
              {processing ? '保存 중...' : '保存하고 완료'}
            </Button>
            <Button
              onClick={handleSkip}
              variant="outline"
              disabled={processing}
            >
              나중에 작성
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            작성 중인 내용은 10초마다 자동으로 保存됩니다
          </p>
        </CardContent>
      </Card>
    </div>
    </>
  )
}

export default CampaignGuideJapan
