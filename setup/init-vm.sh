#!/bin/bash
set -euo pipefail

# CNEC Discovery — VM 초기 셋업 스크립트
# 사용법: sudo bash init-vm.sh [kr|jp|us]

REGION="${1:-}"

if [[ -z "$REGION" ]]; then
  echo "사용법: sudo bash init-vm.sh [kr|jp|us]"
  echo "  kr: Asia/Seoul (KST)"
  echo "  jp: Asia/Tokyo (JST)"
  echo "  us: America/New_York (EST)"
  exit 1
fi

# 타임존 설정
case "$REGION" in
  kr) TIMEZONE="Asia/Seoul" ;;
  jp) TIMEZONE="Asia/Tokyo" ;;
  us) TIMEZONE="America/New_York" ;;
  *)
    echo "지원하지 않는 리전입니다: $REGION (kr, jp, us 중 선택)"
    exit 1
    ;;
esac

echo "========================================"
echo "  CNEC Discovery VM 초기 셋업"
echo "  리전: ${REGION} (${TIMEZONE})"
echo "========================================"
echo ""
read -p "계속 진행하시겠습니까? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "취소되었습니다."
  exit 0
fi

echo ""
echo "========== 시스템 업데이트 =========="
apt-get update -y
apt-get upgrade -y

echo ""
echo "========== 타임존 설정: ${TIMEZONE} =========="
timedatectl set-timezone "${TIMEZONE}"

echo ""
echo "========== Python 3.11 설치 =========="
apt-get install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update -y
apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip

# python3.11을 기본 python3으로 설정
update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

echo ""
echo "========== apt_pkg 모듈 복구 =========="
# Python 3.11 기본 설정 후 apt_pkg 호환성 문제 해결
ln -sf /usr/lib/python3/dist-packages/apt_pkg.cpython-310-x86_64-linux-gnu.so /usr/lib/python3/dist-packages/apt_pkg.so 2>/dev/null || true

echo ""
echo "========== Node.js 20 설치 =========="
apt-get remove -y nodejs libnode72 2>/dev/null || true
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo ""
echo "========== PM2 글로벌 설치 =========="
npm install -g pm2

echo ""
echo "========== pip 패키지 설치 =========="
pip3.11 install --upgrade pip
pip3.11 install \
  supabase \
  httpx \
  apscheduler \
  google-generativeai \
  aiohttp \
  python-dotenv \
  zerobounce-sdk \
  boto3 \
  psutil \
  requests \
  jinja2 \
  apify-client

echo ""
echo "========== 프로젝트 디렉토리 생성 =========="
# cnec 사용자 생성 (없는 경우)
if ! id -u cnec &>/dev/null; then
  useradd -m -s /bin/bash cnec
  echo "cnec 사용자 생성 완료."
fi

mkdir -p /home/cnec/cnec-discovery/logs
chown -R cnec:cnec /home/cnec/cnec-discovery

echo ""
echo "========== PM2 시작 스크립트 등록 =========="
pm2 startup systemd -u cnec --hp /home/cnec

echo ""
echo "========================================"
echo "  초기 셋업 완료!"
echo "========================================"
echo ""
echo "다음 단계:"
echo "  1. /home/cnec/cnec-discovery/ 에 프로젝트 코드를 배포하세요."
echo "  2. .env 파일을 생성하고 환경변수를 설정하세요."
echo "  3. pm2 start ecosystem.config.js 로 워커를 시작하세요."
echo ""
echo "현재 시간대: $(timedatectl show --property=Timezone --value)"
echo "Python: $(python3.11 --version)"
echo "Node.js: $(node --version)"
echo "PM2: $(pm2 --version)"
