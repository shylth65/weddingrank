const targets=[
 {name:'상록아트홀',hallPage:'https://jinzzawedding.com/halls/80',needle:'상록아트홀 5층 아트홀'},
 {name:'벨라루체웨딩홀 서울점',hallPage:'https://jinzzawedding.com/halls/153',needle:'90분 간격이라 쫓기지 않았던'},
 {name:'그랜드 하얏트 서울 웨딩',hallPage:'https://jinzzawedding.com/halls/68',needle:'그랜드하얏트'},
 {name:'PJ호텔 웨딩',hallPage:'https://jinzzawedding.com/halls/118',needle:'PJ호텔'}
];
async function main(){
 const out=[];
 for(const t of targets){
  const r=await fetch(t.hallPage,{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
  const html=await r.text();
  const i=html.indexOf(t.needle);
  const reviewPatterns={};
  for(const re of [
    /reviewId.{0,80}/gi,/review_id.{0,80}/gi,/["']id["']\s*:\s*\d+/gi,/\/reviews\\?\/?\d+/gi,/reviews.{0,40}\d+/gi
  ]) reviewPatterns[String(re)]=[...html.matchAll(re)].slice(0,80).map(m=>m[0]);
  out.push({name:t.name,hallPage:t.hallPage,status:r.status,bytes:html.length,needleIndex:i,around:i>=0?html.slice(Math.max(0,i-2200),Math.min(html.length,i+5000)):null,reviewPatterns});
 }
 console.log('HELD_JINZZA_DISCOVERY_BEGIN');
 console.log(JSON.stringify(out,null,2));
 console.log('HELD_JINZZA_DISCOVERY_END');
}
main().catch(e=>{console.error(e);process.exit(1)});