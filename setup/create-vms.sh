#!/bin/bash
set -euo pipefail

# CNEC Discovery — GCP VM 생성 스크립트
# 3대의 VM을 각 리전(Seoul/Tokyo/Virginia)에 생성합니다.

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
MACHINE_TYPE="e2-small"
BOOT_DISK_SIZE="30GB"
NETWORK_TAG="cnec-discovery"

echo "========================================"
echo "  CNEC Discovery VM 생성 스크립트"
echo "========================================"
echo ""
echo "프로젝트: ${PROJECT_ID}"
echo ""
echo "생성할 VM:"
echo "  1. cnec-disc-kr (Seoul, asia-northeast3-a)"
echo "  2. cnec-disc-jp (Tokyo, asia-northeast1-a)"
echo "  3. cnec-disc-us (Virginia, us-east1-b)"
echo ""
echo "스펙: ${MACHINE_TYPE}, Ubuntu 22.04, ${BOOT_DISK_SIZE}"
echo ""
read -p "계속 진행하시겠습니까? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "취소되었습니다."
  exit 0
fi

echo ""
echo "========== 방화벽 규칙 생성 =========="
echo "SSH (TCP 22)만 허용하는 방화벽 규칙을 생성합니다."

if gcloud compute firewall-rules describe "${NETWORK_TAG}-ssh" --project="${PROJECT_ID}" &>/dev/null; then
  echo "방화벽 규칙 '${NETWORK_TAG}-ssh'이 이미 존재합니다. 건너뜁니다."
else
  gcloud compute firewall-rules create "${NETWORK_TAG}-ssh" \
    --project="${PROJECT_ID}" \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:22 \
    --target-tags="${NETWORK_TAG}" \
    --description="Allow SSH access to CNEC Discovery VMs"
  echo "방화벽 규칙 생성 완료."
fi

echo ""
echo "========== VM 생성: cnec-disc-kr (Seoul) =========="
gcloud compute instances create cnec-disc-kr \
  --project="${PROJECT_ID}" \
  --zone=asia-northeast3-a \
  --machine-type="${MACHINE_TYPE}" \
  --image-family="${IMAGE_FAMILY}" \
  --image-project="${IMAGE_PROJECT}" \
  --boot-disk-size="${BOOT_DISK_SIZE}" \
  --boot-disk-type=pd-standard \
  --tags="${NETWORK_TAG}" \
  --metadata=region=kr,server_name=cnec-disc-kr \
  --labels=service=cnec-discovery,region=kr
echo "cnec-disc-kr 생성 완료."

echo ""
echo "========== VM 생성: cnec-disc-jp (Tokyo) =========="
gcloud compute instances create cnec-disc-jp \
  --project="${PROJECT_ID}" \
  --zone=asia-northeast1-a \
  --machine-type="${MACHINE_TYPE}" \
  --image-family="${IMAGE_FAMILY}" \
  --image-project="${IMAGE_PROJECT}" \
  --boot-disk-size="${BOOT_DISK_SIZE}" \
  --boot-disk-type=pd-standard \
  --tags="${NETWORK_TAG}" \
  --metadata=region=jp,server_name=cnec-disc-jp \
  --labels=service=cnec-discovery,region=jp
echo "cnec-disc-jp 생성 완료."

echo ""
echo "========== VM 생성: cnec-disc-us (Virginia) =========="
gcloud compute instances create cnec-disc-us \
  --project="${PROJECT_ID}" \
  --zone=us-east1-b \
  --machine-type="${MACHINE_TYPE}" \
  --image-family="${IMAGE_FAMILY}" \
  --image-project="${IMAGE_PROJECT}" \
  --boot-disk-size="${BOOT_DISK_SIZE}" \
  --boot-disk-type=pd-standard \
  --tags="${NETWORK_TAG}" \
  --metadata=region=us,server_name=cnec-disc-us \
  --labels=service=cnec-discovery,region=us
echo "cnec-disc-us 생성 완료."

echo ""
echo "========================================"
echo "  모든 VM 생성이 완료되었습니다!"
echo "========================================"
echo ""
echo "다음 단계:"
echo "  각 VM에 SSH 접속 후 init-vm.sh를 실행하세요."
echo ""
echo "  gcloud compute ssh cnec-disc-kr --zone=asia-northeast3-a"
echo "  gcloud compute ssh cnec-disc-jp --zone=asia-northeast1-a"
echo "  gcloud compute ssh cnec-disc-us --zone=us-east1-b"
