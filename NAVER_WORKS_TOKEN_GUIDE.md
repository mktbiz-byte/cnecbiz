# 네이버웍스 Access Token 갱신 가이드

## 문제점
AWS Lambda는 환경 변수 총 크기를 4KB로 제한하기 때문에, Private Key를 직접 저장할 수 없습니다.

## 해결 방법
Access Token을 환경 변수로 저장하고, 1시간마다 수동 또는 자동으로 갱신합니다.

## Netlify 환경 변수 설정

다음 3개의 환경 변수만 설정하면 됩니다:

```
NAVER_WORKS_ACCESS_TOKEN=your_access_token
NAVER_WORKS_BOT_ID=your_bot_id
NAVER_WORKS_CHANNEL_ID=220000001108704
```

## Access Token 생성 방법

### 방법 1: 로컬에서 생성 (권장)

1. 프로젝트 루트에서 다음 스크립트 실행:

```bash
node generate_naver_works_jwt.js
```

2. 생성된 JWT 토큰을 복사

3. JWT 토큰으로 Access Token 발급:

```bash
curl -X POST https://auth.worksmobile.com/oauth2/v2.0/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "assertion": "여기에_JWT_토큰_붙여넣기"
  }'
```

4. 응답에서 `access_token` 값을 복사

5. Netlify 환경 변수 `NAVER_WORKS_ACCESS_TOKEN`에 설정

### 방법 2: Make.com 자동화 (권장)

Make.com에서 1시간마다 자동으로 Access Token을 갱신하고 Netlify 환경 변수를 업데이트하도록 설정할 수 있습니다.

#### Make.com 시나리오 구성

1. **Schedule Trigger**: 매 50분마다 실행
2. **HTTP Request**: JWT 토큰으로 Access Token 발급
   - URL: `https://auth.worksmobile.com/oauth2/v2.0/token`
   - Method: POST
   - Body: 
     ```json
     {
       "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
       "assertion": "{{JWT_TOKEN}}"
     }
     ```
3. **HTTP Request**: Netlify API로 환경 변수 업데이트
   - URL: `https://api.netlify.com/api/v1/accounts/{account_id}/env/{key}`
   - Method: PATCH
   - Headers:
     - `Authorization: Bearer {netlify_token}`
   - Body:
     ```json
     {
       "value": "{{access_token}}"
     }
     ```

## Access Token 만료 시

Access Token이 만료되면 다음 에러가 발생합니다:

```
Access Token이 만료되었습니다. 관리자에게 문의하세요.
```

이 경우 위의 방법으로 새로운 Access Token을 생성하여 Netlify 환경 변수를 업데이트하세요.

## 보안 주의사항

- Access Token은 절대 코드에 하드코딩하지 마세요
- Access Token은 환경 변수로만 관리하세요
- Private Key 파일은 안전한 곳에 보관하세요
- Make.com 시나리오에 JWT 토큰을 저장할 때는 변수로 저장하세요
