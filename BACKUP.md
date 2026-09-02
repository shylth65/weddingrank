# WeddingRank 백업 운영 안내

## 자동 백업

- 실행 시각: 매일 03:17 (한국시간)
- 대상: WeddingRank PostgreSQL 데이터베이스 전체
- 보관 위치: GitHub Actions 암호화 Artifact
- 보관 기간: 90일
- 수동 실행: Actions → WeddingRank encrypted database backup → Run workflow
- 워크플로: `.github/workflows/database-backup.yml`

## 최초 1회 필요한 GitHub Actions secrets

Repository Settings → Secrets and variables → Actions에 다음 값을 등록합니다.

1. `WEDDINGRANK_DB_URL`
   - Supabase의 direct database connection string
   - 형식: `postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres`
2. `WEDDINGRANK_BACKUP_PASSWORD`
   - 백업 파일 암호화에 사용할 충분히 긴 별도 비밀번호
   - DB 비밀번호와 다르게 설정하고 안전한 곳에 별도 보관

공개 저장소이므로 백업은 AES-256-CBC로 암호화한 뒤 업로드합니다. 비밀값은 로그나 저장소 파일에 저장하지 않습니다.

## 복구 예시

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in weddingrank-YYYY-MM-DDTHH-MM-SSZ.dump.enc \
  -out weddingrank.dump \
  -pass env:WEDDINGRANK_BACKUP_PASSWORD

pg_restore --clean --if-exists --no-owner \
  --dbname="$TARGET_DATABASE_URL" weddingrank.dump
```

실제 운영 DB에 복구하기 전에는 반드시 별도 테스트 프로젝트에서 검증합니다.

## 범위

이 백업은 PostgreSQL DB(Auth·테이블·정책·함수·Storage 메타데이터 포함)를 대상으로 합니다. Storage 객체 파일 자체는 포함하지 않습니다. 현재 WeddingRank Storage bucket/object는 비어 있으므로, 파일 업로드 기능을 사용하기 시작할 때 Storage 전용 백업을 추가합니다.
