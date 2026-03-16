# CNEC Discovery

K-뷰티 크리에이터 자동 발굴 시스템. GCP VM 3대(Seoul/Tokyo/Virginia)에서 실행되며, Influencers Club API + Apify를 통해 크리에이터를 발굴하고, Gemini AI로 적합도를 평가한 뒤, AWS SES와 Instagram DM으로 아웃리치합니다.

## 아키텍처

```
[GCP VM: cnec-disc-kr]  ─┐
[GCP VM: cnec-disc-jp]  ─┤── Supabase BIZ DB ── cnecbiz.com 대시보드
[GCP VM: cnec-disc-us]  ─┘
```

## 워커 구성

| 워커 | 실행 시간 | 간격 | 설명 |
|------|----------|------|------|
| discovery | 00:00~10:00 | 10분 | Influencers Club API 크리에이터 발굴 |
| apify | 10:00~13:00 | 30분 | Apify 소셜 미디어 스크래핑 |
| filter | 10:00~13:00 | 20분 | Gemini AI K-뷰티 점수 평가 |
| verify | 06:00~09:00 | 15분 | ZeroBounce 이메일 검증 |
| email | 13:00~22:00 | 5분 | AWS SES 이메일 발송 |
| dm | 18:00~21:00 | 10분 | Instagram DM 발송 |
| heartbeat | 상시 | 30초 | 서버 상태 보고 |

## 설치

```bash
# 1. VM 생성 (프로젝트 루트에서)
bash setup/create-vms.sh

# 2. VM 접속 후 초기화
sudo bash setup/init-vm.sh kr  # kr/jp/us

# 3. 코드 배포
scp -r setup/cnec-discovery/* cnec@VM_IP:/home/cnec/cnec-discovery/

# 4. 환경변수 설정
cp .env.example .env
vi .env

# 5. PM2 시작
pm2 start ecosystem.config.js
pm2 save
```

## 수동 실행

```bash
# 스케줄러 모드 (전체 크론잡)
python3.11 main.py --mode scheduler

# 단일 워커 실행
python3.11 main.py --mode worker --worker discovery
python3.11 main.py --mode worker --worker email
```

## 테스트

```bash
python3.11 -m pytest test/test_pipeline.py -v
```

## 모니터링

- 대시보드: https://cnecbiz.com/admin/discovery
- PM2: `pm2 status`, `pm2 logs`
