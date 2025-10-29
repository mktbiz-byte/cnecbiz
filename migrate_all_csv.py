#!/usr/bin/env python3
import csv
import os
from supabase import create_client

# Supabase 설정
SUPABASE_URL = "https://vluqhvuhykncicgvkosd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXFodnVoeWtuY2ljZ3Zrb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg2MzAsImV4cCI6MjA3Njg0NDYzMH0.ikEqdx6Le54YJUP-NROKg6EmeHJ4TbKkQ76pw29OQG8"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# CSV 파일 목록
csv_files = [
    "/home/ubuntu/upload/1.csv",  # 매출
    "/home/ubuntu/upload/2.csv"   # 비용
]

all_records = []

for csv_file in csv_files:
    print(f"{csv_file} 읽는 중...")
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        # 첫 줄이 헤더인지 확인
        first_line = f.readline().strip()
        f.seek(0)
        
        # 헤더가 있으면 DictReader, 없으면 직접 파싱
        if first_line.startswith('date') or first_line.startswith('record_date'):
            reader = csv.DictReader(f)
            for row in reader:
                record = {
                    'record_date': row.get('date') or row.get('record_date'),
                    'type': row['type'],
                    'amount': float(row['amount']),
                    'description': row.get('description', ''),
                    'category': row.get('category', ''),
                    'is_receivable': False
                }
                all_records.append(record)
        else:
            # 헤더가 없는 경우
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 4:
                    record = {
                        'record_date': row[0],
                        'type': row[1],
                        'amount': float(row[2]),
                        'description': row[3] if len(row) > 3 else '',
                        'category': row[4] if len(row) > 4 else '',
                        'is_receivable': False
                    }
                    all_records.append(record)

print(f"\n총 {len(all_records)}건의 데이터를 삽입합니다...")

# 배치로 나누어 삽입 (한 번에 100건씩)
batch_size = 100
for i in range(0, len(all_records), batch_size):
    batch = all_records[i:i+batch_size]
    try:
        result = supabase.table('financial_records').insert(batch).execute()
        print(f"{i+len(batch)}건 삽입 완료")
    except Exception as e:
        print(f"오류 발생: {e}")
        print(f"문제 데이터: {batch[0] if batch else 'None'}")
        break

print("\n데이터 마이그레이션 완료!")

