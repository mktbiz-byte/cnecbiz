// 팝빌 알림톡 템플릿 정의
// 중복 템플릿 통합 및 개선

export const POPBILL_TEMPLATES = {
  // ===== 기업용 템플릿 (@크넥) =====
  COMPANY: {
    // 회원가입
    SIGNUP: {
      code: '025100000912',
      name: '회원가입',
      description: '기업 회원가입 환영 메시지',
      params: ['회원명']
    },
    
    // 포인트/결제 관련 (통합)
    PAYMENT_REQUEST: {
      code: '025100000918',
      name: '캠페인 신청 및 입금 안내',
      description: '캠페인 신청 완료 후 입금 계좌 안내 (캠페인용)',
      params: ['회사명', '캠페인명', '금액']
    },
    
    POINT_CHARGE_COMPLETE: {
      code: '025100000943',
      name: '포인트 충전 완료',
      description: '입금 확인 및 포인트 충전 완료 알림 (통합)',
      params: ['회사명', '포인트', '캠페인명'] // 캠페인명은 선택적
    },
    
    // 캠페인 진행 관련
    CAMPAIGN_APPROVED: {
      code: '025100001005',
      name: '캠페인 승인 및 모집 시작',
      description: '캠페인 승인 및 크리에이터 모집 시작 알림',
      params: ['회사명', '캠페인명', '시작일', '마감일', '모집인원']
    },
    
    CAMPAIGN_RECRUITMENT_CLOSED: {
      code: '025100001006',
      name: '모집 마감 크리에이터 선정 요청',
      description: '모집 마감 및 크리에이터 선정 요청',
      params: ['회사명', '캠페인명', '지원자수']
    },
    
    GUIDE_SUBMITTED: {
      code: '025100001007',
      name: '크리에이터 가이드 제출 검수 요청',
      description: '크리에이터가 제출한 가이드 검수 요청',
      params: ['회사명', '캠페인명', '크리에이터명']
    },
    
    VIDEO_SUBMITTED: {
      code: '025100001008',
      name: '영상 촬영 완료 검수 요청',
      description: '크리에이터가 제출한 영상 검수 요청',
      params: ['회사명', '캠페인명', '크리에이터명']
    },
    
    CAMPAIGN_COMPLETED: {
      code: '025100001009',
      name: '최종 영상 완료 보고서 확인 요청',
      description: '캠페인 최종 완료 및 보고서 확인 요청',
      params: ['회사명', '캠페인명']
    },
    
    CAMPAIGN_REVIEW_REQUESTED: {
      code: '025100001010',
      name: '캠페인 검수 신청',
      description: '캠페인 검수 신청 접수 알림',
      params: ['회사명', '캠페인명', '시작일', '마감일', '모집인원']
    }
  },
  
  // ===== 크리에이터용 템플릿 (@크넥_크리에이터) =====
  CREATOR: {
    // 회원가입
    SIGNUP: {
      code: '025100001022',
      name: '크리에이터 회원가입',
      description: '크리에이터 회원가입 환영 메시지',
      params: ['이름']
    },
    
    // 캠페인 선정 및 준비
    CAMPAIGN_SELECTED: {
      code: '025100001011',
      name: '캠페인 선정 완료',
      description: '캠페인 선정 축하 및 준비사항 안내',
      params: ['크리에이터명', '캠페인명']
    },
    
    CAMPAIGN_CANCELLED: {
      code: '025110000796',
      name: '선정 취소',
      description: '캠페인 선정 취소 안내',
      params: ['크리에이터명', '캠페인명', '사유']
    },
    
    GUIDE_DELIVERED: {
      code: '025100001012',
      name: '촬영 가이드 전달 알림',
      description: '촬영 가이드 전달 및 제출 기한 안내',
      params: ['크리에이터명', '캠페인명', '제출기한']
    },
    
    // 영상 제출 관련
    VIDEO_DEADLINE_3DAYS: {
      code: '025100001013',
      name: '영상 제출 기한 3일 전 안내',
      description: '영상 제출 기한 3일 전 리마인더',
      params: ['크리에이터명', '캠페인명', '제출기한']
    },
    
    VIDEO_DEADLINE_2DAYS: {
      code: '025100001014',
      name: '영상 제출 기한 2일 전 안내',
      description: '영상 제출 기한 2일 전 리마인더',
      params: ['크리에이터명', '캠페인명', '제출기한']
    },
    
    VIDEO_DEADLINE_TODAY: {
      code: '025100001015',
      name: '영상 제출 기한 당일 안내',
      description: '영상 제출 기한 당일 긴급 알림',
      params: ['크리에이터명', '캠페인명', '제출기한']
    },
    
    VIDEO_REVISION_REQUESTED: {
      code: '025100001016',
      name: '영상 수정 요청 알림',
      description: '영상 수정 요청 및 재제출 기한 안내',
      params: ['크리에이터명', '캠페인명', '요청일', '재제출기한']
    },
    
    VIDEO_APPROVED: {
      code: '025100001017',
      name: '영상 승인 완료',
      description: '영상 승인 및 SNS 업로드 안내',
      params: ['크리에이터명', '캠페인명', '업로드기한']
    },
    
    // 보상 및 출금 관련
    CAMPAIGN_REWARD_PAID: {
      code: '025100001018',
      name: '캠페인 완료 포인트 지급 알림',
      description: '캠페인 완료 및 포인트 지급 알림',
      params: ['크리에이터명', '캠페인명', '완료일']
    },
    
    WITHDRAWAL_REQUESTED: {
      code: '025100001019',
      name: '출금 접수 완료',
      description: '출금 신청 접수 및 처리 안내',
      params: ['크리에이터명', '출금금액', '신청일']
    },
    
    WITHDRAWAL_COMPLETED: {
      code: '025100001020',
      name: '출금 완료 알림',
      description: '출금 완료 및 입금 확인 안내',
      params: ['크리에이터명', '입금일']
    },
    
    // 패널티 관련
    DEADLINE_OVERDUE: {
      code: '025100001021',
      name: '캠페인 제출 기한 지연',
      description: '제출 기한 지연 경고 및 패널티 안내',
      params: ['크리에이터명', '캠페인명', '제출기한']
    }
  }
};

// 템플릿 코드로 템플릿 정보 찾기
export function getTemplateByCode(code) {
  for (const category of Object.values(POPBILL_TEMPLATES)) {
    for (const template of Object.values(category)) {
      if (template.code === code) {
        return template;
      }
    }
  }
  return null;
}

// 템플릿 이름으로 템플릿 정보 찾기
export function getTemplateByName(name) {
  for (const category of Object.values(POPBILL_TEMPLATES)) {
    for (const template of Object.values(category)) {
      if (template.name === name) {
        return template;
      }
    }
  }
  return null;
}
