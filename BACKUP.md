# WeddingRank 백업 운영 계획

## 현재 상태

- Supabase 운영 DB는 정상이며 WeddingRank 데이터가 저장되어 있습니다.
- 별도 자동백업 워크플로는 아직 활성화되지 않았습니다.
- 현재 Storage bucket/object는 비어 있습니다.

## 권장 자동백업안

- 실행 시각: 매일 03:17 (한국시간)
- 대상: WeddingRank PostgreSQL 데이터베이스 전체
- 보관 기간: 90일
- 암호화: AES-256-CBC
- 비밀값은 GitHub Actions secrets에만 보관

WeddingRank GitHub 저장소가 공개 저장소이므로, DB 백업을 이 저장소의 Actions Artifact에 보내려면 소유자의 명시적인 승인이 필요합니다. 더 안전한 대안은 별도의 비공개 백업 저장소를 만든 뒤 그곳에서 백업을 실행하는 것입니다.

## 최초 1회 필요한 비밀값

1. `WEDDINGRANK_DB_URL`
   - Supabase direct database connection string
2. `WEDDINGRANK_BACKUP_PASSWORD`
   - DB 비밀번호와 다른 충분히 긴 백업 암호

## 범위

PostgreSQL DB 백업에는 데이터·스키마·Auth·정책·함수·Storage 메타데이터가 포함됩니다. Storage 객체 파일 자체는 포함되지 않으므로 실제 파일 업로드 기능을 사용하기 시작할 때 Storage 전용 백업을 별도로 추가합니다.
