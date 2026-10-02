const targets=[
 {name:'상록아트홀',hallPage:'https://jinzzawedding.com/halls/80'},
 {name:'벨라루체웨딩홀 서울점',hallPage:'https://jinzzawedding.com/halls/153'},
 {name:'그랜드 하얏트 서울 웨딩',hallPage:'https://jinzzawedding.com/halls/68'},
 {name:'PJ호텔 웨딩',hallPage:'https://jinzzawedding.com/halls/118'}
];
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const around=(s,idx,n=500)=>clean(s.slice(Math.max(0,idx-n),Math.min(s.length,idx+n)));
async function main(){
 const out=[];
 for(const t of targets){
  const r=await fetch(t.hallPage,{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
  const html=await r.text();
  const ids=[...new Set([...html.matchAll(/href=["']\/reviews\/(\d+)["']/g)].map(m=>m[1]))];
  const reviews=[];
  for(const id of ids){
    const url='https://jinzzawedding.com/reviews/'+id;
    const rr=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept-language':'ko-KR,ko;q=0.9,en;q=0.8'}});
    const rh=await rr.text(), text=clean(rh);
    const title=(rh.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/\s+/g,' ').trim()||null;
    const rating=Number((rh.match(/"ratingValue"\s*:\s*([0-9.]+)/i)||[])[1]);
    const best=Number((rh.match(/"bestRating"\s*:\s*([0-9.]+)/i)||[])[1]);
    const period=(text.match(/(20\d{2}\.\d{2})\s+(?:상담·방문|상담·투어|투어·방문|투어|방문|하객 방문)/)||[])[1]||null;
    const verification=(text.match(/((?:견적서|예약내역|현장사진|명함·카톡|명함) 인증)(?:✅|❌|🤔)?/)||[])[1]||null;
    reviews.push({id,url,status:rr.status,title,rating:Number.isFinite(rating)?rating:null,best:Number.isFinite(best)?best:null,period,verification,preview:text.slice(0,700)});
  }
  out.push({...t,status:r.status,reviewCount:reviews.length,reviews});
 }
 console.log('HELD_JINZZA_DISCOVERY_BEGIN');
 console.log(JSON.stringify(out,null,2));
 console.log('HELD_JINZZA_DISCOVERY_END');
}
main().catch(e=>{console.error(e);process.exit(1)});