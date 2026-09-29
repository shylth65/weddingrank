'use strict';
// Original, light adult humor. The date is calculated in Korea; the unique DB key makes retries safe.
const jokes=[
['결혼 전과 후의 약속','연애 때는 “평생 웃게 해줄게.” 결혼 후에는 “분리수거는 내가 할게.” 알고 보니 두 번째 약속이 훨씬 로맨틱했다.'],
['우리 사이의 거리','“우리 사이에 거리가 생긴 것 같아.” “그럼 소파 리모컨 좀 건네줄래?” 거리는 정확히 40센티미터였다.'],
['설렘의 신호','“아직도 나 보면 심장이 뛰어?” “응. 당신이 택배 상자 세 개 들고 들어올 때마다.”'],
['부부의 비밀 암호','우리 부부의 비밀 암호는 “오늘 일찍 와.” 뜻은 하나다. 저녁 먹고 설거지 같이 하자.'],
['신혼의 작전','신혼 때는 촛불을 켜고 저녁을 먹었다. 지금은 전기요금 아끼려고 불 끄고 간식을 먹는다. 분위기는 여전하다.'],
['최고의 고백','“당신 없인 못 살아.” “그럼 오늘 빨래는 당신이 널어.” 사랑의 진정성은 빨래 건조대 앞에서 검증된다.'],
['기념일 퀴즈','배우자가 물었다. “오늘 무슨 날인지 알아?” 나는 침착하게 답했다. “당신이 좋아하는 걸 먹는 날.” 매일 통하는 답이었다.'],
['저녁의 유혹','“오늘 밤 둘이서만 있을까?” “좋아!” 아이들 재운 뒤 둘이 나란히 앉아 냉장고 남은 케이크를 먹었다.'],
['현실적인 이상형','친구가 이상형을 물었다. “잘 웃고, 말을 잘 들어주고, 쓰레기를 제때 버리는 사람.” 결혼 10년 차의 기준은 구체적이다.'],
['밀당의 기술','“오늘은 내가 먼저 연락 안 할 거야.” 3분 뒤 문자: “냉장고에 남은 반찬 뭐야?” 밀당은 배고픔 앞에서 끝난다.'],
['행복한 아침','“나 오늘 예뻐?” “응, 특히 커피 내려줄 때.” 칭찬과 부탁을 동시에 하면 효과가 반감된다는 걸 배웠다.'],
['로맨틱한 예약','기념일에 근사한 곳을 예약했다. 배우자가 가장 좋아한 건 식당이 아니라 주차장이 넓다는 사실이었다.'],
['하트의 의미','메신저로 하트를 보냈다. 답장이 왔다. “마트 가는 길이면 우유도.” 결혼한 하트에는 심부름 기능이 있다.'],
['취향 존중','“내 취향 기억해?” “당연하지. 치킨은 순살, 영화는 자막, 에어컨은 24도.” 사랑은 디테일에 있다.'],
['진짜 휴가','“우리 둘이 조용한 곳으로 떠나자.” 도착한 곳은 동네 카페. 휴대폰을 내려놓으니 그걸로 충분했다.'],
['프로포즈 후속편','결혼할 때 “내가 다 해줄게”라고 했다. 십 년 뒤에는 “오늘 설거지는 내가”가 최고의 프로포즈가 됐다.'],
['눈빛만 봐도','“우린 이제 눈빛만 봐도 알아.” 저녁 식탁에서 서로를 바라보다 동시에 말했다. “배달 시킬까?”'],
['커플의 타이밍','영화관에서 손을 잡으려 했다. 같은 순간 둘 다 팝콘을 집었다. 우린 음식 앞에서 완벽하게 통한다.'],
['비밀 데이트','아이들에게 말하지 않고 둘만 데이트했다. 편의점 앞에서 아이스크림 두 개 먹고 귀가. 어른의 자유는 달콤하다.'],
['부부의 운동','“같이 운동하자.” “좋아.” 우리는 소파에서 일어나 냉장고까지 왕복했다. 일단 시작이 중요하다.'],
['사랑의 온도','“사랑은 뜨거워야 해?” “아니, 겨울엔 전기장판 2단이면 충분해.” 실용적인 답이 마음에 들었다.'],
['최고의 선물','생일 선물로 뭘 원하냐고 물었다. “내일 늦잠.” 포장도 필요 없는 선물이었다.'],
['작은 질투','“아까 누구랑 그렇게 오래 통화했어?” “고객센터. 환불 성공했어.” 그 순간 질투가 존경으로 바뀌었다.'],
['나만의 애칭','배우자가 나를 “여보”라고 부르면 평범한 날이다. “여보오?”라고 길게 부르면 내가 뭘 잊었는지 확인해야 한다.'],
['주말의 계획','“이번 주말엔 아무것도 안 하자.” 우리는 정말 아무것도 안 했다. 둘 다 가장 만족한 데이트였다.'],
['귀가 시간','“몇 시에 들어와?” “당신 보고 싶어질 때.” “그럼 오는 길에 두부 사 와.” 사랑은 늘 장보기와 함께 온다.'],
['결혼의 장점','“결혼의 가장 좋은 점이 뭐야?” “웃긴 얘기를 가장 먼저 들려줄 사람이 집에 있다는 것.” 대답이 마음에 들었다.'],
['기억력 시험','“내가 제일 좋아하는 꽃 기억해?” “꽃보다 당신.” 잠시 정적. “튜립이야. 그리고 화분에 물 좀 줘.”'],
['행복한 협상','“당신이 요리하면 내가 설거지할게.” “좋아. 오늘은 배달!” 협상은 빠르게 타결됐다.'],
['애정 표현','“말로만 사랑한다고 하지 마.” 그래서 말없이 귤을 까서 건넸다. 오늘의 애정 표현은 손끝에서 완성됐다.']
];
async function main(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Supabase URL/service role secret missing');const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const epoch=Math.floor(Date.UTC(2026,8,29)/86400000),day=Math.floor(Date.parse(date+'T00:00:00Z')/86400000)-epoch;const [title,body]=jokes[((day%jokes.length)+jokes.length)%jokes.length];const res=await fetch(url.replace(/\/$/,'')+'/rest/v1/wedding_board_posts?on_conflict=kind,post_date',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({title,body,author_name:'WeddingRank',kind:'daily',status:'published',post_date:date})});if(!res.ok)throw Error(`Board publish ${res.status}: ${(await res.text()).slice(0,250)}`);const rows=await res.json();console.log(`${date}: ${rows.length?'published':'already published'} (${title})`)}
main().catch(e=>{console.error(e.message);process.exitCode=1});
