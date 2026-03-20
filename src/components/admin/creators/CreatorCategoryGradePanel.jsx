import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { Badge } from '../../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Switch } from '../../ui/switch'
import {
  Loader2, Save, ChevronDown, ChevronRight, Plus, Edit, Tag,
  Scissors, Palette, Droplets, Bath, Sparkles, Settings
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'

// lucide-react 아이콘 매핑
const ICON_MAP = {
  Scissors, Palette, Droplets, Bath, Sparkles, Tag,
  Settings, Edit, Plus
}

const GRADE_LEVELS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']

const GRADE_BADGE_STYLES = {
  Bronze:   'bg-amber-100 text-amber-800',
  Silver:   'bg-gray-200 text-gray-700',
  Gold:     'bg-yellow-100 text-yellow-800',
  Platinum: 'bg-purple-100 text-purple-800',
  Diamond:  'bg-blue-100 text-blue-800',
}

const COUNTRY_LABELS = {
  KR: { label: '한국', flag: '🇰🇷' },
  JP: { label: '일본', flag: '🇯🇵' },
  US: { label: '미국', flag: '🇺🇸' },
  TW: { label: '대만', flag: '🇹🇼' },
}

function DynamicIcon({ name, className }) {
  const IconComponent = ICON_MAP[name] || Tag
  return <IconComponent className={className} />
}

export default function CreatorCategoryGradePanel({ creatorId, creatorName, countryCode = 'KR' }) {
  const [categories, setCategories] = useState([])
  const [grades, setGrades] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  // 카드별 편집 state
  const [editState, setEditState] = useState({})

  // 카테고리 관리
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [allCategories, setAllCategories] = useState([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', label_ko: '', label_en: '', label_ja: '', icon: 'Tag' })
  const [editingCategory, setEditingCategory] = useState(null)
  const [savingCategory, setSavingCategory] = useState(false)

  // 국가는 크리에이터의 실제 국가에 고정 (변경 불가)

  const loadData = useCallback(async () => {
    if (!creatorId) return
    setLoading(true)
    try {
      const [catRes, gradeRes, histRes] = await Promise.all([
        supabaseBiz.from('beauty_categories').select('*').eq('is_active', true).order('sort_order'),
        supabaseBiz.from('creator_category_grades').select('*, beauty_categories(*)').eq('creator_id', creatorId).eq('country_code', countryCode),
        supabaseBiz.from('category_grade_history').select('*, beauty_categories(label_ko)').eq('creator_id', creatorId).eq('country_code', countryCode).order('created_at', { ascending: false }).limit(20)
      ])

      if (catRes.data) setCategories(catRes.data)

      // 등급 데이터를 category_id 기준 맵으로 변환
      const gradeMap = {}
      if (gradeRes.data) {
        gradeRes.data.forEach(g => { gradeMap[g.category_id] = g })
      }
      setGrades(gradeMap)

      // 편집 state 초기화
      const initEdit = {}
      if (catRes.data) {
        catRes.data.forEach(cat => {
          const existing = gradeMap[cat.id]
          initEdit[cat.id] = {
            grade_level: existing?.grade_level || '',
            score: existing?.score ?? '',
            notes: existing?.notes || ''
          }
        })
      }
      setEditState(initEdit)

      if (histRes.data) setHistory(histRes.data)
    } catch (err) {
      console.error('카테고리 등급 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [creatorId, countryCode])

  const loadAllCategories = useCallback(async () => {
    const { data } = await supabaseBiz.from('beauty_categories').select('*').order('sort_order')
    if (data) setAllCategories(data)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (categoryOpen) loadAllCategories()
  }, [categoryOpen, loadAllCategories])

  const handleSaveGrade = async (categoryId) => {
    const edit = editState[categoryId]
    if (!edit?.grade_level) return

    setSavingId(categoryId)
    try {
      // Netlify Function을 통해 BIZ DB upsert + Korea DB categories 역동기화
      const response = await fetch('/.netlify/functions/update-featured-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_category_grade',
          creatorId,
          categoryId,
          countryCode,
          gradeLevel: edit.grade_level,
          score: edit.score !== '' ? edit.score : undefined,
          notes: edit.notes || undefined
        })
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || '등급 저장 실패')

      await loadData()
    } catch (err) {
      console.error('등급 저장 오류:', err)
      alert(`등급 저장 실패: ${err.message}`)
    } finally {
      setSavingId(null)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.label_ko) return
    setSavingCategory(true)
    try {
      const slug = newCategory.name || newCategory.label_ko.toLowerCase().replace(/\s+/g, '_')
      const maxOrder = allCategories.reduce((max, c) => Math.max(max, c.sort_order || 0), 0)

      const { error } = await supabaseBiz.from('beauty_categories').insert({
        name: `custom:${slug}`,
        label_ko: newCategory.label_ko,
        label_en: newCategory.label_en || null,
        label_ja: newCategory.label_ja || null,
        icon: newCategory.icon || 'Tag',
        sort_order: maxOrder + 1,
        is_custom: true
      })

      if (error) throw error
      setShowAddCategory(false)
      setNewCategory({ name: '', label_ko: '', label_en: '', label_ja: '', icon: 'Tag' })
      await Promise.all([loadAllCategories(), loadData()])
    } catch (err) {
      console.error('카테고리 추가 오류:', err)
      alert(`카테고리 추가 실패: ${err.message}`)
    } finally {
      setSavingCategory(false)
    }
  }

  const handleToggleCategoryActive = async (catId, currentActive) => {
    const { error } = await supabaseBiz
      .from('beauty_categories')
      .update({ is_active: !currentActive })
      .eq('id', catId)

    if (error) {
      alert(`상태 변경 실패: ${error.message}`)
      return
    }
    await Promise.all([loadAllCategories(), loadData()])
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return
    setSavingCategory(true)
    try {
      const { error } = await supabaseBiz.from('beauty_categories').update({
        label_ko: editingCategory.label_ko,
        label_en: editingCategory.label_en || null,
        label_ja: editingCategory.label_ja || null,
        icon: editingCategory.icon || 'Tag',
        sort_order: editingCategory.sort_order
      }).eq('id', editingCategory.id)

      if (error) throw error
      setEditingCategory(null)
      await Promise.all([loadAllCategories(), loadData()])
    } catch (err) {
      alert(`수정 실패: ${err.message}`)
    } finally {
      setSavingCategory(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 국가 표시 (크리에이터 국가에 고정, 변경 불가) */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-semibold">국가:</Label>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {COUNTRY_LABELS[countryCode]?.flag} {COUNTRY_LABELS[countryCode]?.label || countryCode}
        </Badge>
      </div>

      {/* 카테고리별 등급 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const existing = grades[cat.id]
          const edit = editState[cat.id] || {}
          const hasGrade = !!existing
          const isChanged = edit.grade_level !== (existing?.grade_level || '') ||
            String(edit.score ?? '') !== String(existing?.score ?? '') ||
            (edit.notes || '') !== (existing?.notes || '')

          return (
            <Card key={cat.id} className={`transition-all ${hasGrade ? 'border-l-4' : 'border-l-4 border-l-gray-200'}`}
              style={hasGrade ? { borderLeftColor: getGradeColor(existing.grade_level) } : undefined}>
              <CardContent className="pt-4 space-y-3">
                {/* 카테고리 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DynamicIcon name={cat.icon} className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-sm">{cat.label_ko}</span>
                  </div>
                  {hasGrade ? (
                    <Badge className={GRADE_BADGE_STYLES[existing.grade_level]}>
                      {existing.grade_level}
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-400">미등록</Badge>
                  )}
                </div>

                {/* 등급 선택 */}
                <div className="space-y-2">
                  <Select
                    value={edit.grade_level || ''}
                    onValueChange={(val) => setEditState(prev => ({
                      ...prev,
                      [cat.id]: { ...prev[cat.id], grade_level: val }
                    }))}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="등급 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getGradeColor(level) }} />
                            {level}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 점수 */}
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="점수 (0~100, 선택)"
                    value={edit.score ?? ''}
                    onChange={(e) => setEditState(prev => ({
                      ...prev,
                      [cat.id]: { ...prev[cat.id], score: e.target.value }
                    }))}
                    className="h-9 text-sm"
                  />

                  {/* 메모 */}
                  <Textarea
                    placeholder="메모 (선택)"
                    value={edit.notes || ''}
                    onChange={(e) => setEditState(prev => ({
                      ...prev,
                      [cat.id]: { ...prev[cat.id], notes: e.target.value }
                    }))}
                    rows={2}
                    className="text-sm resize-none"
                  />

                  {/* 저장 버튼 */}
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!edit.grade_level || savingId === cat.id || !isChanged}
                    onClick={() => handleSaveGrade(cat.id)}
                  >
                    {savingId === cat.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    저장
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 카테고리 관리 (접이식) */}
      <Collapsible open={categoryOpen} onOpenChange={setCategoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              카테고리 관리
            </span>
            {categoryOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">아이콘</TableHead>
                <TableHead>한국어</TableHead>
                <TableHead>영어</TableHead>
                <TableHead>일본어</TableHead>
                <TableHead className="w-16">순서</TableHead>
                <TableHead className="w-16">활성</TableHead>
                <TableHead className="w-16">수정</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCategories.map(cat => (
                <TableRow key={cat.id} className={!cat.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <DynamicIcon name={cat.icon} className="w-4 h-4" />
                  </TableCell>
                  <TableCell className="text-sm">{cat.label_ko}</TableCell>
                  <TableCell className="text-sm text-gray-500">{cat.label_en || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{cat.label_ja || '-'}</TableCell>
                  <TableCell className="text-sm">{cat.sort_order}</TableCell>
                  <TableCell>
                    <Switch
                      checked={cat.is_active}
                      onCheckedChange={() => handleToggleCategoryActive(cat.id, cat.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setEditingCategory({ ...cat })}>
                      <Edit className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button variant="outline" onClick={() => setShowAddCategory(true)}>
            <Plus className="w-4 h-4 mr-2" />
            커스텀 카테고리 추가
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* 등급 변동 이력 */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          등급 변동 이력
          <Badge variant="outline" className="text-xs">{COUNTRY_LABELS[countryCode]?.flag} {COUNTRY_LABELS[countryCode]?.label}</Badge>
        </h4>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">변동 이력이 없습니다</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>등급 변경</TableHead>
                <TableHead>사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs text-gray-500">
                    {new Date(h.created_at).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {h.beauty_categories?.label_ko || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {h.previous_grade ? (
                      <span>
                        <Badge className={`${GRADE_BADGE_STYLES[h.previous_grade]} text-xs mr-1`}>{h.previous_grade}</Badge>
                        →
                        <Badge className={`${GRADE_BADGE_STYLES[h.new_grade]} text-xs ml-1`}>{h.new_grade}</Badge>
                      </span>
                    ) : (
                      <span>
                        <span className="text-gray-400 text-xs mr-1">신규</span>→
                        <Badge className={`${GRADE_BADGE_STYLES[h.new_grade]} text-xs ml-1`}>{h.new_grade}</Badge>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">
                    {h.change_reason || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 커스텀 카테고리 추가 Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>커스텀 카테고리 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-sm">한국어명 *</Label>
              <Input
                value={newCategory.label_ko}
                onChange={(e) => setNewCategory(p => ({ ...p, label_ko: e.target.value }))}
                placeholder="예: 향수"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">영어명</Label>
                <Input
                  value={newCategory.label_en}
                  onChange={(e) => setNewCategory(p => ({ ...p, label_en: e.target.value }))}
                  placeholder="Perfume"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">일본어명</Label>
                <Input
                  value={newCategory.label_ja}
                  onChange={(e) => setNewCategory(p => ({ ...p, label_ja: e.target.value }))}
                  placeholder="パフューム"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">아이콘 (lucide-react)</Label>
              <Select value={newCategory.icon} onValueChange={(val) => setNewCategory(p => ({ ...p, icon: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(ICON_MAP).map(name => (
                    <SelectItem key={name} value={name}>
                      <span className="flex items-center gap-2">
                        <DynamicIcon name={name} className="w-4 h-4" />
                        {name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>취소</Button>
            <Button onClick={handleAddCategory} disabled={!newCategory.label_ko || savingCategory}>
              {savingCategory && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 카테고리 수정 Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>카테고리 수정</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-sm">한국어명 *</Label>
                <Input
                  value={editingCategory.label_ko}
                  onChange={(e) => setEditingCategory(p => ({ ...p, label_ko: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">영어명</Label>
                  <Input
                    value={editingCategory.label_en || ''}
                    onChange={(e) => setEditingCategory(p => ({ ...p, label_en: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">일본어명</Label>
                  <Input
                    value={editingCategory.label_ja || ''}
                    onChange={(e) => setEditingCategory(p => ({ ...p, label_ja: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">아이콘</Label>
                  <Select value={editingCategory.icon || 'Tag'} onValueChange={(val) => setEditingCategory(p => ({ ...p, icon: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(ICON_MAP).map(name => (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2">
                            <DynamicIcon name={name} className="w-4 h-4" />
                            {name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">정렬 순서</Label>
                  <Input
                    type="number"
                    value={editingCategory.sort_order}
                    onChange={(e) => setEditingCategory(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>취소</Button>
            <Button onClick={handleUpdateCategory} disabled={savingCategory}>
              {savingCategory && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getGradeColor(grade) {
  const colors = {
    Bronze: '#B45309',
    Silver: '#6B7280',
    Gold: '#CA8A04',
    Platinum: '#7C3AED',
    Diamond: '#2563EB',
  }
  return colors[grade] || '#9CA3AF'
}
