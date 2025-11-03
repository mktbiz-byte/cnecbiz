# 네이버웍스 메시지 전송 설정 가이드

## 환경 변수 설정

Netlify 환경 변수에 다음 4개만 설정하면 됩니다:

```
NAVER_WORKS_CLIENT_ID=0JyXd7oP7CtFHSwo2LI6
NAVER_WORKS_CLIENT_SECRET=6Mmc2h9nI1
NAVER_WORKS_BOT_ID=10653024
NAVER_WORKS_CHANNEL_ID=220000001108704
```

## 작동 방식

1. **JWT 자동 생성**: Private Key를 코드에 포함하여 매 요청마다 JWT 토큰 생성
2. **Access Token 자동 발급**: JWT로 Access Token 발급 (1시간 유효)
3. **메시지 전송**: Access Token으로 네이버웍스 메시지방에 메시지 전송

## 장점

- ✅ 환경 변수 크기 제한 문제 해결 (Private Key를 코드에 포함)
- ✅ 자동으로 Access Token 생성 (수동 갱신 불필요)
- ✅ 매 요청마다 새로운 토큰 생성 (만료 걱정 없음)

## 보안 주의사항

- Private Key가 코드에 포함되어 있으므로 GitHub 저장소를 **Private**로 유지하세요
- Netlify Functions는 서버 사이드에서 실행되므로 클라이언트에 노출되지 않습니다
- 환경 변수는 Netlify 대시보드에서만 관리하세요

## 테스트 방법

1. Netlify 환경 변수 설정 완료
2. 배포 완료 대기
3. `https://cnectotal.netlify.app/featured-creators` 접속
4. 크리에이터 선택 후 문의 전송
5. 네이버웍스 메시지방 (채널 ID: 220000001108704) 확인
