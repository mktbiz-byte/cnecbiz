export default function HomePageSimple() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>CNEC - 글로벌 인플루언서 마케팅 플랫폼</h1>
      <p style={{ fontSize: '18px', marginBottom: '30px' }}>
        일본, 미국, 대만 등 전 세계 인플루언서 마케팅을 한 곳에서 관리하세요.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '10px' }}>기본형 - 20만원</h3>
          <ul>
            <li>일반 퀄리티 지원자</li>
            <li>기본 보고서</li>
          </ul>
        </div>
        
        <div style={{ border: '2px solid #3b82f6', padding: '20px', borderRadius: '8px', backgroundColor: '#eff6ff' }}>
          <h3 style={{ marginBottom: '10px', color: '#3b82f6' }}>스탠다드 - 30만원 (인기)</h3>
          <ul>
            <li>향상된 퀄리티</li>
            <li>영상 수정 1회</li>
            <li>상세 보고서</li>
          </ul>
        </div>
        
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '10px' }}>프리미엄 - 40만원</h3>
          <ul>
            <li>최고 퀄리티</li>
            <li>영상 수정 1회</li>
            <li>전담 매니저</li>
          </ul>
        </div>
        
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '10px' }}>4주 연속 - 60만원</h3>
          <ul>
            <li>매주 1건씩 4주간</li>
            <li>프리미엄 퀄리티</li>
            <li>주간 성과 리포트</li>
          </ul>
        </div>
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>지원 지역</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', borderRadius: '6px' }}>
            🇯🇵 일본
          </div>
          <div style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', borderRadius: '6px' }}>
            🇺🇸 미국
          </div>
          <div style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', borderRadius: '6px' }}>
            🇹🇼 대만
          </div>
          <div style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', borderRadius: '6px' }}>
            🇰🇷 한국 (별도 문의)
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ 
            padding: '12px 24px', 
            fontSize: '16px', 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          로그인
        </button>
        <button 
          onClick={() => window.location.href = '/signup'}
          style={{ 
            padding: '12px 24px', 
            fontSize: '16px', 
            backgroundColor: '#10b981', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer'
          }}
        >
          회원가입
        </button>
      </div>
      
      <div style={{ marginTop: '60px', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
          © 2025 CNEC. All rights reserved.
        </p>
      </div>
    </div>
  )
}

