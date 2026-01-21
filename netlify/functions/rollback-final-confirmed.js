// 롤백 스크립트: 잘못 설정된 final_confirmed_at을 null로 되돌림
const { createClient } = require('@supabase/supabase-js')

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
)

// 잘못 업데이트된 video_submission ID 목록 (status가 submitted인 것들 포함)
const wronglyUpdatedIds = [
  "7984bf77-aa08-440c-8d40-096cab063218",
  "16e492a2-7d05-4e70-869a-f5fd9de30e65",
  "6460d04a-9f27-4aa7-8685-0454582b54e2",
  "6c2f5f8d-91bf-4de3-86e0-fdb39ebe9dcb",
  "ff63ae79-92ae-426f-8442-57370164e164",
  "02a1b266-9ef1-4799-9d88-1dbea0e8365e",
  "54978778-f330-409f-932b-9e9452e2990c",
  "2a3067ac-9876-4ce6-973a-ae6cfcd9f822",
  "17f0779b-1962-4d78-93c5-43116cf41472",
  "852ca576-fd9f-46e7-9f0b-759b60f54095",
  "054359f5-5e01-4e32-819b-b2ac94af7699",
  "afd4e405-f722-4517-a189-65b9d4d1b95c",
  "efa4c19f-f3a7-451a-89a2-f3b88500d230",
  "bff5c6fe-757a-4728-8cbe-e9d09c253510",
  "97917e02-65ef-4da6-8901-6d64d50c36c1",
  "84882282-91f4-4fb5-b89d-2d39a6dc3351",
  "640e3f10-4176-4fef-90ad-f9f3fd9cfe43",
  "6fedb962-e41c-4204-85c4-fd718311cbdd",
  "2b8b7b19-d484-4eae-949b-18492650fa3e",
  "0ae439f1-2017-4917-bf5c-b98dcdcc464b",
  "35905581-1469-4ea1-b9f8-51f09426207a",
  "04c2bc50-0d54-4377-9da9-9a4963e34a74",
  "33ef830f-8e1a-4805-b900-977b4fbfc654",
  "23fc04c9-ab23-421d-817d-5d4580c3ab2f",
  "d5f8463e-c4de-4f62-b2d6-8ad02514d4ad",
  "d4ff3fa2-377f-48d0-9381-09c8b450dfd2",
  "20a815bd-cfb7-42fb-9095-8e4bda50218c",
  "c5d6b4d8-99c9-4bc1-83d8-354a31bfc13a",
  "2ecaafe2-4138-49f7-b4d7-04cea852b427",
  "dd8cb02a-6010-4ab0-92d7-e10bd0c010b3",
  "5abc5a7d-72c4-41b0-a857-22041ccf8e9e",
  "27e35ff5-d3e8-4552-9302-46fd9eff3532",
  "e0310c44-4f04-41a4-b9b2-b68649379b9d",
  "02049781-9fbf-452f-a7f3-c31bc3f432f9",
  "af9bc193-3298-4c4b-88e6-654f6cd02a98",
  "6f33e066-dd6f-46c5-a4d6-e9f881ad1664",
  "6ecb7dab-226b-450d-86f2-0c4b958d487f",
  "c0e951fb-0e3c-447b-a03f-70251bfec229",
  "ea48ea02-6c36-4ea1-9860-dfbb993efb27",
  "8b2cd2c1-3f7c-41d1-ba55-cda35c309c0d",
  "30a5d937-fbc2-4568-a3bc-520ff0d3659f",
  "afd00287-fa82-4ad0-a6de-8761b57fd627",
  "ab804a5b-dcfe-4385-8489-130e2a5a9794",
  "aba6170d-4669-420e-977e-db503bc42979",
  "d6c6d811-0ed0-4022-964f-1a2aadfb0de9",
  "b0f07ec1-9775-413b-ad45-bcc2c253d9ae",
  "087338fa-f002-4d63-97e4-2b38b5a03c40"
]

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    let rolledBack = 0
    let errors = []

    for (const id of wronglyUpdatedIds) {
      const { error } = await supabaseKorea
        .from('video_submissions')
        .update({ final_confirmed_at: null })
        .eq('id', id)

      if (error) {
        errors.push({ id, error: error.message })
      } else {
        rolledBack++
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `롤백 완료: ${rolledBack}건`,
        total: wronglyUpdatedIds.length,
        rolledBack,
        errors
      })
    }
  } catch (error) {
    console.error('[rollback-final-confirmed] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
