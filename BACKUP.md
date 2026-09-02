# WeddingRank 백업 운영 안내

## 현재 상태

- 자동백업 워크플로 설치 완료
- 실행 위치: 비공개 `shylth65/golfcourseranking` 저장소
- 워크플로: `.github/workflows/weddingrank-database-backup.yml`
- 실행 시각: 매일 03:17 (한국시간)
- 보관 기간: 90일
- 암호화: AES-256-CBC
- 현재 Storage bucket/object: 0개

GitHub Actions secrets 2개를 최초 1회 등록한 뒤 수동 시험 실행에 성공하면 자동백업이 완전히 활성화됩니다.

## 필요한 GitHub Actions secrets

비공개 `shylth65/golfcourseranking` 저장소의 Settings → Secrets and variables → Actions에 등록합니다.

1. `WEDDINGRANK_DB_URL`
   - Supabase direct database connection string
2. `WEDDINGRANK_BACKUP_PASSWORD`
   - DB 비밀번호와 다른 충분히 긴 백업 암호
   - 복구에 필요하므로 별도 안전한 장소에도 보관

## 백업 범위

PostgreSQL DB의 데이터와 스키마를 custom-format dump로 만들고 AES-256-CBC로 암호화합니다. Storage 객체 파일 자체는 포함되지 않으므로 실제 파일 업로드 기능을 사용하기 시작할 때 Storage 전용 백업을 추가합니다.

## 복구 원칙

운영 DB에 곧바로 덮어쓰지 않고 별도의 테스트 Supabase 프로젝트에서 먼저 복호화·복구 검증 후 적용합니다.
