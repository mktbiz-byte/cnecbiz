#!/usr/bin/env python3
import csv
import os
from supabase import create_client

# Supabase 설정
SUPABASE_URL = "https://vluqhvuhykncicgvkosd.supabase.co"
SUPABASE_KEY = os.getenv("VITE_SUPABASE_KOREA_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXFodnVoeWtuY2ljZ3Zrb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg2MzAsImV4cCI6MjA3Njg0NDYzMH0.ikEqdx6Le54YJUP-NROKg6EmeHJ4TbKkQ76pw29OQG8")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# CSV 파일 읽기
csv_file = "/home/ubuntu/upload/1.csv"

with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    records = []
    
    for row in reader:
        record = {
            'record_date': row['record_date'],
            'type': row['type'],
            'amount': float(row['amount']),
            'description': row.get('description', ''),
            'category': row.get('category', ''),
            'is_receivable': False
        }
        records.append(record)

# Supabase에 삽입
print(f"총 {len(records)}건의 데이터를 삽입합니다...")

# 배치로 나누어 삽입 (한 번에 100건씩)
batch_size = 100
for i in range(0, len(records), batch_size):
    batch = records[i:i+batch_size]
    result = supabase.table('financial_records').insert(batch).execute()
    print(f"{i+len(batch)}건 삽입 완료")

print("데이터 마이그레이션 완료!")

