# WeddingRank 보류 194곳 대량 검증 결과

공식 자료 확인일: 2026-10-27. 운영 DB 반영일: 2026-10-28(KST). 배치: `2026-10-27-held-bulk-v7`.

194곳 전체를 출처 유형별로 분류하고 공식 본문·PDF·예약·지자체 시설 안내를 대조했다. 107곳의 공식 실용정보 676개 항목을 새로 검증했다. 보류 87곳은 사유를 갱신했다. 기존 이력을 덮어쓰지 않고 검증 이력 194건을 추가했고, 재조회한 UUID·상태·필드·출처·사유가 준비 자료와 194건 모두 일치했다.

| 구분 | 작업 전 | 작업 후 | 증감 |
|---|---:|---:|---:|
| 전체 등록 시설 |966|966|0|
| 공개 플래그 |245|245|0|
| 운영 중인 공개 시설 |244|244|0|
| 공식 실용정보 검증 완료 운영 시설 |50|157|+107|
| 검증 보류 운영 시설 |194|87|-107|
| 공식 휴업 확인 |1|1|0|
| 공식 실용정보 검증 항목(운영 시설 최신 이력) |315|991|+676|

‘검증 완료’는 확인된 공식 항목이 있다는 뜻이며 모든 계약 조건·가격이 확인됐다는 뜻은 아니다. 미확인 항목은 비워 두었다.

## 실제 DB 반영

- 쓰기 대상: `public.wedding_venue_fact_checks` 한 테이블. 12곳 이하의 17개 배치로 삽입했다.
- 성공 194건 = 검증 완료 107건 + 보류 사유 갱신 87건. 실패 0건. UUID 및 현재 공개·운영·보류 상태를 조건으로 확인하고 중복 배치는 삽입하지 않는다.
- 새 공식정보 항목 676개. 그중 식대·대관료·꽃장식·보증인원 조건을 확인한 시설은 37곳이다. 기존 `wedding_prices` 값 변경은 0건이다.
- 운영 상태 정정 0건. 더 플라자 기존 휴업 상태는 유지된다.
- 원본은 기존 v1~v6 이력과 이번 분류 파일의 `before`에 보존했다. 예식장 원본 테이블 변경은 없다.

## 정보 표시 보완

- 상세 화면에 공식 확인 주소·홀 유형·조건 안내를 표시한다.
- 비교 화면은 최신 공식 홀 명칭·수용인원을 먼저 표시하고 기존 DB 홀 자료도 펼쳐서 확인할 수 있게 보존한다.
- 목록은 기본정보 확인일과 실용정보 항목 확인일을 구분한다.
- 조건별 가격을 계산기의 단일 숫자 기본값으로 넣지 않는다. 랭킹 계산식은 변경하지 않는다.
- 인증·후기·댓글·비교·비용 계산 및 새 공식정보 표시를 포함한 테스트 36개를 확인한다.

## 전수 분류 및 남은 보류

| 유형 | 전체 대상 | 남은 보류 |
|---|---:|---:|
|1. 시설 공식 홈페이지|41|0|
|2. 호텔·컨벤션 공식 웨딩|39|0|
|3. 지자체·공공기관 공식 자료|27|0|
|4. 공식 주소 추가 대조|7|7|
|5. 접근 제한·동적 본문|60|60|
|6. 공식 출처 미확보|14|14|
|7. 명칭·이전·운영 최신성 확인|5|5|
|8. 중복 가능성 추가 대조|1|1|

남은 보류 우선순위: 공식 자료가 있는 주소 대조 7곳, 명칭·운영 최신성 5곳과 중복 의심 1곳, 동적·접근 제한 60곳, 공식 출처 미확보 14곳. 접근 오류를 폐업으로 해석하지 않았다. 봇·방화벽 차단을 우회하지 않았다.

## 중복·주소·최신성 유의사항

- 동일 도로명·건물번호 후보는 13묶음이다. 10묶음은 비공개 후보가 함께 존재하나 비공개 데이터를 공개하거나 합치지 않았다.
- 공개 시설끼리 같은 주소인 서울식물원 두 공간과 웨스턴베니비스7층/웨딩시티8층은 별개 공간으로 대조했다. 규수당 문래/JK아트는 층이 다르며 규수당의 현재 운영은 보류했다.
- 디바인밸리 도로명 번호 623/624 차이는 보류. 로프트가든344의 10층/8층 차이, 하버파크의 행정구역 표기 차이 등은 원본을 고치지 않고 공식값과 차이를 이력에 기록했다.
- 연암컨벤션은 2022~2024년 자료만으로 현재 운영을 확정하지 않았다. 강동아트센터는 2027년 일정 미확정으로 보류했다.
- 예향재의 2026~2027년 예약 마감, 남산 한남의 추가 예약 제한, 공공예식장 90일 이내 접수 제한을 기록했다.

## 안전성

`bulk-v7-integrity.json`의 전후 해시가 일치한다. 예식장·가격·랭킹 데이터, RLS 정책, Supabase Cron이 유지됐다. 워크플로·Vercel 설정·Secrets·환경변수·고객 데이터에 쓰기를 하지 않았으며 예약작업을 생성하거나 수동 재실행하지 않았다.

## 신규 검증 완료 전체 명단 및 공식 URL

