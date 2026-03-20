import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Plus, Trash2, Save, Loader2, ExternalLink, FileSpreadsheet,
  ChevronDown, Edit3, X, Check, Download
} from 'lucide-react'
import * as XLSX from 'xlsx'

const COLUMNS = [
  { key: 'creator_name', label: '이름', width: 'w-[100px]', editable: true },
  { key: 'channel_link', label: '채널 링크', width: 'w-[160px]', editable: true, isLink: true },
  { key: 'phone_email', label: '전화번호/이메일', width: 'w-[180px]', editable: true },
  { key: 'kakao_registered', label: '카카오톡', width: 'w-[70px]', editable: true, type: 'toggle', options: ['', 'O', 'X'] },
  { key: 'contacted', label: '연락여부', width: 'w-[80px]', editable: true, type: 'toggle', options: ['', 'O', 'X'] },
  { key: 'contact_response', label: '답변', width: 'w-[160px]', editable: true },
  { key: 'progress_status', label: '진행 여부', width: 'w-[90px]', editable: true, type: 'select', options: ['', '진행', '보류', '거절', '완료'] },
  { key: 'recommended', label: '추천', width: 'w-[70px]', editable: true, type: 'toggle', options: ['', 'O', 'X'] },
  { key: 'upload_link', label: '업로드 링크', width: 'w-[120px]', editable: true },
  { key: 'meeting_done', label: '미팅', width: 'w-[70px]', editable: true, type: 'toggle', options: ['', 'O', 'X'] },
  { key: 'meeting_date', label: '미팅 날짜', width: 'w-[130px]', editable: true },
  { key: 'comment', label: '코멘트', width: 'w-[200px]', editable: true },
]

