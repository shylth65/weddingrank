# WeddingRank

대한민국 예식장 랭킹 서비스 초기 웹 버전.

## Supabase 연결
1. `config.js`를 엽니다.
2. `SUPABASE_ANON_KEY`에 WeddingRank Supabase의 **publishable/anon key**를 입력합니다.
3. `service_role` 또는 secret key는 절대 웹 코드에 넣지 않습니다.

현재 웹은 `wedding_halls` 중 `is_public=true` 및 `operation_status='운영'`인 데이터만 조회합니다.