| 시설명 | UUID | 항목 수 | 공식 근거 |
|---|---|---:|---|
|A웨딩&파티|954700aa-4089-481c-aab4-62a1471ebde6|3|[공식 자료](https://www.a-wedding5567.com/)|
|CN웨딩홀 주안점|0b7bcade-baac-469d-9625-b3067f10c9b0|4|[공식 자료](https://www.juancnwedd.com/myboard/myboard2)|
|JK아트컨벤션|61e36702-03cb-42f8-ad46-f949e1ff6ef3|3|[공식 자료](https://www.jkart.co.kr/reservation/wedding/)|
|광진구청 대강당홀|f257ef4b-8f89-4e12-9abb-c6ed75ea28db|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3218)|
|그래비티조선 서울 판교웨딩|2eff8f6d-745c-41a6-99de-fda8a38143c6|3|[공식 자료](https://grp.josunhotel.com/meeting/wedding.do)|
|그랜드 인터컨티넨탈 서울 파르나스 웨딩|a598e86e-6e59-489a-b92f-2065b10d9c51|5|[공식 자료](https://seoul.intercontinental.com/ko/wedding/wedding)|
|그랜드블랑 웨딩홀|2783d724-d10e-4612-970b-f263e1e8e327|4|[공식 자료](https://www.grandapple.co.kr/wedding/main.html)|
|그랜드오스티엄|173a2fa7-0052-4483-b898-2a3312b65765|7|[공식 자료](https://www.grandostium.co.kr/official.php/home/info/4231)|
|그랜드컨벤션센터|3d8e3e59-da86-4199-919d-84799ed91225|4|[공식 자료](https://grandconvention.co.kr/wedding/grand/)|
|나비스퀘어|43626433-e5ae-4e71-aa5c-0e59f7b2e075|5|[공식 자료](https://www.nabisquare.com/)|
|나인트리 프리미어 로카우스 웨딩|4ecea3c0-0252-404d-bec6-96b97d744393|4|[공식 자료](https://www.rokaushotel.com/view/viewLink.do?page=homepage/KOR/facilities/Harmonis)|
|남산 장충 웨딩가든|bf5e28f3-653c-4887-b1b3-0546e0dd6ab5|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3190)|
|남산 한남 웨딩가든|f8e64d0f-8522-4df1-a2f8-9b806d89abea|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3191)|
|남산예술원웨딩홀|f106f902-7416-4230-92f4-5e37bd98fc3b|4|[공식 자료](https://namsanartweddinghall.com/)|
|노블발렌티 대치|4455819b-9eb4-412b-beb9-2a8c9f20fd34|4|[공식 자료](https://noblevalentidaechi.co.kr/Reservation)|
|더 마리포사|1706631f-ad40-4cff-840c-614eab432222|6|[공식 자료](https://themariposa.co.kr/)|
|더 바실리움|11156887-bc5f-402e-940c-02a6ca05523c|4|[공식 자료](https://thebasilium.co.kr/)|
|더아트라움 웨딩홀|27e7d5d2-eb7b-4110-8c81-a858da826d14|5|[공식 자료](https://xn--oi2b94xv6ae01a.kr/)|
|더컨벤션 잠실|962515cb-0333-4e74-ae91-43f5c0630b8b|4|[공식 자료](https://jamsil.theconvention.co.kr/)|
|더프라미스 웨딩컨벤션|c71f9280-b03f-4438-b007-90700f821b8d|4|[공식 자료](https://wd.kangdongcnl.com/)|
|도봉구청 선인봉홀|ca49fafa-27c8-4b1d-af2d-5d093fd58136|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3220)|
|라마다 송도 호텔|45c2de01-c893-4114-b41b-36c068c3cb5d|3|[공식 자료](https://www.ramada-songdo.co.kr/)|
|라한호텔 전주 예식장|733fe067-2524-452b-ba6e-431eca1dda63|6|[공식 자료](https://www.lahanhotels.com/jeonju/ko/wedding.do)|
|로얄호텔서울 웨딩|6575a292-7e5a-48eb-b30e-5f2f286a8aec|7|[공식 자료](https://www.royal.co.kr/bbs/page.php?hid=m05_01)|
|로프트가든344|14475f55-0536-46a6-b63a-ce9c069bc72d|3|[공식 자료](https://www.loftgarden344.com/reservation)|
|르엘컨벤션 (롯데호텔 울산)|31278a47-7af4-4809-a790-c70043099c99|4|[공식 자료](https://www.le-elconvention.com/)|
|마곡광장(썬큰마당)|6c93a7b3-b662-477a-98ec-49da675d550b|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/758)|
|매헌시민의숲|4c773aff-0ebd-4a71-b040-4bf087969c02|8|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/637)|
|머큐어 앰배서더 울산|8182c8a6-3219-40fd-94cc-3adbac0ab2e1|5|[공식 자료](https://www.ambatel.com/mercure/ulsan/ko/weddingList.do)|
|메리포엠웨딩홀|fd595e88-dc86-49e7-97db-b8566b191ed4|4|[공식 자료](https://marryfoem.com/)|
|메이필드호텔 서울 웨딩|5590428e-c95e-497c-b371-b619ad71bf46|4|[공식 자료](https://mayfield.co.kr/wedding/grand.html)|
|메종글래드제주 웨딩홀|a5ad1146-787c-4ed2-b98f-929dc0ace321|5|[공식 자료](https://www.glad-hotels.com/maisongladjeju/wedding/gladWedding.do)|
|모나밸리 웨딩|5c47acd9-b1c3-43d4-8f90-072495a85150|6|[공식 자료](https://monavalley.co.kr/sub.php?Page=sub2-1)|
|모나용평 웨딩|040fb08d-d078-4d7b-af6b-3261ef76d657|8|[공식 자료](https://www.yongpyong.co.kr/kor/organizationEvent/wedding.do)|
|몬드리안 서울 이태원 웨딩|419f2235-04c8-443b-b02e-17ee1e0246a8|11|[공식 자료](https://mondrianhotels.com/wp-content/uploads/sites/34/2026/07/260702_Wedding-Introduction.pdf)|
|반얀트리 클럽 앤 스파 서울 웨딩|872aa27e-a16e-4914-b048-f4e61ab27ac4|6|[공식 자료](https://www.banyantreeclub.com/web/kr/celebration/wedding.asp)|
|백인제가옥|baf6cb3a-3362-4b45-a05e-cb58e8d2bdce|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3208)|
|베어트리파크 웨딩|e0c2f205-83ae-4f21-8b35-620f6f8884c1|7|[공식 자료](https://beartreepark.com/wedding)|
|보라매시민안전체험관(다목적홀)|8fcc0fbc-22ba-49a1-9393-869aff665334|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/474)|
|보람컨벤션|d7f71655-468b-4f3f-9ac8-d01271fedc73|4|[공식 자료](https://www.boramwed.com/index.php?sub=sub07_m01_c01)|
|북서울 꿈의숲(창녕위궁재사)|bfb75d22-8945-4755-8c7c-7e5114e052bb|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/125)|
|비렌티웨딩홀|aaa119d4-5862-412f-8f46-281bbec904d9|6|[공식 자료](https://virenti.co.kr/default/index.php)|
|빌라드알티오라|2ade73ad-f084-4eea-82ea-1129a7a29735|3|[공식 자료](https://villadea.co.kr/base/sub2/02/04.php)|
|삼원가든|396ec8da-7611-4421-941c-627accc39d2f|7|[공식 자료](https://sgdinehill.co.kr/samwon-garden/wedding/)|
|서울대학교 교수회관 웨딩|ae832852-9731-4d81-b8e8-a2912941edfa|7|[공식 자료](https://www.snufacultyclub.com/sub04/sub01)|
|서울새활용플라자|d23ed113-6698-42af-a79e-b63ec9bd3fd3|8|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/593)|
|서울숲 설렘정원|9af7148d-cc76-4757-a926-ad292dd7ca35|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3199)|
|서울숲 포플러정원|51b3b219-f74a-43db-ae23-1ab243cbd356|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/6411)|
|서울시립대 자작마루|530d3276-7111-4ca9-9fb0-8aacc9f1296d|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/486)|
|서울식물원 사색의 정원|9f2ae713-326f-41db-944f-6480454320d2|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3209)|
|서울신라호텔 웨딩|53b21fbb-0463-4a93-8056-750bea92ae1c|6|[공식 자료](https://www.shillahotels.com/ko/theshilla/seoul/meetingEvent/wedding/dynastyHall.do)|
|서울여성플라자 피움서울|2d10c28a-8701-4f52-836d-66770b04121d|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/520)|
|서울주택도시개발공사(대강당홀)|8843c1af-973a-4f98-8a0b-a34bb8b95bab|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3217)|
|서울한방진흥센터(야외마당)|ddea4ad0-0a8c-4a45-a962-9055b9630c27|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/436)|
|선운각|b6cc12fa-aa74-47b3-9d22-89209d546779|3|[공식 자료](https://www.sunwoongak-kwedding.com/)|
|선유도공원(원형무대)|cd21cfaa-0e49-4102-9de7-1fa70d8740bd|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/395)|
|성북 예향재|dcc8a0d3-a4cc-4147-b496-91a29499d347|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/540)|
|세인트메리스|1f0f630d-3bfa-4d42-a1a9-648ce08d99c9|5|[공식 자료](https://www.saintmaries.co.kr/)|
|세인트존스호텔 웨딩|2767a1ae-4c3f-40e1-9f18-774e73cede90|4|[공식 자료](https://new.stjohns.co.kr/post/1281)|
|소노캄 거제|6010f9a6-0bc2-4f00-8038-610e0a2ce866|10|[공식 자료](https://mice.sonohotelsresorts.com/daemyung.front.saupjang.geoje.facility_wedding.ds/dmparse.dm?menuNo=02)|
|소피텔 앰배서더 서울 웨딩|bb652e41-6b0f-44c1-9cc1-0a4a5845bd1d|7|[공식 자료](https://www.sofitel-seoul.com/events/weddings/)|
|쉐라톤 그랜드 인천|6be4f1dc-168a-4cb3-986a-6efada06a68f|4|[공식 자료](https://www.marriott.com/ko/hotels/selgi-sheraton-grand-incheon-hotel/events/)|
|씨엘드레브|ae1b1bd7-9404-44e2-aed9-cd094149ab81|4|[공식 자료](https://www.cieldereve.com/wedding)|
|아만티호텔서울 웨딩|b82b97cd-18e6-4ce1-b7c7-262776b814ad|4|[공식 자료](https://www.hotelamanti.com/view/viewLink.do?page=homepage/KOR/banquetWedding/wedding)|
|아모르아트웨딩컨벤션|ac3489c7-1697-4d52-89cb-f77b557f1047|4|[공식 자료](http://www.amourart.co.kr)|
|아모르웨딩컨벤션 순천|52c099cd-86cc-467c-b165-0fc3873e2153|4|[공식 자료](https://loveamor.co.kr/34)|
|아모리스 역삼GS타워점|51ddb9d2-3ec8-46d8-9766-0ad58fb008a9|6|[공식 자료](https://www.amoris.co.kr/wedding/space)|
|아펠가모 공덕|de0d8f53-365f-4808-956b-f1c81d0a2d4e|9|[공식 자료](https://www.apelgamo.com/home/wedding5)|
|아펠가모 반포|002b545f-1bbb-4e92-97ea-6bbb5a8feb6b|9|[공식 자료](https://www.apelgamo.com/home/wedding2)|
|아펠가모 잠실|465105d5-ac92-4b56-b754-5a8f58bd6d5c|9|[공식 자료](https://www.apelgamo.com/home/wedding1)|
|안다즈 서울 강남 웨딩|8621c8be-ac32-424d-ba55-8e2d746ad5ba|6|[공식 자료](https://www.hyatt.com/andaz/ko-KR/selaz-andaz-seoul-gangnam/weddings)|
|안산엠블던호텔|535488ad-4269-4ee8-b6c6-dc4dd8757140|4|[공식 자료](https://mvldonhotel.com/reservation/wedding/)|
|앰배서더 서울 풀만 웨딩|a825e4b3-b2fd-4acc-8f4a-c2d4299ad164|5|[공식 자료](https://www.ambatel.com/theambassador/seoul/kr/weddingList.do)|
|어린이대공원 포시즌가든|1f320c63-962d-4ac2-9fbf-b2fcc415c7c8|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3200)|
|어반폴|f9a17b72-5d44-4f5c-95ab-f6108b0ebc78|4|[공식 자료](https://urbanfall.kr/wedding)|
|어울림플라자 공연장|9664ccbc-61db-4de6-8730-895bb6d358e4|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3214)|
|에뿌제웨딩홀|80441c33-9223-4c48-818c-54c23b64bedc|4|[공식 자료](https://epouser2.cafe24.com/)|
|에이본 컨벤션|7b234b34-7133-4a31-a71c-9c851d1a54cd|4|[공식 자료](https://www.avonhotel.co.kr/meetings-banquet)|
|여의도 한강공원 물빛무대|4356eb44-8d3a-423a-bbba-457ff2e0f1a0|10|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/527)|
|영중종합사회복지관 5층 체육관|c4247bb6-4644-4cf2-9538-18bc4f11548b|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3215)|
|용산가족공원(연못광장)|2c5cad44-dc7b-4b4c-8e2c-74c431163596|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/4187)|
|웨스턴라이프호텔 웨딩&컨벤션|a65374af-e266-4e71-a4fa-750e602b1932|6|[공식 자료](https://hotel.westernlifehotel.com/view/viewLink.do?page=homepage/KOR/wedding/grand)|
|웨스턴베니비스 신도림|69dc2565-135a-466b-9a60-510b765561ef|4|[공식 자료](https://sindorim.thebennevis.co.kr/)|
|은평역사한옥박물관(은평마당)|4fded12a-b475-4dd5-9b01-e7e1e69dfbce|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/1519)|
|조선 팰리스 서울 강남|e0956e87-f0e0-44fc-8f9a-2c04b7fcd4e9|3|[공식 자료](https://jpg.josunhotel.com/meeting/wedding.do)|
|창원그랜드머큐어호텔 웨딩|65be2004-b693-4013-91fb-81ebc4893480|7|[공식 자료](https://www.ambatel.com/grandmercure/changwon/en/weddingView.do?wedding_contents_seq=64)|
|청년예술청 SAPY|51d0e9da-cc69-4bb6-b955-b538765b560b|9|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3211)|
|청풍리조트 웨딩|764bb604-822b-4958-bb36-df1ab956bc36|11|[공식 자료](https://www.cheongpungresort.co.kr/web/kor/asp/banquet/wedding_guide.asp)|
|코리아나호텔 웨딩|ea026116-dd93-4dd9-8eff-8a4f46a1c19d|5|[공식 자료](https://koreanahotel.com/en/banquet/wedding.htm)|
|코모도호텔 경주 웨딩|7393fcb1-eac3-4749-b347-b1940cba273a|8|[공식 자료](https://www.commodorehotel.co.kr/html/04_banquet/02.php)|
|코모도호텔 부산 그랜드볼룸|9ca4a22f-67ff-47d7-8a0d-c363e87f22e7|9|[공식 자료](https://www.commodore.co.kr/html/04_banquet/02.php)|
|코트야드 메리어트 서울 명동 웨딩|41c6c3e8-0713-4396-964b-1a0ad984b4a0|6|[공식 자료](https://www.marriott.com/ko/hotels/selsn-courtyard-seoul-myeongdong/weddings/)|
|콘래드 서울|43367442-8eee-4738-a4c0-4708c5680967|5|[공식 자료](https://conradseoul.co.kr/hub/ko/gather/wedding.do)|
|테크노마트 웨딩시티|a6b9cc3e-8d7b-488b-9471-7ff4a006f7b9|4|[공식 자료](https://www.tmwedding.co.kr/)|
|파티움하우스 순천|a31bef79-67c4-4873-ba6d-4da0d6c4b2f4|5|[공식 자료](https://www.xn--o01bo9v3rdues4zz8jufm6w.com/)|
|팜파스13|8132a569-767d-4769-8078-74a9e0af0b84|3|[공식 자료](https://pampas13.com/contact/)|
|페어몬트 앰배서더 서울|5ee05a50-f544-4f02-8efb-e9777dcb16c9|6|[공식 자료](https://www.fairmont.com/en/hotels/seoul/fairmont-ambassador-seoul/weddings.html)|
|포시즌스호텔 서울 웨딩|c515fc40-67d5-4d09-96b7-3760a25a4091|5|[공식 자료](https://www.fourseasons.com/kr/seoul/weddings/)|
|푸른수목원 잔디마당|92723b50-9409-4549-8fa3-925735e63cca|10|[공식 자료](https://wedding.seoulwomen.or.kr/facilities/3202)|
|하버파크호텔|80cd0609-585b-4f0f-89f5-5d18075436a9|4|[공식 자료](https://www.harborparkhotel.com/view/viewLink.do?page=homepage%2FKOR%2Fbanquet%2Fwedding)|
|호텔 인터불고 대구|5628dfab-f784-40d9-8159-4e362f66cd38|7|[공식 자료](https://www.hotel-interburgo-daegu.com/contents/04_review/sub01.html)|
|호텔JCS여수 웨딩홀|3ecdd3d9-ec5d-4024-b552-da436e02f548|4|[공식 자료](https://hoteljcs.com/content/banquet?id=15)|
|호텔인터내셔널 창원 웨딩|6320ab66-d8f2-41d4-b76e-3ff12cb5a701|6|[공식 자료](https://www.hotelinternational.co.kr/bbs/content.php?co_id=03_05)|
|호텔인터시티 웨딩|d606487e-0698-4c83-aca2-919805373cb7|6|[공식 자료](https://www.hotelinterciti.com/sub0501)|
|호텔현대 바이 라한 울산 웨딩홀|76ed2597-546b-414e-b459-528178e665f3|9|[공식 자료](https://www.lahanhotels.com/ulsan/ko/wedding/promotions.do)|
|휘닉스평창 웨딩|8d693a7c-611d-42c7-b9b8-e06e82f0f9bf|10|[공식 자료](https://phoenixhnr.co.kr/static/pyeongchang/party/wedding)|
|히든베이호텔 웨딩|f4ebf3c1-6fb8-4a61-9b0f-26d76ee6ee83|6|[공식 자료](https://www.hiddenbay.co.kr/newpage.php?action=page&page=wedding01)|

각 항목 값·조건·출처·확인일·DB 성공 여부는 `official-fact-checks-followup-v7.json`, 전194곳의 이전 상태·분류·추가 출처·보류 사유는 `held-194-classification-v7.json`에 있다.

## 남은 보류 전체 명단

| 시설명 | UUID | 보류 사유 |
|---|---|---|
|AW컨벤션|d4f50d7a-fd37-4634-8eed-7f1547162a12|공식 후보 URL 재조회: HTTP 503, 본문 98자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함.|
|DMC타워웨딩|47239fce-ad32-416b-9609-c6955840d28c|공식 예약 URL 및 주소가 검색되나 공식 본문 HTTP503/웹 열기 시간초과. 공식 PDF 약도는 있으나 현재 예식 예약 본문 대조 미완료|
|HW컨벤션센터|db4e012e-c5b3-4474-87e9-99225dfcd3ea|직접 공식 URL 재조회 HTTP 000, curl 28. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|H스퀘어웨딩홀|ab18f9c9-7b7c-42f7-bb38-40cdc8fb4108|공식 후보 URL 재조회: HTTP 000, 본문 0자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함. 공식 About 상세와2026상반기공지 검색색인은 있으나 본문타임아웃이며 현재·향후예약 및주소 직접대조 미완료.|
|JK컨벤션웨딩|d71f5679-0a44-429d-8467-893aba0bb961|공식 JK컨벤션 웨딩·홀·상담 안내는 확보했으나 본문에 충장로10-40 도로명주소가 없어 공식 주소 근거 추가 필요.|
|JNJ아트컨벤션|a2199c90-46d7-4980-95b8-01d4b13c6b47|공식 URL HTTP503. 현재 채용·제3자 시설소개는 있으나 공식 예식 운영 본문 미확보|
|KU컨벤션웨딩홀|5532dadf-eef7-49b1-a486-78e7f211b6ed|직접 공식 URL 재조회 HTTP 503, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|KW컨벤션|e40d3ed5-2cfe-4633-a4d0-9739d353d396|공식 후보 URL 재조회: HTTP 503, 본문 98자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함.|
|SP웨딩 소풍컨벤션|60645c07-baa6-4e5f-bfac-3589241cbeaf|공식 홈페이지·위치 페이지가 검색에 확인되나 직접 본문 요청이 연결 시간초과. 검색 요약만으로 검증 완료 처리하지 않음|
|SY컨벤션웨딩홀|43a37b29-23f6-42cb-8cd5-ad1905e4e77d|공식 예약·메인 페이지 HTTP 연결 시간초과. 공식 검색 인덱스에서 플레르홀·봉영로1612·영통역 안내는 찾았으나 직접 원문 및 브라우저에서도 연결 시간초과하여 검증 보류.|
|W웨딩 더S웨딩홀|b68558c6-bf56-4dc2-b03e-ecce99825b3d|DB가 자체 weddingrank.kr 링크. 검색에서 업체·리뷰 소개만 확보, 운영사 공식 웨딩·주소 원문 미확보|
|aT포레웨딩홀|1a991ee9-32ee-4860-8999-0af95076c538|직접 공식 URL 재조회 HTTP 503, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|강동아트센터 잔디마당|de253e61-c871-4c7f-9793-b23d6196f01b|개별 공식 시설 안내와 동남로870 주소 확인. 그러나 2026년 지정 예식일은 모두 지난 날짜이며 2027년 예식일은 2026년11월 이후 공연일정 확정 후 통보로 표시. 현재·향후 실제 접수 가능일 확정 전이라 완료 전환 보류.|
|경민컨벤션웨딩홀|890946fd-a262-439a-b1a7-5cef93a04ab9|공식 후보 URL 재조회: HTTP 503, 본문 98자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함.|
|광명무역센터컨벤션|f812eda9-ba5e-45fd-b682-881bba0f9d8a|공식 예식 예약·그랜드볼룸·위치 페이지의 직접 본문 접근 시간초과. 검색 노출만으로 완료 처리하지 않음|
|국제웨딩컨벤션 평택|5b8b86bb-79e4-4905-a5a8-24a6b9e761db|공식으로 추정되는 SNS 검색결과는 있으나 운영주체·현재 예약·주소를 공식 원문에서 함께 대조하지 못함|
|규수당 문래점|3ddd003d-57a5-47fa-96c7-2dbf1a877166|공식 사이트 재조회 HTTP503/연결시간초과로 현재 예식 운영 본문 미확보. 동일 문래로164 건물에 JK아트컨벤션 공식4층 운영 확인, 규수당 DB는2층이므로 중복 단정은 하지 않되 층별 독립 영업 여부 추가 대조 필요.|
|그랜드하우스|02848ed5-db24-4ae3-93ea-9004d34a09e4|추가검색으로 운영사 후보공식 grandhouse.kr 및 주안로103-18 주소·웨딩서비스 검색본문 확보. 직접본문은타임아웃으로 현재예약·주소·소유확정 대조 미완료.|
|금천구 녹색광장 잔디마당|de04eb19-9e9a-493b-beba-bdfa7bbf4f78|서울시 공식 예식 운영·2027년 가능기간과 DB 지번 시흥동411-26 일치. 도로명주소 추가 대조 필요|
|김해더파티웨딩홀|85971506-5e6e-4faf-be10-26d35d4db25d|김해대로2342 더파티 웨딩 제3자 소개는 확인했으나 운영사가 직접 제공한 현재 웨딩·주소 안내를 확보하지 못함.|
|까사그랑데 센트로|dd3ad305-7aa0-4aff-8cd4-aff7b54bc921|공식 casagrande.co.kr 발견했으나 HTTP503 및 공식 about 페이지 시간초과. 검색요약만으로 완료하지 않음|
|다비다웨딩홀|af771fc1-9c1f-4578-a1ed-ab41de1a7a66|공식 후보 URL 재조회: HTTP 503, 본문 98자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함.|
|다인오세아노호텔 웨딩|ccd0cbb1-f050-4fd6-90a5-eed646ba5b88|공식 호텔 홈페이지에서 제목만 확보. 호텔과 리조트 주소·예식 운영 주체 구분 및 웨딩 상세 본문 확인 필요|
|대구AW호텔|3222b710-625a-4247-a9ce-eb5187506093|공식 AW호텔 홈페이지 HTTP503 원격 연결 실패. 대구지점 현재 웨딩·주소 대조 불가.|
|더채플앳 청담|ace60186-96bc-4ec4-b8bb-94df05a362e2|공식 사이트 제목만 확보되어 청담 지점 주소와 현재 예식 상세 안내 대조 불가|
|더채플앳대치|ab116128-1b12-469e-b2c9-ec9f50472bfa|공식 더채플 사이트 동적 본문 부족. 대치 지점의 시설명·영동대로318 주소·현재 예식운영을 함께 확인할 본문 필요.|
|디바인밸리 웨딩|26107bdd-491a-434c-a201-1c40542191e9|공식 모나밸리 웨딩 페이지 주소 순천향로624, DB 순천향로623. 예식 안내는 확인하였으나 주소 불일치 해소 전 보류|
|디에스컨벤션|c5f6561e-96c7-4d70-97c1-a4b38ee6cda3|DB 근거 URL은 잡코리아 채용 페이지로 시설 자체 공식 웨딩 안내가 아님. 수성로92 주소·현재 예식 운영 원문 미확보.|
|디엘 웨딩홀|ebbd2b00-f04c-4389-b998-fed15a74234d|DB가 자체사이트 링크. 제3자 웨딩홀·관광소개 자료만 확보, 시설 운영사 공식 웨딩 원문 미확보|
|디오션호텔 웨딩|50a85808-a68e-4ab6-b82b-f5cd58379f53|디오션 공식 사이트 본문이 Web Firewall 보안정책 차단 안내로 대체됨. 예식·주소·현재 접수 운영을 직접 확인할 수 없어 보류. 보안 차단 우회 시도하지 않음.|
|라도무스아트센터|716c51e0-7fec-4318-8a86-4f23886d9623|공식 ladomus.co.kr 에 동서대로639 및 다수홀·예식서비스 검색본문 있으나 직접본문접근 실패. 최신운영·시설전체추가대조 미완료.|
|라마다프라자 수원호텔|afabd0e1-56bf-4696-8a0e-3922a413f23b|라마다프라자 수원 공식 grand 웨딩페이지 HTTP503 원격 연결 실패. 대체 공식 자료로 주소·운영 대조 필요.|
|라베아툼|f9b67a2c-7a58-46bb-8bee-f17aa0c494b5|기존 공식 URL HTTP503/시간초과. 같은 주소에 SG웨딩컨벤션(드뤼미에르노바,라베아툼) 신규 공식 사이트가 검색되어 명칭·홀 구분과 현재 운영주체 추가 대조 필요|
|라시따시어터|2f07fc6d-3a75-4926-9b1f-8fd2872e94e0|직접 공식 URL 재조회 HTTP 503, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|라온몽드 하우스웨딩|7dd6477c-09ab-4ca3-a94c-fbb84c378a7a|당일 이전 공식본문에는 주소·50~250명·1일2팀4시간 안내가 있으나 최신 재조회HTTP403. 2026년5월할인문구는 종료시점지난자료로 현재혜택증거에서제외. 최신운영근거 보류.|
|라카이샌드파인 웨딩|71e4b0fe-ba83-4096-8c64-f1993457e763|공식 홈페이지 일반 소개만 확보, 웨딩 상세·공식 상담 및 주소 추가 확인 필요|
|라한셀렉트 경주 웨딩|5ce72def-171a-4469-89a5-00b8a92f1130|라한셀렉트 경주 공식 웨딩 URL에서 HTTP403. 자동화 차단 여부는 단정하지 않으며 공식 예식·주소 본문 미확보.|
|로터스101|020526e6-9a0a-4f8f-8b25-facc80254334|DB가 자체 WeddingRank 주소 또는 공식URL 누락 상태. 추가검색에서 시설 운영사 소유를 확정할 공식 예식·주소 자료 미확보. 제3자 소개자료는 승인근거에서 제외.|
|롤링힐스호텔 웨딩|443d99a5-9788-4e8b-93df-bfe421eade0a|공식 웨딩 제목·시청로290 주소는 확보했으나 실제 상세 본문이 비어 있음. 브라우저에서도 웨딩 및 공식 홈이 헤더·푸터만 표시되어 현재 예식 운영 상세를 대조하지 못함.|
|롯데리조트속초 웨딩|663302b8-49f3-46fa-959a-3c6e17550565|공식 사이트가 Pardon Our Interruption 봇차단 안내. 현재 웨딩 상품·주소 본문 미확보, 우회 시도하지 않음|
|롯데월드타워 시그니엘서울 웨딩|546007b7-2c28-4608-b148-73661a09c426|롯데호텔 공식 페이지가 봇 감지 Pardon Our Interruption 안내로 대체되어 웨딩 본문·주소 대조 불가. 우회 없이 보류.|
|롯데호텔서울 웨딩|9406e3d7-2a19-4b3b-9937-fc750fc4585c|DB가 자체 WeddingRank 주소 또는 공식URL 누락 상태. 추가검색에서 시설 운영사 소유를 확정할 공식 예식·주소 자료 미확보. 제3자 소개자료는 승인근거에서 제외.|
|마리드메이|dfcfa3a0-6587-48d8-ab36-ed177f07675a|공식 wedding-hall 페이지가 제목만 있는 동적 본문. 주소·예식 운영 세부 원문 추가 확보 필요|
|마이어스 웨딩&파티|5b6eef0b-b4ec-414b-b1b1-f9fb18a017e4|직접 공식 URL 재조회 HTTP 503, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|메리다웨딩컨벤션|392aa988-7514-434b-b0f0-55daf82b1725|메리다 공식 홈페이지 HTTP503 원격 연결 실패. 공식 웨딩·주소 본문 미확보.|
|메리빌리아 송도|fa96d429-296a-4cfb-adbe-fc4764d3c0d2|공식 도메인 본문 HTTP 오류. 송도 지점 이름·주소·현재 예식 운영 대조 미완료|
|목화웨딩컨벤션|67b485cb-53f5-4722-b038-0ebd208f7770|현재 연결은 부산진구 자유평화로11 W웨딩시티 박람회 본문. 직영 목화웨딩 이름은 있으나 DB 연제구 중앙대로1125 지점 주소·예식 안내가 없음. 운영사 전체 안내를 해당 지점 근거로 대체하지 않고 보류.|
|미래컨벤션웨딩홀|5e470f68-1ce2-4fdb-b710-ab931bf80d53|DB 공식 URL 없음. 동일 시설의 공식 예식 운영 및 주소 원문 확보 필요|
|벨라루체웨딩홀 서울점|f2e4650b-8271-4edf-bbf7-2adf4be4148b|공식 후보 URL 재조회: HTTP 503, 본문 91자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함. 공식검색색인에서망우로61과웨딩소개는확인되나 직접본문503/타임아웃으로 현재 상세검증 보류.|
|보코 서울 강남|60dcb781-5283-42d0-8508-1d67c01806ed|공식 호텔 URL 본문 접근 실패. 호텔 일반 영업과 웨딩 운영은 구분하여 공식 웨딩 근거 추가 확보 필요|
|부산시민공원(공공예식장)|98caa05a-9e52-4152-b381-e8e0fcebf5f6|직접 공식 URL 재조회 HTTP 503, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|불암산 힐링타운 철쭉동산|8a23852c-a2a1-4e76-bc34-d3afca176a66|서울시 공식 예식 운영·2027년 가능기간 및 DB 지번 중계동산42-3 일치. 도로명주소 추가 확인 필요|
|빌라드마리|6b60cf23-ad25-4765-81fd-6d247979670d|DB 공식 홈페이지 없음. 기존 확보 본문은 리혜 웨딩업체의 파트너 상품페이지로 시설 자체 공식 운영자료가 아니므로 검증 제외|
|빌라드지디 안산|f4432b1d-4ffb-442f-aa30-d16ee465c2f5|DB가 자체 WeddingRank 주소 또는 공식URL 누락 상태. 추가검색에서 시설 운영사 소유를 확정할 공식 예식·주소 자료 미확보. 제3자 소개자료는 승인근거에서 제외.|
|상록아트홀|421c6da5-36cc-4449-ad2f-d8be5a2be72a|상록아트홀 공식 홈페이지 HTTP503 원격 연결 실패. 현재 예식 운영·주소 대조 원문 미확보.|
|서울도시건축전시관|ac04fa36-365a-44e0-8726-5a192fd4438f|서울도시건축전시관 기존 공식 개별 예식장 URL /facilities/401이 HTTP404. 시설 예식 운영 중단을 단정하지 않지만 현재 접수 가능 공식 자료 재확인 필요.|
|성균관컨벤션웨딩홀|946b9ac4-5158-4e96-a45d-e4a6b1ef7cd7|DB 자체사이트 연결 대신 공식 skkconvention.co.kr 발견했으나 본문 요청 시간초과. 현재 예식과 도로명주소 원문 추가 대조 필요|
|소노벨 경주 웨딩|7a5404db-fd27-4260-a713-52c7e5a8c530|공식 MICE URL이 소노 통합페이지로 연결되어 경주 웨딩 운영·보문로402-12 주소를 동일시설 상세로 대조하지 못함.|
|스카이컨벤션웨딩 춘천|48d1de8f-fd94-462a-98a2-32cfe4854132|직접 공식 URL 재조회 HTTP 503, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|스페이스566웨딩컨벤션|2805a3fe-736d-4a68-af0c-d3ba4f6024b6|공식 후보 URL 재조회: HTTP 503, 본문 98자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함.|
|신도림 라마다호텔 웨딩|8cc43c1d-099c-4757-90e0-1849f8134325|호텔 공식 웨딩 및 별도 웨딩예약 사이트 확인했으나 본문 502·시간초과. 검색요약만으로 완료 처리하지 않음|
|신라스테이 서부산 웨딩컨벤션|74d8189a-c632-48f7-a93b-97651b65efc8|신라스테이 서부산 기존 공식 URL이 404. 호텔 지점 홈페이지와 별도 웨딩 운영사·명지국제7로38 주소 대조 필요.|
|아이벡스컨벤션|24c6978c-dd17-42f3-8e30-d053958b8b9b|공식 ivexwed.co.kr이 Site Unavailable 안내, 현재 운영·예약 공식 근거 확보 실패|
|안동그랜드호텔 웨딩|e99dc720-a490-4d61-8d7b-0fbef396c6ef|공식 wedding_main.php 본문 HTTP 오류. 공식 주소·현재 웨딩 안내 추가 대조 필요|
|알펜시아리조트 웨딩|7ae6c140-f8ab-4a9d-99a4-5bed3a65c050|공식URL이 JavaScript 기반 제목만 반환함. 반포지점/리조트의 실제예식 운영과 DB도로명주소를 함께 확인할 본문 미확보.|
|엘마리노 앳 인천|d11d9068-354a-490c-97b9-dca2cedcaf7f|엘마리노 공식 홈페이지 응답 본문 미확보. 인천 행정구역·서해대로227 시설 및 현재 예식 운영 대조 필요.|
|엠스타하우스|0cc8668c-b02f-431f-8d45-5a924d32648c|DB 자체사이트 링크이며 검색에서 공식 아님을 명시한 웨딩 소개·후기만 확인. 운영사 공식 채널 미확보|
|여의도웨딩컨벤션|45492a24-f3d6-4126-9c8c-8586ad2ff365|공식 후보 URL 재조회: HTTP 503, 본문 91자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함.|
|연암컨벤션|ce8e779f-b458-4a87-a4f2-34c080aa1c0c|공식 시설명·산업로1020·예식 소개·날짜입력 상담폼은 확인했으나, 홈페이지 공지2022년·과거 이벤트2023년(2024년 예식 대상) 이후 현재/향후 운영을 입증할 최신 공식 근거 확보 못함. 단순 예약폼 존재만으로 현재 운영 확정하지 않아 보류|
|영도구청 대강당(공공예식장)|d8371333-50aa-4656-8d3a-39679a72bcf1|부산시 공식 공공예식장 안내에 보안강화에 따른 일시 중단 화면이 반환됨. 영도구청 태종로423 시설별 운영 일정·주소를 대조할 본문 미확보.|
|오크밸리 웨딩|b759fde1-570a-456e-9b82-6bc1a57fa896|HTTP200이지만 본문이 브랜드명뿐인 JavaScript 페이지. 지점 주소·예식 운영 세부를 렌더링 또는 공식 대체자료에서 확인해야 함.|
|오펠리스웨딩|db3cb91e-1e53-499b-a0c5-49ea696822d4|공식 후보 URL 재조회: HTTP 503, 본문 91자. 시설명·현재 예식운영·도로명주소를 모두 대조할 공식본문을 확보하지 못함.|
|월드컵컨벤션|eafe4c7a-bb4a-4c78-a104-8aca500ebd2d|월드컵컨벤션 공식 홈페이지 미등록. 제3자 웨딩·청첩장 소개만 확보되어 운영사 직접 공식자료 추가 필요.|
|웨스틴조선서울 웨딩|bfc5a709-6c2b-4d51-8132-5dae18373179|메리어트 공식행사본문은 확보되나 한국어 DB 도로명주소와 지점별웨딩 운영의 추가대조 미완료. 통합행사장 수용인원을 예식보증인원으로 사용하지 않음.|
|이바구복합문화체육센터(공공예식장)|bbaba30e-bf87-4ee0-877d-efccda8c6a62|부산시 공식 안내가 보안강화 일시중단 화면으로 반환됨. 이바구센터 초량중로113 시설별 운영기간·주소 대조 원문 미확보.|
|인천아시아드웨딩컨벤션|a68e23bd-34f6-43c5-a892-3cd668bfd3db|공식 location 본문 접근 실패. 지점 도로명주소·현재 예식 운영 추가 대조 필요|
|제이오스티엘|751aaeb2-b464-4a25-a1ed-8aa188feeb23|직접 공식 URL 재조회 HTTP 503, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|케이터틀|b4ff74c0-a956-4c65-83ae-5092354503ce|직접 공식 URL 재조회 HTTP 503, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|티웨딩 천안|d23fb317-5eae-4c1c-96ee-631151d81d99|DB가 WeddingRank 자체 사이트를 연결. 시설 자체 공식 운영자료·도로명주소 근거 추가 확보 필요|
|티웨딩 평택|52b0d5e3-8729-4226-86c5-1e3520803fbb|공식 티웨딩 평택 사이트 t-wedding.co.kr를 새로 찾았으나 HTTP 연결 시간초과. 평택 지점 도로명주소와 현재 예식 안내 직접 대조 필요.|
|파로스컨벤션|68cee415-6105-487c-ae5d-ae17719b3ba7|공식 location 본문 접근 실패. 다산 지점 주소·현재 예식 운영 추가 대조 필요|
|파티더풀문|50c6b246-3b12-454b-8a3c-9f6f9beca33d|공식 웨딩 상품 본문은 확보했으나 시설 도로명주소가 없음. 자체 홈 화면에 개발 중·예약상담 신청 회신 안 함 공지가 있어 운영 주체·실제 주소·상담 접수 확인 전 보류.|
|포항라한호텔 웨딩|317652f7-72c6-4464-8bda-27e2836918ee|직접 공식 URL 재조회 HTTP 403, curl 0. 웨딩 운영·주소 본문을 확보하지 못해 공식 대체자료 확인 필요. 검색 요약만으로 검증 완료 처리하지 않음.|
|해군호텔W웨딩홀|540fadc9-5c2f-4780-83b4-43eb53cfe5e8|해군호텔W웨딩홀 제3자 소개는 있으나 운영사 직접 웨딩·가마산로538 주소 안내를 확보하지 못함.|
|호텔더베이스 웨딩홀|9c38e160-fdc9-4a98-af3d-9ee64192209b|공식검색의 웨딩갤러리 및 호암대로8 주소는 확인되나 현행예식 상품·예약접수 본문은 직접확보 실패. 갤러리 존재만으로 운영 검증완료하지 않음.|
|호텔리베라 청담|67af4806-5d29-401d-87c2-c95f275baf50|공식 사이트가 웹 방화벽 보안 정책에 의한 접근 차단(403)을 명시. 해당 경로의 추가 우회 시도 없이 보류|
|호텔인터불고 원주 웨딩|ac48c777-f2b2-48f5-a390-80d82ec67fbc|공식 wedding 상세 본문 접근 실패. 도로명주소·현재 예식 접수 추가 대조 필요|

## 운영 배포 확인

DB 적용 및 원본 무결성은 확인 완료했다. GitHub 커밋·Vercel 배포·PC 및 모바일 운영 화면 확인 결과는 최종 작업 보고에 해당 SHA와 함께 별도로 제공한다. 완료 전인 배포 검증을 성공으로 선기록하지 않는다.