export default function ConsultationSpreadsheet() {
  const [sheets, setSheets] = useState([])
  const [activeSheetId, setActiveSheetId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 인라인 편집 상태
  const [editingCell, setEditingCell] = useState(null) // { rowId, colKey }
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef(null)

  // 새 시트 생성 모달
  const [createOpen, setCreateOpen] = useState(false)
  const [newSheetName, setNewSheetName] = useState('')
  const [newSheetDesc, setNewSheetDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // 시트 삭제 확인
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // 시트 이름 편집
  const [editingSheetId, setEditingSheetId] = useState(null)
  const [editSheetName, setEditSheetName] = useState('')

  // 펜딩 변경사항 추적
  const [pendingChanges, setPendingChanges] = useState({})
  const [saveTimeout, setSaveTimeout] = useState(null)

  useEffect(() => {
    fetchSheets()
  }, [])

  useEffect(() => {
    if (activeSheetId) fetchRows(activeSheetId)
  }, [activeSheetId])

  // 편집 셀 포커스
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      if (editInputRef.current.select) editInputRef.current.select()
    }
  }, [editingCell])

  const fetchSheets = async () => {
    try {
      const res = await fetch('/.netlify/functions/manage-consultation-spreadsheet')
      const data = await res.json()
      if (data.success) {
        setSheets(data.sheets || [])
        if (data.sheets?.length > 0 && !activeSheetId) {
          setActiveSheetId(data.sheets[0].id)
        }
      }
    } catch (err) {
      console.error('시트 목록 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRows = async (sheetId) => {
    setRowsLoading(true)
    try {
      const res = await fetch(`/.netlify/functions/manage-consultation-spreadsheet?spreadsheet_id=${sheetId}`)
      const data = await res.json()
      if (data.success) setRows(data.rows || [])
    } catch (err) {
      console.error('행 조회 오류:', err)
    } finally {
      setRowsLoading(false)
    }
  }

  const handleCreateSheet = async () => {
    if (!newSheetName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/.netlify/functions/manage-consultation-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_sheet', name: newSheetName.trim(), description: newSheetDesc.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setCreateOpen(false)
        setNewSheetName('')
        setNewSheetDesc('')
        await fetchSheets()
        setActiveSheetId(data.sheet.id)
      }
    } catch (err) {
      alert(`시트 생성 오류: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSheet = async (sheetId) => {
    try {
      const res = await fetch('/.netlify/functions/manage-consultation-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_sheet', sheet_id: sheetId })
      })
      const data = await res.json()
      if (data.success) {
        setDeleteConfirm(null)
        if (activeSheetId === sheetId) setActiveSheetId(null)
        await fetchSheets()
      }
    } catch (err) {
      alert(`시트 삭제 오류: ${err.message}`)
    }
  }

  const handleRenameSheet = async (sheetId) => {
    if (!editSheetName.trim()) return
    try {
      await fetch('/.netlify/functions/manage-consultation-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_sheet', sheet_id: sheetId, name: editSheetName.trim() })
      })
      setEditingSheetId(null)
      fetchSheets()
    } catch (err) {
      alert(`이름 변경 오류: ${err.message}`)
    }
  }

  const handleAddRow = async () => {
    if (!activeSheetId) return
    try {
      const res = await fetch('/.netlify/functions/manage-consultation-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_row', spreadsheet_id: activeSheetId, row_data: {} })
      })
      const data = await res.json()
      if (data.success) {
        setRows(prev => [...prev, data.row])
      }
    } catch (err) {
      alert(`행 추가 오류: ${err.message}`)
    }
  }

  const handleDeleteRow = async (rowId) => {
    if (!confirm('이 행을 삭제하시겠습니까?')) return
    try {
      await fetch('/.netlify/functions/manage-consultation-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_row', row_id: rowId })
      })
      setRows(prev => prev.filter(r => r.id !== rowId))
    } catch (err) {
      alert(`행 삭제 오류: ${err.message}`)
    }
  }

  // 셀 값 즉시 저장
  const saveCellValue = useCallback(async (rowId, colKey, value) => {
    try {
      await fetch('/.netlify/functions/manage-consultation-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_row', row_id: rowId, updates: { [colKey]: value } })
      })
    } catch (err) {
      console.error('셀 저장 오류:', err)
    }
  }, [])

  const startEditing = (rowId, colKey, currentValue) => {
    // 기존 편집 중이면 먼저 저장
    if (editingCell) {
      commitEdit()
    }
    setEditingCell({ rowId, colKey })
    setEditValue(currentValue || '')
  }

  const commitEdit = () => {
    if (!editingCell) return
    const { rowId, colKey } = editingCell
    const oldValue = rows.find(r => r.id === rowId)?.[colKey] || ''
    if (editValue !== oldValue) {
      // 로컬 상태 즉시 업데이트
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, [colKey]: editValue } : r))
      saveCellValue(rowId, colKey, editValue)
    }
    setEditingCell(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleToggle = (rowId, colKey, currentValue, options) => {
    const currentIdx = options.indexOf(currentValue || '')
    const nextIdx = (currentIdx + 1) % options.length
    const newValue = options[nextIdx]
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [colKey]: newValue } : r))
    saveCellValue(rowId, colKey, newValue)
  }

  const handleSelectChange = (rowId, colKey, value) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [colKey]: value } : r))
    saveCellValue(rowId, colKey, value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      // 다음 셀로 이동
      if (editingCell) {
        const colIdx = COLUMNS.findIndex(c => c.key === editingCell.colKey)
        const rowIdx = rows.findIndex(r => r.id === editingCell.rowId)
        if (e.shiftKey) {
          // 이전 셀
          if (colIdx > 0) {
            const prevCol = COLUMNS[colIdx - 1]
            if (prevCol.editable && prevCol.type !== 'toggle' && prevCol.type !== 'select') {
              startEditing(editingCell.rowId, prevCol.key, rows[rowIdx]?.[prevCol.key])
            }
          }
        } else {
          // 다음 셀
          if (colIdx < COLUMNS.length - 1) {
            const nextCol = COLUMNS[colIdx + 1]
            if (nextCol.editable && nextCol.type !== 'toggle' && nextCol.type !== 'select') {
              startEditing(editingCell.rowId, nextCol.key, rows[rowIdx]?.[nextCol.key])
            }
          }
        }
      }
    }
  }

  const handleExportExcel = () => {
    const activeSheet = sheets.find(s => s.id === activeSheetId)
    const excelData = rows.map((r, i) => ({
      '번호': i + 1,
      '이름': r.creator_name || '',
      '채널 링크': r.channel_link || '',
      '전화번호/이메일': r.phone_email || '',
      '카카오톡': r.kakao_registered || '',
      '연락여부': r.contacted || '',
      '답변': r.contact_response || '',
      '진행 여부': r.progress_status || '',
      '추천': r.recommended || '',
      '업로드 링크': r.upload_link || '',
      '미팅': r.meeting_done || '',
      '미팅 날짜': r.meeting_date || '',
      '코멘트': r.comment || '',
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    XLSX.utils.book_append_sheet(wb, ws, activeSheet?.name || 'Sheet1')
    XLSX.writeFile(wb, `상담_스프레드시트_${activeSheet?.name || 'data'}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const getToggleBadge = (value) => {
    if (value === 'O') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs cursor-pointer select-none">O</Badge>
    if (value === 'X') return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs cursor-pointer select-none">X</Badge>
    return <Badge className="bg-gray-50 text-gray-400 hover:bg-gray-100 text-xs cursor-pointer select-none">-</Badge>
  }

  const getStatusBadge = (value) => {
    const map = {
      '진행': 'bg-blue-100 text-blue-700',
      '보류': 'bg-yellow-100 text-yellow-700',
      '거절': 'bg-red-100 text-red-700',
      '완료': 'bg-green-100 text-green-700',
    }
    if (!value) return <span className="text-gray-400 text-xs">-</span>
    return <Badge className={`${map[value] || 'bg-gray-100 text-gray-600'} hover:${map[value] || 'bg-gray-100'} text-xs`}>{value}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 시트 탭 바 */}
      <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto">
        <div className="flex items-center gap-1 flex-shrink-0">
          {sheets.map(sheet => (
            <div key={sheet.id} className="relative group flex items-center">
              {editingSheetId === sheet.id ? (
                <div className="flex items-center gap-1">
                  <input
                    value={editSheetName}
                    onChange={e => setEditSheetName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSheet(sheet.id)
                      if (e.key === 'Escape') setEditingSheetId(null)
                    }}
                    className="border rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                    autoFocus
                  />
                  <button onClick={() => handleRenameSheet(sheet.id)} className="text-green-600 hover:text-green-700">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingSheetId(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveSheetId(sheet.id)}
                  onDoubleClick={() => {
                    setEditingSheetId(sheet.id)
                    setEditSheetName(sheet.name)
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 transition-colors ${
                    activeSheetId === sheet.id
                      ? 'bg-white text-[#6C5CE7] border-[#E8E8E8]'
                      : 'bg-[#F8F9FA] text-[#636E72] border-transparent hover:bg-[#F0EDFF] hover:text-[#6C5CE7]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3 h-3" />
                    {sheet.name}
                    <span className="text-[10px] text-gray-400">({sheet.row_count})</span>
                  </span>
                </button>
              )}
              {activeSheetId === sheet.id && editingSheetId !== sheet.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(sheet.id) }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-100 text-red-500 rounded-full items-center justify-center text-[10px] hidden group-hover:flex hover:bg-red-200"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#6C5CE7] bg-[#F0EDFF] rounded-lg hover:bg-[#E4DFFA] transition-colors flex-shrink-0"
        >
          <Plus className="w-3 h-3" />
          새 시트
        </button>

        {activeSheetId && rows.length > 0 && (
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#636E72] bg-[#F8F9FA] rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0 ml-auto"
          >
            <Download className="w-3 h-3" />
            엑셀 다운로드
          </button>
        )}
      </div>

      {/* 스프레드시트 본문 */}
      {!activeSheetId ? (
        <Card className="border-[#E8E8E8]">
          <CardContent className="flex flex-col items-center justify-center py-20 text-[#636E72]">
            <FileSpreadsheet className="w-10 h-10 mb-3 text-[#B2BEC3]" />
            <p className="text-sm mb-2">스프레드시트를 선택하거나 새로 만드세요</p>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-[#6C5CE7] hover:bg-[#5A4BD1]">
              <Plus className="w-4 h-4 mr-1" /> 새 시트 만들기
            </Button>
          </CardContent>
        </Card>
      ) : rowsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
        </div>
      ) : (
        <Card className="border-[#E8E8E8]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b">
                    <th className="py-2.5 px-2 font-medium text-[#636E72] text-center w-[40px] border-r border-[#E8E8E8]">#</th>
                    {COLUMNS.map(col => (
                      <th key={col.key} className={`py-2.5 px-2 font-medium text-[#636E72] text-left ${col.width} border-r border-[#E8E8E8] last:border-r-0`}>
                        {col.label}
                      </th>
                    ))}
                    <th className="py-2.5 px-2 font-medium text-[#636E72] text-center w-[40px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-[#F0F0F0] hover:bg-[#FAFAFE] group">
                      <td className="py-1.5 px-2 text-center text-[#B2BEC3] border-r border-[#F0F0F0] font-mono">
                        {idx + 1}
                      </td>
                      {COLUMNS.map(col => {
                        const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key
                        const cellValue = row[col.key] || ''

                        // 토글 타입
                        if (col.type === 'toggle') {
                          return (
                            <td
                              key={col.key}
                              className="py-1.5 px-2 text-center border-r border-[#F0F0F0] last:border-r-0 cursor-pointer"
                              onClick={() => handleToggle(row.id, col.key, cellValue, col.options)}
                            >
                              {getToggleBadge(cellValue)}
                            </td>
                          )
                        }

                        // 셀렉트 타입
                        if (col.type === 'select') {
                          return (
                            <td key={col.key} className="py-1.5 px-2 border-r border-[#F0F0F0] last:border-r-0">
                              <select
                                value={cellValue}
                                onChange={e => handleSelectChange(row.id, col.key, e.target.value)}
                                className="w-full bg-transparent border-0 text-xs focus:outline-none cursor-pointer"
                              >
                                {col.options.map(opt => (
                                  <option key={opt} value={opt}>{opt || '-'}</option>
                                ))}
                              </select>
                            </td>
                          )
                        }

                        // 링크 타입
                        if (col.isLink && cellValue && !isEditing) {
                          return (
                            <td
                              key={col.key}
                              className="py-1.5 px-2 border-r border-[#F0F0F0] last:border-r-0"
                              onDoubleClick={() => startEditing(row.id, col.key, cellValue)}
                            >
                              <a
                                href={cellValue.startsWith('http') ? cellValue : `https://${cellValue}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#6C5CE7] hover:underline flex items-center gap-1 truncate max-w-full"
                                onClick={e => e.stopPropagation()}
                              >
                                <span className="truncate">{cellValue.replace(/https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/reels\/?$/, '').replace(/\/$/, '')}</span>
                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                              </a>
                            </td>
                          )
                        }

                        // 일반 텍스트 타입 (인라인 편집)
                        return (
                          <td
                            key={col.key}
                            className={`py-0 px-0 border-r border-[#F0F0F0] last:border-r-0 ${isEditing ? 'bg-blue-50' : ''}`}
                            onDoubleClick={() => col.editable && startEditing(row.id, col.key, cellValue)}
                          >
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full px-2 py-1.5 text-xs bg-transparent border-0 focus:outline-none focus:ring-0"
                              />
                            ) : (
                              <div className="px-2 py-1.5 min-h-[28px] text-[#1A1A2E] truncate cursor-text" title={cellValue}>
                                {cellValue || <span className="text-gray-300">-</span>}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-1.5 px-1 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 행 추가 버튼 */}
            <div className="border-t border-[#F0F0F0]">
              <button
                onClick={handleAddRow}
                className="w-full py-2 text-xs text-[#636E72] hover:text-[#6C5CE7] hover:bg-[#FAFAFE] transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                새 행 추가
              </button>
            </div>

            {/* 하단 정보 */}
            <div className="border-t border-[#E8E8E8] px-4 py-2 flex items-center justify-between bg-[#FAFAFA]">
              <span className="text-[10px] text-[#B2BEC3]">
                총 {rows.length}명 · 더블클릭으로 편집 · Tab으로 이동
              </span>
              <span className="text-[10px] text-[#B2BEC3]">
                변경사항 자동 저장
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 새 시트 생성 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-4 h-4 text-[#6C5CE7]" />
              새 스프레드시트 만들기
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#636E72] block mb-1">시트 이름 *</label>
              <input
                value={newSheetName}
                onChange={e => setNewSheetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateSheet()}
                placeholder="예: 2024년 3월 미팅 요청"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-[#636E72] block mb-1">설명 (선택)</label>
              <input
                value={newSheetDesc}
                onChange={e => setNewSheetDesc(e.target.value)}
                placeholder="간단한 설명"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>취소</Button>
              <Button
                size="sm"
                onClick={handleCreateSheet}
                disabled={creating || !newSheetName.trim()}
                className="bg-[#6C5CE7] hover:bg-[#5A4BD1]"
              >
                {creating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                생성
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 시트 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">스프레드시트 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#636E72]">
            이 스프레드시트와 모든 데이터가 삭제됩니다. 계속하시겠습니까?
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>취소</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDeleteSheet(deleteConfirm)}
            >
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
