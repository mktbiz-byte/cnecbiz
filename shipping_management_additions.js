// Add these state variables after line 38 (selectedParticipants)
const [trackingChanges, setTrackingChanges] = useState({}) // {participantId: {tracking_number, shipping_company}}
const [bulkCourierCompany, setBulkCourierCompany] = useState('')

// Replace handleTrackingNumberChange function to not save immediately
const handleTrackingNumberChange = (participantId, field, value) => {
  setTrackingChanges(prev => ({
    ...prev,
    [participantId]: {
      ...prev[participantId],
      [field]: value
    }
  }))
}

// Add new function to save individual tracking number
const saveTrackingNumber = async (participantId) => {
  const changes = trackingChanges[participantId]
  if (!changes) {
    alert('변경사항이 없습니다.')
    return
  }

  try {
    const participant = participants.find(p => p.id === participantId)
    if (!participant) throw new Error('참여자를 찾을 수 없습니다.')

    const updateData = {}
    if (changes.tracking_number !== undefined) updateData.tracking_number = changes.tracking_number
    if (changes.shipping_company !== undefined) updateData.shipping_company = changes.shipping_company

    // campaign_participants 업데이트
    const { error } = await supabase
      .from('campaign_participants')
      .update(updateData)
      .eq('id', participantId)

    if (error) throw error

    // applications 테이블도 업데이트
    const { error: appError } = await supabase
      .from('applications')
      .update(updateData)
      .eq('campaign_id', participant.campaign_id)
      .eq('applicant_name', participant.creator_name)
      .eq('status', 'selected')

    if (appError) throw appError

    // 저장된 변경사항 제거
    setTrackingChanges(prev => {
      const newChanges = { ...prev }
      delete newChanges[participantId]
      return newChanges
    })

    await fetchParticipants()
    alert('송장번호가 저장되었습니다.')
  } catch (error) {
    console.error('Error saving tracking number:', error)
    alert('송장번호 저장에 실패했습니다: ' + error.message)
  }
}

// Add function to export shipping info to Excel
const exportShippingInfo = () => {
  const XLSX = require('xlsx')
  
  const data = filteredParticipants.map(p => ({
    '크리에이터명': p.creator_name,
    '연락처': p.creator_phone || '',
    '우편번호': p.postal_code || '',
    '주소': p.address || '',
    '상세주소': p.address_detail || '',
    '배송시 요청사항': p.delivery_request || ''
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '배송정보')
  XLSX.writeFile(wb, `${campaign.title}_배송정보.xlsx`)
}

// Add function to download tracking number template
const downloadTrackingTemplate = () => {
  const XLSX = require('xlsx')
  
  const data = filteredParticipants.map(p => ({
    '크리에이터명': p.creator_name,
    '송장번호': ''
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '송장번호')
  XLSX.writeFile(wb, `${campaign.title}_송장번호_템플릿.xlsx`)
}

// Add function to upload tracking numbers from Excel
const uploadTrackingNumbers = async (file) => {
  const XLSX = require('xlsx')
  
  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    let successCount = 0
    let failCount = 0

    for (const row of jsonData) {
      const creatorName = row['크리에이터명']
      const trackingNumber = row['송장번호']

      if (!creatorName || !trackingNumber) continue

      const participant = participants.find(p => p.creator_name === creatorName)
      if (!participant) {
        failCount++
        continue
      }

      try {
        await supabase
          .from('campaign_participants')
          .update({ tracking_number: trackingNumber })
          .eq('id', participant.id)

        await supabase
          .from('applications')
          .update({ tracking_number: trackingNumber })
          .eq('campaign_id', participant.campaign_id)
          .eq('applicant_name', participant.creator_name)
          .eq('status', 'selected')

        successCount++
      } catch (error) {
        console.error(`Error updating ${creatorName}:`, error)
        failCount++
      }
    }

    await fetchParticipants()
    alert(`송장번호 업로드 완료!\n성공: ${successCount}건\n실패: ${failCount}건`)
  } catch (error) {
    console.error('Error uploading tracking numbers:', error)
    alert('송장번호 업로드에 실패했습니다: ' + error.message)
  }
}

// Add function to bulk update courier company
const bulkUpdateCourier = async () => {
  if (selectedParticipants.length === 0) {
    alert('크리에이터를 선택해주세요.')
    return
  }

  if (!bulkCourierCompany) {
    alert('택배사를 선택해주세요.')
    return
  }

  try {
    for (const participantId of selectedParticipants) {
      const participant = participants.find(p => p.id === participantId)
      if (!participant) continue

      await supabase
        .from('campaign_participants')
        .update({ shipping_company: bulkCourierCompany })
        .eq('id', participantId)

      await supabase
        .from('applications')
        .update({ shipping_company: bulkCourierCompany })
        .eq('campaign_id', participant.campaign_id)
        .eq('applicant_name', participant.creator_name)
        .eq('status', 'selected')
    }

    await fetchParticipants()
    alert(`${selectedParticipants.length}명의 택배사가 변경되었습니다.`)
    setSelectedParticipants([])
    setBulkCourierCompany('')
  } catch (error) {
    console.error('Error bulk updating courier:', error)
    alert('택배사 일괄 수정에 실패했습니다: ' + error.message)
  }
}
